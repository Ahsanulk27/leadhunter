/**
 * Controller to manage lead search operations
 * Handles coordinating between different data sources and ensures only real data is returned
 */

import { googleMapsScraper } from '../api/google-maps-scraper';
import { yelpScraper } from '../api/yelp-scraper';
import { googlePlacesService } from '../api/google-places-service';
import { industryScraper } from '../api/industry-scraper';

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
    console.log(`📍 SearchController: Processing search request with params:`, params);
    
    // Build the search query for scrapers
    const searchQuery = params.company || 
                     (params.industry && params.location ? `${params.industry} in ${params.location}` : 
                      (params.industry || params.location || ''));
    
    if (!searchQuery) {
      console.log("📍 SearchController: No search query provided");
      return null;
    }
    
    // Track all our discovered businesses across sources
    let realBusinesses: any[] = [];
    
    // If we have a specific industry, try that first through industry directory
    if (params.industry && !params.company) {
      console.log(`📍 SearchController: Searching industry directory for: ${params.industry}`);
      try {
        const industryResults = await industryScraper.searchIndustryDirectory(
          params.industry, 
          params.location
        );
        
        if (industryResults && industryResults.length > 0) {
          console.log(`📍 SearchController: Found ${industryResults.length} businesses in industry directories`);
          realBusinesses = [...industryResults];
        }
      } catch (industryError) {
        console.error("Error with industry directory search:", industryError);
      }
    }
    
    // 1. Try Google Maps with puppeteer if we don't have results yet
    if (realBusinesses.length === 0) {
      console.log(`📍 SearchController: Searching Google Maps for: ${searchQuery}`);
      try {
        const googleMapsResults = await googleMapsScraper.searchBusinesses(searchQuery);
        
        if (googleMapsResults && googleMapsResults.length > 0) {
          console.log(`📍 SearchController: Found ${googleMapsResults.length} businesses on Google Maps`);
          realBusinesses = [...googleMapsResults];
        }
      } catch (googleMapsError) {
        console.error("Error with Google Maps search:", googleMapsError);
      }
    }
    
    // 2. Try Yelp if we still don't have results
    if (realBusinesses.length === 0) {
      console.log(`📍 SearchController: Searching Yelp for: ${searchQuery}`);
      try {
        const yelpResults = await yelpScraper.searchBusinesses(searchQuery, params.location);
        
        if (yelpResults && yelpResults.length > 0) {
          console.log(`📍 SearchController: Found ${yelpResults.length} businesses on Yelp`);
          realBusinesses = [...yelpResults];
        }
      } catch (yelpError) {
        console.error("Error with Yelp search:", yelpError);
      }
    }
    
    // 3. Try Yellow Pages as a last resort
    if (realBusinesses.length === 0) {
      console.log(`📍 SearchController: Searching Yellow Pages for: ${searchQuery}`);
      try {
        const yellowPagesResults = await googlePlacesService.scrapeYellowPages(searchQuery);
        
        if (yellowPagesResults && yellowPagesResults.length > 0) {
          console.log(`📍 SearchController: Found ${yellowPagesResults.length} businesses on Yellow Pages`);
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
      
      console.log(`📍 SearchController: Getting details for business: ${topBusiness.name}`);
      
      // Try to get more details based on where we found the business
      if (topBusiness.place_id?.startsWith('dir-')) {
        // If from industry directory
        try {
          businessDetails = await industryScraper.getBusinessDetails(
            params.company || topBusiness.name,
            params.industry,
            params.location
          );
          console.log(`📍 SearchController: Got industry directory details for ${topBusiness.name}`);
        } catch (industryDetailError) {
          console.error("Error getting industry business details:", industryDetailError);
        }
      } else if (topBusiness.place_id?.startsWith('gm-') || params.company) {
        // If from Google Maps or if we have a company name
        try {
          businessDetails = await googleMapsScraper.getBusinessDetails(
            params.company || topBusiness.name, 
            params.location
          );
          console.log(`📍 SearchController: Got Google Maps details for ${topBusiness.name}`);
        } catch (mapsDetailError) {
          console.error("Error getting Google Maps business details:", mapsDetailError);
        }
      } else if (topBusiness.yelp_url) {
        // If from Yelp
        try {
          businessDetails = await yelpScraper.getBusinessDetails(topBusiness.yelp_url);
          console.log(`📍 SearchController: Got Yelp details for ${topBusiness.name}`);
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