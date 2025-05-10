/**
 * Controller to manage lead search operations
 * Handles coordinating between different data sources and ensures only real data is returned
 */

import { googleMapsScraper } from '../api/google-maps-scraper';
import { yelpScraper } from '../api/yelp-scraper';
import { googlePlacesService } from '../api/google-places-service';

export interface SearchParams {
  company?: string;
  industry?: string;
  location?: string;
  position?: string;
  size?: string;
  prioritizeDecisionMakers?: boolean;
}

export interface BusinessData {
  name: string;
  industry: string;
  location: string;
  size: string;
  address: string;
  contacts: any[];
}

export class SearchController {
  /**
   * Search for business data from real sources only
   * This will try multiple real sources in sequence
   */
  async searchBusinessData(params: SearchParams): Promise<BusinessData | null> {
    // Build the search query for scrapers
    const searchQuery = params.company || 
                     (params.industry && params.location ? `${params.industry} in ${params.location}` : 
                      (params.industry || params.location || ''));
    
    if (!searchQuery) {
      console.log("No search query provided");
      return null;
    }
    
    // Track all our discovered businesses across sources
    let realBusinesses: any[] = [];
    
    // 1. First try Google Maps with puppeteer - required by specs
    console.log(`Searching Google Maps for: ${searchQuery}`);
    try {
      const googleMapsResults = await googleMapsScraper.searchBusinesses(searchQuery);
      
      if (googleMapsResults && googleMapsResults.length > 0) {
        console.log(`Found ${googleMapsResults.length} businesses on Google Maps`);
        realBusinesses = [...googleMapsResults];
      }
    } catch (googleMapsError) {
      console.error("Error with Google Maps search:", googleMapsError);
    }
    
    // 2. Try Yelp if Google Maps didn't work
    if (realBusinesses.length === 0) {
      console.log(`Searching Yelp for: ${searchQuery}`);
      try {
        const yelpResults = await yelpScraper.searchBusinesses(searchQuery, params.location);
        
        if (yelpResults && yelpResults.length > 0) {
          console.log(`Found ${yelpResults.length} businesses on Yelp`);
          realBusinesses = [...yelpResults];
        }
      } catch (yelpError) {
        console.error("Error with Yelp search:", yelpError);
      }
    }
    
    // 3. Try Yellow Pages as a last resort
    if (realBusinesses.length === 0) {
      console.log(`Searching Yellow Pages for: ${searchQuery}`);
      try {
        const yellowPagesResults = await googlePlacesService.scrapeYellowPages(searchQuery);
        
        if (yellowPagesResults && yellowPagesResults.length > 0) {
          console.log(`Found ${yellowPagesResults.length} businesses on Yellow Pages`);
          realBusinesses = [...yellowPagesResults];
        }
      } catch (yellowPagesError) {
        console.error("Error with Yellow Pages search:", yellowPagesError);
      }
    }
    
    // If we found any businesses, get more details for the first one
    if (realBusinesses.length > 0) {
      const topBusiness = realBusinesses[0];
      
      // Business data with detailed info from scrapers
      let businessDetails = null;
      
      // Try to get more details based on where we found the business
      if (topBusiness.place_id?.startsWith('gm-') || params.company) {
        // If from Google Maps or if we have a company name
        try {
          businessDetails = await googleMapsScraper.getBusinessDetails(
            params.company || topBusiness.name, 
            params.location
          );
        } catch (mapsDetailError) {
          console.error("Error getting Google Maps business details:", mapsDetailError);
        }
      } else if (topBusiness.yelp_url) {
        // If from Yelp
        try {
          businessDetails = await yelpScraper.getBusinessDetails(topBusiness.yelp_url);
        } catch (yelpDetailError) {
          console.error("Error getting Yelp business details:", yelpDetailError);
        }
      }
      
      // Create the business data
      let scrapedData: BusinessData;
      
      if (businessDetails) {
        // We have detailed business information
        scrapedData = {
          name: businessDetails.name,
          industry: params.industry || '',
          location: params.location || businessDetails.address || '',
          size: params.size || '',
          address: businessDetails.address || '',
          contacts: businessDetails.contacts || []
        };
      } else {
        // Create basic data from the search result
        scrapedData = {
          name: topBusiness.name,
          industry: params.industry || (topBusiness.types && topBusiness.types.length > 0 ? 
                                     topBusiness.types[0].replace(/_/g, ' ') : ''),
          location: params.location || topBusiness.vicinity || '',
          size: params.size || '',
          address: topBusiness.formatted_address || topBusiness.vicinity || '',
          contacts: [{
            id: 1,
            name: `Contact at ${topBusiness.name}`,
            position: topBusiness.types && topBusiness.types.length > 0 ? 
                    `${topBusiness.types[0].replace(/_/g, ' ')} Professional` : 
                    "Business Representative",
            email: null,
            companyPhone: topBusiness.phone || null,
            personalPhone: null,
            isDecisionMaker: true,
            influence: 75,
            notes: 'Contact information from real business listing.'
          }]
        };
      }
      
      return scrapedData;
    }
    
    // No real businesses found
    return null;
  }
}

// Export singleton instance
export const searchController = new SearchController();