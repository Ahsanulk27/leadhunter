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
      }))
    };
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
      const MAX_PAGES = 3; // Limit to 3 pages of results to avoid rate limiting
      
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
      
      // Get next pages if we have a next_page_token and haven't reached max results
      while (data.next_page_token && allResults.length < maxResults && pageCount < MAX_PAGES) {
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
          
          // Create the business data
          const business: BusinessData = {
            id: uuidv4(),
            name: place.name,
            address: place.formatted_address || '',
            phoneNumber: details.formatted_phone_number || '',
            website: details.website || '',
            description: place.editorial_summary?.overview || '',
            category: place.types?.join(', ') || '',
            rating: place.rating,
            reviewCount: place.user_ratings_total,
            imageUrl: place.photos?.[0]?.photo_reference 
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${this.apiKey}`
              : undefined,
            source: 'google-places-api',
            sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
            scrapedDate: new Date(),
            contacts: this.generateContactsFromPlace(place, details)
          };
          
          businesses.push(business);
          
          // Stop if we've reached the max results
          if (businesses.length >= maxResults) {
            console.log(`✅ GooglePlacesService: Reached maximum of ${maxResults} results`);
            break;
          }
        } catch (error) {
          console.error(`❌ GooglePlacesService: Error processing place:`, error);
        }
      }
      
      return { 
        businesses, 
        sources: ['google-places-api'] 
      };
    } catch (error) {
      console.error(`❌ GooglePlacesService error:`, error);
      return { businesses: [], sources: [] };
    }
  }
  
  /**
   * Get detailed information about a place
   */
  private async getPlaceDetails(placeId: string): Promise<any> {
    try {
      const detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
      const response = await axios.get(detailsUrl, {
        params: {
          place_id: placeId,
          fields: 'name,formatted_phone_number,website,opening_hours,url,address_component,editorial_summary',
          key: this.apiKey
        }
      });
      
      const data: PlaceDetailsResult = response.data;
      
      // Track this details API call for quota monitoring
      this.trackApiCall('placedetails', data.status);
      
      if (data.status !== 'OK') {
        console.error(`❌ GooglePlacesService: Failed to get place details: ${data.status}`);
        return {};
      }
      
      return data.result;
    } catch (error) {
      console.error(`❌ GooglePlacesService: Error getting place details:`, error);
      // Track failed API call
      this.trackApiCall('placedetails', 'ERROR');
      return {};
    }
  }
  
  /**
   * Generate contact information from place data
   * Since Google Places API doesn't provide contact persons,
   * we'll generate realistic contact information based on the business name
   */
  private generateContactsFromPlace(place: any, details: any): Contact[] {
    // Get the business name to generate contacts
    const businessName = place.name;
    
    // Create a primary contact (usually a manager/owner)
    const primaryContact: Contact = {
      contactId: uuidv4(),
      name: 'Contact via Website',
      position: 'Primary Contact',
      email: details.website ? `contact@${new URL(details.website).hostname.replace('www.', '')}` : '',
      phoneNumber: details.formatted_phone_number || '',
      isDecisionMaker: true,
      companyName: businessName,
      companyId: place.place_id
    };
    
    return [primaryContact];
  }
}

// Export singleton instance
export const googlePlacesService = new GooglePlacesService();