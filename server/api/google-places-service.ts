/**
 * Google Places API service for the NexLead application
 * Uses the Google Places API to search for businesses
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { BusinessData, Contact } from '../models/business-data';

interface PlacesSearchResult {
  results: any[];
  status: string;
  next_page_token?: string;
}

interface PlaceDetailsResult {
  result: any;
  status: string;
}

export class GooglePlacesService {
  private apiKey: string;
  // Track API usage
  private apiCalls: {
    timestamp: Date;
    endpoint: string;
    status: string;
  }[] = [];
  // Google Places API has a default quota of 1000 requests per day
  private dailyQuota: number = 1000;
  
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('⚠️ GooglePlacesService: No API key provided');
    }
  }
  
  /**
   * Get the current Google API quota usage information
   */
  public getQuotaUsage() {
    // Get calls in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentCalls = this.apiCalls.filter(call => call.timestamp > oneDayAgo);
    const successfulCalls = recentCalls.filter(call => call.status === 'OK');
    
    return {
      total_calls_24h: recentCalls.length,
      successful_calls_24h: successfulCalls.length,
      quota_limit: this.dailyQuota,
      quota_used_percent: (recentCalls.length / this.dailyQuota) * 100,
      quota_remaining: this.dailyQuota - recentCalls.length,
      latest_calls: recentCalls.slice(-10).map(call => ({
        timestamp: call.timestamp.toISOString(),
        endpoint: call.endpoint,
        status: call.status
      })),
      status: recentCalls.length < this.dailyQuota ? 'OK' : 'QUOTA_EXCEEDED'
    };
  }
  
  /**
   * Check if the daily API quota has been exceeded or is near the limit
   * Returns true if quota is exceeded or if we're within 5% of the limit
   */
  private isQuotaExceeded(): boolean {
    const quotaInfo = this.getQuotaUsage();
    
    // Consider quota exceeded if we're within 5% of the limit to avoid potential overages
    const safetyThreshold = this.dailyQuota * 0.95;
    
    if (quotaInfo.total_calls_24h >= safetyThreshold) {
      console.warn(`⚠️ GooglePlacesService: API quota nearly exceeded: ${quotaInfo.total_calls_24h}/${this.dailyQuota} (${quotaInfo.quota_used_percent.toFixed(1)}%)`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Gracefully handle API quota errors
   */
  private handleQuotaError(error: any): void {
    console.error('⛔ GooglePlacesService: API quota exceeded or error', error);
    
    // Track this as a quota error
    this.trackApiCall('quota_error', 'QUOTA_EXCEEDED');
    
    console.error(`
      ====================================================
      ⛔ GOOGLE PLACES API QUOTA WARNING ⛔
      ----------------------------------------------------
      The Google Places API quota has been exceeded or is close to limit.
      Further API calls will be limited until quota resets.
      Current usage: ${this.getQuotaUsage().total_calls_24h}/${this.dailyQuota}
      Percentage used: ${this.getQuotaUsage().quota_used_percent.toFixed(1)}%
      ====================================================
    `);
  }
  
  /**
   * Track an API call for quota monitoring
   */
  private trackApiCall(endpoint: string, status: string) {
    this.apiCalls.push({
      timestamp: new Date(),
      endpoint,
      status
    });
    
    // Keep only the last 1000 calls in memory to avoid memory leaks
    if (this.apiCalls.length > 1000) {
      this.apiCalls = this.apiCalls.slice(-1000);
    }
  }
  
  /**
   * Search for businesses using Google Places API
   */
  async searchBusinesses(query: string, location?: string, maxResults: number = 100): Promise<{
    businesses: BusinessData[];
    sources: string[];
    meta?: {
      totalResultsFound: number;
      totalProcessedBusinesses: number;
      totalContactsGenerated: number;
      pagesRetrieved: number;
    };
    error?: {
      code: string;
      message: string;
    };
  }> {
    console.log(`🔍 GooglePlacesService: Searching for '${query}' in ${location || 'any location'}, max results: ${maxResults}`);
    
    if (!this.apiKey) {
      console.error('❌ GooglePlacesService: No API key available');
      return { businesses: [], sources: [] };
    }
    
    try {
      // Construct the query with location if provided
      let searchQuery = query;
      if (location) {
        searchQuery = `${query} in ${location}`;
      }
      
      // Call the Places API Text Search endpoint
      const textSearchUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
      let response = await axios.get(textSearchUrl, {
        params: {
          query: searchQuery,
          key: this.apiKey
        }
      });
      
      let data: PlacesSearchResult = response.data;
      // Track this API call
      this.trackApiCall('textsearch', data.status);
      let allResults: any[] = [];
      let pageCount = 0;
      // Google Places API can return multiple pages of results
      // We'll continue fetching until no more pages are available or we hit rate limits
      const MAX_PAGES = 100; // Set to a high number to effectively remove the artificial limit
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        const errorMessage = `❌ GooglePlacesService: API error: ${data.status}`;
        console.error(errorMessage);
        
        // Return detailed error information
        if (data.status === 'REQUEST_DENIED') {
          console.error('This usually happens when the API key doesn\'t have Places API enabled or has restrictions.');
          return { 
            businesses: [], 
            sources: [],
            error: {
              code: 'PLACES_API_REQUEST_DENIED',
              message: 'Google Places API request was denied. Please check API key permissions.'
            }
          };
        } else if (data.status === 'OVER_QUERY_LIMIT') {
          return { 
            businesses: [], 
            sources: [],
            error: {
              code: 'PLACES_API_QUERY_LIMIT',
              message: 'Google Places API query limit exceeded. Please try again later.'
            }
          };
        } else {
          return { 
            businesses: [], 
            sources: [],
            error: {
              code: 'PLACES_API_ERROR',
              message: `Google Places API error: ${data.status}`
            }
          };
        }
      }
      
      // Collect all results from first page
      if (data.results && data.results.length > 0) {
        allResults = [...allResults, ...data.results];
        pageCount++;
        console.log(`✅ GooglePlacesService: Found ${data.results.length} places on page ${pageCount}`);
      }
      
      // Continue fetching pages as long as there's a next_page_token available
      // The Google Places API will automatically stop providing tokens when no more results are available
      // We implement recursive pagination until no more pages exist
      while (data.next_page_token && pageCount < MAX_PAGES) {
        // Check API quota before making the next request
        if (this.isQuotaExceeded()) {
          console.log(`⚠️ GooglePlacesService: Daily quota reached, stopping pagination at page ${pageCount}`);
          break;
        }
        // Need to wait a bit before using the next page token
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          // Get the next page of results
          response = await axios.get(textSearchUrl, {
            params: {
              pagetoken: data.next_page_token,
              key: this.apiKey
            }
          });
          
          data = response.data;
          // Track this API call for pagination
          this.trackApiCall('textsearch-pagination', data.status);
          
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            // Check for duplicates before adding
            const newResults = data.results.filter(newPlace => 
              !allResults.some(existingPlace => existingPlace.place_id === newPlace.place_id)
            );
            
            console.log(`✅ GooglePlacesService: Found ${data.results.length} places on page ${pageCount + 1}, ${newResults.length} new unique results`);
            
            allResults = [...allResults, ...newResults];
            pageCount++;
          }
        } catch (error) {
          console.error(`❌ GooglePlacesService: Error fetching next page:`, error);
          break;
        }
      }
      
      if (allResults.length === 0) {
        console.log('❌ GooglePlacesService: No results found');
        return { businesses: [], sources: [] };
      }
      
      console.log(`✅ GooglePlacesService: Found ${allResults.length} total places across ${pageCount} pages`);
      
      // Process the results
      const businesses: BusinessData[] = [];
      // Track place IDs to avoid duplicates
      const processedPlaceIds = new Set<string>();
      
      // Log the full result count for data validation
      const totalResultsFound = allResults.length;
      console.log(`📊 GooglePlacesService: Beginning to process ${totalResultsFound} total results`);
      
      // Track businesses with zero contacts for validation
      const businessesWithNoContacts: string[] = [];
      const businessesWithNoContactMethods: string[] = [];
      
      for (const place of allResults) {
        try {
          // Skip if we've already processed this place
          if (processedPlaceIds.has(place.place_id)) {
            console.log(`⚠️ GooglePlacesService: Skipping duplicate place: ${place.name}`);
            continue;
          }
          
          // Mark as processed
          processedPlaceIds.add(place.place_id);
          
          // Get the place details to get more information
          const details = await this.getPlaceDetails(place.place_id);
          
          // Generate contacts for this business
          const businessContacts = this.generateContactsFromPlace(place, details);
          
          // Track businesses with no contacts for reporting
          if (businessContacts.length === 0) {
            console.warn(`⚠️ GooglePlacesService: No contacts could be generated for business "${place.name}" (${place.place_id})`);
            businessesWithNoContacts.push(place.name);
          }
          
          // Track businesses with no contact methods (phone or website)
          if (!details.formatted_phone_number && !details.international_phone_number && !details.website) {
            console.warn(`⚠️ GooglePlacesService: No contact methods found for business "${place.name}" (${place.place_id})`);
            businessesWithNoContactMethods.push(place.name);
          }
          
          // Create the business data with enhanced fields
          const business: BusinessData = {
            id: uuidv4(),
            name: place.name,
            address: place.formatted_address || details.formatted_address || details.vicinity || '',
            phoneNumber: details.formatted_phone_number || details.international_phone_number || '',
            website: details.website || '',
            description: details.editorial_summary?.overview || place.editorial_summary?.overview || '',
            category: place.types?.join(', ') || details.types?.join(', ') || '',
            rating: place.rating,
            reviewCount: place.user_ratings_total,
            imageUrl: place.photos?.[0]?.photo_reference 
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${this.apiKey}`
              : (details.photos?.[0]?.photo_reference 
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${details.photos[0].photo_reference}&key=${this.apiKey}`
                : undefined),
            source: 'google-places-api',
            sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
            scrapedDate: new Date(),
            contacts: businessContacts
          };
          
          businesses.push(business);
        } catch (error) {
          console.error(`❌ GooglePlacesService: Error processing place:`, error);
        }
      }
      
      // Log a summary of businesses with no contacts if any exist
      if (businessesWithNoContacts.length > 0) {
        console.warn(`⚠️ GooglePlacesService: ${businessesWithNoContacts.length} businesses had no extractable contacts`);
      }
      
      if (businessesWithNoContactMethods.length > 0) {
        console.warn(`⚠️ GooglePlacesService: ${businessesWithNoContactMethods.length} businesses had no contact methods (phone/website)`);
      }
      
      // Log the final business count vs. initial results count
      const totalProcessedBusinesses = businesses.length;
      const totalContactsGenerated = businesses.reduce((sum, business) => sum + (business.contacts?.length || 0), 0);
      
      console.log(`📊 GooglePlacesService: Successfully processed ${totalProcessedBusinesses}/${totalResultsFound} businesses`);
      console.log(`📊 GooglePlacesService: Generated a total of ${totalContactsGenerated} contacts`);
      
      // Calculate average contacts per business for reporting
      const avgContactsPerBusiness = totalContactsGenerated / (totalProcessedBusinesses || 1);
      
      // Create metadata object for stats reporting
      const metaData = {
        totalResultsFound,
        totalProcessedBusinesses,
        totalContactsGenerated,
        pagesRetrieved: pageCount,
        businessesWithNoContactsCount: businessesWithNoContacts.length,
        businessesWithNoContactMethodsCount: businessesWithNoContactMethods.length,
        averageContactsPerBusiness: avgContactsPerBusiness.toFixed(1),
        quotaStatus: this.getQuotaUsage().status
      };
      
      return { 
        businesses, 
        sources: ['google-places-api'],
        meta: metaData
      };
    } catch (error) {
      console.error(`❌ GooglePlacesService error:`, error);
      return { businesses: [], sources: [] };
    }
  }
  
  /**
   * Get detailed information about a place
   */
  private async getPlaceDetails(placeId: string, retryCount = 0): Promise<any> {
    try {
      // Check quota before making the API call
      if (this.isQuotaExceeded()) {
        this.handleQuotaError({ message: 'Quota exceeded during place details fetch' });
        return {}; // Return empty object if quota is exceeded
      }
      
      const detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
      const response = await axios.get(detailsUrl, {
        params: {
          place_id: placeId,
          // Expanded fields to get more contact information
          fields: 'name,formatted_phone_number,website,opening_hours,url,address_component,editorial_summary,international_phone_number,formatted_address,types,rating,user_ratings_total,photos,geometry,vicinity,plus_code',
          key: this.apiKey
        }
      });
      
      const data: PlaceDetailsResult = response.data;
      
      // Track this details API call for quota monitoring
      this.trackApiCall('placedetails', data.status);
      
      if (data.status !== 'OK') {
        console.error(`❌ GooglePlacesService: Failed to get place details: ${data.status}`);
        
        // If we have retry attempts left and it's a retriable error, try again
        if (retryCount < 2 && data.status !== 'NOT_FOUND' && data.status !== 'INVALID_REQUEST') {
          console.log(`⚠️ Retrying place details fetch for ${placeId}, attempt ${retryCount + 1}`);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.getPlaceDetails(placeId, retryCount + 1);
        }
        
        return {};
      }
      
      // Log if we got data after a retry attempt
      if (retryCount > 0) {
        console.log(`✅ Successfully fetched place details for ${placeId} after ${retryCount} retry attempts`);
      }
      
      return data.result;
    } catch (error) {
      console.error(`❌ GooglePlacesService: Error getting place details:`, error);
      // Track failed API call
      this.trackApiCall('placedetails', 'ERROR');
      
      // Retry on network errors or timeouts
      if (retryCount < 2) {
        console.log(`⚠️ Retrying place details fetch after error for ${placeId}, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Longer wait on error
        return this.getPlaceDetails(placeId, retryCount + 1);
      }
      
      return {};
    }
  }
  
  /**
   * Generate contact information from place data
   * Since Google Places API doesn't provide contact persons,
   * we'll generate multiple realistic contacts based on the business information
   */
  private generateContactsFromPlace(place: any, details: any): Contact[] {
    // Get the business name and category to generate appropriate contacts
    const businessName = place.name;
    const businessCategories = place.types || [];
    const contacts: Contact[] = [];
    const phoneNumber = details.formatted_phone_number || details.international_phone_number || '';
    
    // Determine business type for appropriate contact generation - more comprehensive category detection
    const isRetail = businessCategories.some((cat: string) => 
      ['store', 'shop', 'retail', 'clothing_store', 'shopping_mall', 'department_store', 
       'supermarket', 'convenience_store', 'electronics_store', 'furniture_store', 'hardware_store', 
       'home_goods_store', 'jewelry_store', 'shoe_store', 'book_store'].includes(cat));
      
    const isRestaurant = businessCategories.some((cat: string) => 
      ['restaurant', 'food', 'cafe', 'bar', 'bakery', 'meal_delivery', 'meal_takeaway', 
       'night_club', 'bakery', 'ice_cream', 'liquor_store'].includes(cat));
      
    const isTech = businessCategories.some((cat: string) => 
      ['electronics_store', 'point_of_interest', 'establishment', 'storage', 'premise', 
       'moving_company', 'roofing_contractor', 'general_contractor'].includes(cat));
      
    const isService = businessCategories.some((cat: string) => 
      ['lawyer', 'doctor', 'health', 'dentist', 'hospital', 'insurance_agency', 'real_estate_agency', 
       'finance', 'accounting', 'bank', 'beauty_salon', 'hair_care', 'spa', 'physiotherapist', 
       'travel_agency', 'lodging', 'gym', 'car_repair', 'car_dealer', 'car_rental', 'car_wash',
       'veterinary_care', 'locksmith', 'electrician', 'plumber', 'laundry'].includes(cat));
    
    const isHospitality = businessCategories.some((cat: string) => 
      ['lodging', 'hotel', 'resort', 'travel_agency', 'tourist_attraction', 'vacation_rental'].includes(cat));
      
    const isHealthcare = businessCategories.some((cat: string) => 
      ['hospital', 'doctor', 'dentist', 'health', 'pharmacy', 'physiotherapist', 'veterinary_care'].includes(cat));
      
    const isEducation = businessCategories.some((cat: string) => 
      ['school', 'university', 'primary_school', 'secondary_school', 'book_store', 'library'].includes(cat));
      
    // Business type constants defined above
      
    // Generate domain for email addresses from website if available
    let emailDomain = '';
    try {
      if (details.website) {
        emailDomain = new URL(details.website).hostname.replace('www.', '');
      }
    } catch (e) {
      // If website URL is invalid, use a fallback approach
      emailDomain = businessName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    }
    
    // Create a primary contact (General contact/reception)
    const primaryContact: Contact = {
      contactId: uuidv4(),
      name: 'Main Contact',
      position: isHospitality ? 'Front Desk' : (isHealthcare ? 'Reception' : 'Front Office'),
      email: emailDomain ? `contact@${emailDomain}` : '',
      phoneNumber: phoneNumber,
      isDecisionMaker: false,
      companyName: businessName,
      companyId: place.place_id
    };
    contacts.push(primaryContact);
    
    // Generate different types of manager contacts based on business category
    // First determine the manager title based on business type
    let managerTitle = 'Manager';
    if (isRestaurant) {
      managerTitle = 'Restaurant Manager';
    } else if (isRetail) {
      managerTitle = 'Store Manager';
    } else if (isTech) {
      managerTitle = 'Operations Manager';
    } else if (isService) {
      managerTitle = 'Office Manager';
    } else if (isHospitality) {
      managerTitle = 'General Manager';
    } else if (isHealthcare) {
      managerTitle = 'Practice Manager';
    } else if (isEducation) {
      managerTitle = 'Administrative Director';
    }
    
    const managerContact: Contact = {
      contactId: uuidv4(),
      name: `Manager`,
      position: managerTitle,
      email: emailDomain ? `manager@${emailDomain}` : '',
      phoneNumber: phoneNumber,
      isDecisionMaker: true,
      companyName: businessName,
      companyId: place.place_id
    };
    contacts.push(managerContact);
    
    // Generate owner/director contact for decision making with appropriate title
    let ownerTitle = 'Owner';
    if (isService) {
      ownerTitle = 'Director';
    } else if (isRestaurant) {
      ownerTitle = 'Owner';
    } else if (isTech) {
      ownerTitle = 'CEO';
    } else if (isHospitality) {
      ownerTitle = 'Managing Director';
    } else if (isHealthcare) {
      ownerTitle = businessCategories.includes('hospital') ? 'Chief Medical Officer' : 'Medical Director';
    } else if (isEducation) {
      ownerTitle = 'Principal';
    } else {
      ownerTitle = 'President';
    }
    
    const ownerContact: Contact = {
      contactId: uuidv4(),
      name: `Owner`,
      position: ownerTitle,
      email: emailDomain ? `${ownerTitle.toLowerCase().replace(/\s+/g, '.')}@${emailDomain}` : '',
      phoneNumber: phoneNumber,
      isDecisionMaker: true,
      companyName: businessName,
      companyId: place.place_id
    };
    contacts.push(ownerContact);
    
    // Add department-specific contacts based on business type
    
    // Common for most businesses - customer service
    if (isRetail || isRestaurant || isHospitality) {
      contacts.push({
        contactId: uuidv4(),
        name: `Customer Service`,
        position: 'Customer Relations',
        email: emailDomain ? `support@${emailDomain}` : '',
        phoneNumber: phoneNumber,
        isDecisionMaker: false,
        companyName: businessName,
        companyId: place.place_id
      });
    }
    
    // Sales contacts - different titles based on business type
    if (isTech || isService || isRetail || isHospitality) {
      let salesTitle = 'Sales Manager';
      
      if (isRetail) {
        salesTitle = 'Sales Associate';
      } else if (isHospitality) {
        salesTitle = 'Reservations Manager';
      } else if (isTech) {
        salesTitle = 'Business Development Manager';
      }
      
      contacts.push({
        contactId: uuidv4(),
        name: `Sales Department`,
        position: salesTitle,
        email: emailDomain ? `sales@${emailDomain}` : '',
        phoneNumber: phoneNumber,
        isDecisionMaker: salesTitle.includes('Manager'),
        companyName: businessName,
        companyId: place.place_id
      });
    }
    
    // Marketing contact
    if (isTech || isService || isRetail || isHospitality) {
      contacts.push({
        contactId: uuidv4(),
        name: `Marketing Department`,
        position: 'Marketing Director',
        email: emailDomain ? `marketing@${emailDomain}` : '',
        phoneNumber: phoneNumber,
        isDecisionMaker: true,
        companyName: businessName,
        companyId: place.place_id
      });
    }
    
    // Add industry-specific contacts
    if (isHealthcare) {
      contacts.push({
        contactId: uuidv4(),
        name: `Appointments`,
        position: 'Appointments Coordinator',
        email: emailDomain ? `appointments@${emailDomain}` : '',
        phoneNumber: phoneNumber,
        isDecisionMaker: false,
        companyName: businessName,
        companyId: place.place_id
      });
    }
    
    if (isEducation) {
      contacts.push({
        contactId: uuidv4(),
        name: `Admissions`,
        position: 'Admissions Officer',
        email: emailDomain ? `admissions@${emailDomain}` : '',
        phoneNumber: phoneNumber,
        isDecisionMaker: false,
        companyName: businessName,
        companyId: place.place_id
      });
    }
    
    if (isHospitality) {
      contacts.push({
        contactId: uuidv4(),
        name: `Events Department`,
        position: 'Events Manager',
        email: emailDomain ? `events@${emailDomain}` : '',
        phoneNumber: phoneNumber,
        isDecisionMaker: true,
        companyName: businessName,
        companyId: place.place_id
      });
    }
    
    // Return all generated contacts
    return contacts;
  }
}

// Export singleton instance
export const googlePlacesService = new GooglePlacesService();