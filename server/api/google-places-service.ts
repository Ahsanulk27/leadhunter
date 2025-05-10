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
  
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('⚠️ GooglePlacesService: No API key provided');
    }
  }
  
  /**
   * Search for businesses using Google Places API
   */
  async searchBusinesses(query: string, location?: string): Promise<{
    businesses: BusinessData[];
    sources: string[];
    error?: {
      code: string;
      message: string;
    };
  }> {
    console.log(`🔍 GooglePlacesService: Searching for '${query}' in ${location || 'any location'}`);
    
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
      const response = await axios.get(textSearchUrl, {
        params: {
          query: searchQuery,
          key: this.apiKey
        }
      });
      
      const data: PlacesSearchResult = response.data;
      
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
      
      if (data.results.length === 0) {
        console.log('❌ GooglePlacesService: No results found');
        return { businesses: [], sources: [] };
      }
      
      console.log(`✅ GooglePlacesService: Found ${data.results.length} places`);
      
      // Process the results
      const businesses: BusinessData[] = [];
      
      for (const place of data.results) {
        try {
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
      
      if (data.status !== 'OK') {
        console.error(`❌ GooglePlacesService: Failed to get place details: ${data.status}`);
        return {};
      }
      
      return data.result;
    } catch (error) {
      console.error(`❌ GooglePlacesService: Error getting place details:`, error);
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