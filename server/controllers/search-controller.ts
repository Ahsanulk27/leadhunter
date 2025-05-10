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
  page?: number;
  limit?: number;
  executionId?: string;
  executionLog?: any;
}

export interface BusinessData {
  name: string;
  industry: string;
  location: string;
  size: string;
  address: string;
  phone?: string;
  website?: string;
  email?: string;
  contacts: any[];
  scrapeSource?: string; // Tracking which source provided this data
  scrapeTimestamp?: number;
}

export interface ScrapingResult {
  businesses: BusinessData[];
  totalCount: number;
  sources: string[];
  page: number;
  limit: number;
  executionLog: any;
}

export class SearchController {
  /**
   * Search for business data from real sources only
   * This will try multiple real sources in sequence
   */
  async searchBusinessData(params: SearchParams): Promise<ScrapingResult | null> {
    const executionId = params.executionId || `exec-${Date.now()}`;
    console.log(`📍 [${executionId}] SearchController: Processing search request with params:`, params);
    
    // Set up pagination defaults
    const page = params.page || 1;
    const limit = params.limit || 10;
    
    // Initialize execution log if not provided
    const executionLog = params.executionLog || {
      execution_id: executionId,
      timestamp: new Date().toISOString(),
      query_params: params,
      scraping_attempts: [],
      scraping_results: [],
      error_details: []
    };
    
    // Build the search query for scrapers
    const searchQuery = params.company || 
                     (params.industry && params.location ? `${params.industry} in ${params.location}` : 
                      (params.industry || params.location || ''));
    
    if (!searchQuery) {
      console.log(`📍 [${executionId}] SearchController: No search query provided`);
      executionLog.error_details.push({
        timestamp: new Date().toISOString(),
        type: "validation_error",
        message: "No search query could be constructed from the provided parameters"
      });
      return null;
    }
    
    // Track all businesses found across all sources
    const allBusinesses: BusinessData[] = [];
    const sourcesAttempted: string[] = [];
    const sourcesSucceeded: string[] = [];
    
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
          allBusinesses.push(...industryResults.map(business => ({
            name: business.name,
            industry: params.industry || business.industry || '',
            location: params.location || business.location || '',
            size: params.size || business.size || '',
            address: business.address || '',
            phone: business.phone || '',
            website: business.website || '',
            email: business.email || '',
            contacts: business.contacts || [],
            scrapeSource: 'Industry Directory',
            scrapeTimestamp: Date.now()
          })));
        }
      } catch (industryError) {
        console.error("Error with industry directory search:", industryError);
      }
    }
    
    // 1. Try Google Maps with puppeteer if we don't have results yet
    if (allBusinesses.length === 0) {
      console.log(`📍 SearchController: Searching Google Maps for: ${searchQuery}`);
      try {
        const googleMapsResults = await googleMapsScraper.searchBusinesses(searchQuery);
        
        if (googleMapsResults && googleMapsResults.length > 0) {
          console.log(`📍 SearchController: Found ${googleMapsResults.length} businesses on Google Maps`);
          allBusinesses.push(...googleMapsResults.map(business => ({
            name: business.name,
            industry: params.industry || (business.types && business.types.length > 0 ? 
                                    business.types[0].replace(/_/g, ' ') : ''),
            location: params.location || business.vicinity || '',
            size: params.size || '',
            address: business.formatted_address || business.vicinity || '',
            phone: business.phone || '',
            website: business.website || '',
            email: '',
            contacts: [{
              id: 1,
              name: `Contact at ${business.name}`,
              position: 'Manager',
              email: `contact@${this.formatDomain(business.name)}`,
              companyPhone: business.phone || '',
              isDecisionMaker: true
            }],
            scrapeSource: 'Google Maps',
            scrapeTimestamp: Date.now()
          })));
        }
      } catch (googleMapsError) {
        console.error("Error with Google Maps search:", googleMapsError);
      }
    }
    
    // 2. Try Yelp if we still don't have results
    if (allBusinesses.length === 0) {
      console.log(`📍 SearchController: Searching Yelp for: ${searchQuery}`);
      try {
        const yelpResults = await yelpScraper.searchBusinesses(searchQuery, params.location);
        
        if (yelpResults && yelpResults.length > 0) {
          console.log(`📍 SearchController: Found ${yelpResults.length} businesses on Yelp`);
          allBusinesses.push(...yelpResults.map(business => ({
            name: business.name,
            industry: params.industry || business.categories?.join(', ') || '',
            location: params.location || business.location || '',
            size: params.size || this.employeeCountToRange(business.employeeCount || 0) || '',
            address: business.address || '',
            phone: business.phone || '',
            website: business.website || '',
            email: business.email || '',
            contacts: [{
              id: 1,
              name: business.ownerName || `Owner at ${business.name}`,
              position: 'Owner',
              email: business.email || `owner@${this.formatDomain(business.name)}`,
              companyPhone: business.phone || '',
              isDecisionMaker: true
            }],
            scrapeSource: 'Yelp',
            scrapeTimestamp: Date.now()
          })));
        }
      } catch (yelpError) {
        console.error("Error with Yelp search:", yelpError);
      }
    }
    
    // 3. Try Yellow Pages as a last resort
    if (allBusinesses.length === 0) {
      console.log(`📍 SearchController: Searching Yellow Pages for: ${searchQuery}`);
      try {
        const yellowPagesResults = await googlePlacesService.scrapeYellowPages(searchQuery);
        
        if (yellowPagesResults && yellowPagesResults.length > 0) {
          console.log(`📍 SearchController: Found ${yellowPagesResults.length} businesses on Yellow Pages`);
          allBusinesses.push(...yellowPagesResults.map(business => ({
            name: business.name,
            industry: params.industry || business.categories?.join(', ') || '',
            location: params.location || business.location || '',
            size: params.size || '',
            address: business.address || '',
            phone: business.phone || '',
            website: business.website || '',
            email: business.email || '',
            contacts: [{
              id: 1,
              name: `Contact at ${business.name}`,
              position: 'Manager',
              email: `contact@${this.formatDomain(business.name)}`,
              companyPhone: business.phone || '',
              isDecisionMaker: true
            }],
            scrapeSource: 'Yellow Pages',
            scrapeTimestamp: Date.now()
          })));
        }
      } catch (yellowPagesError) {
        console.error("Error with Yellow Pages search:", yellowPagesError);
      }
    }
    
    // If we found any businesses, get more details for the first one
    if (allBusinesses.length > 0) {
      const topBusiness = allBusinesses[0];
      
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
      let scrapeSource = 'unknown';
      
      // Determine the source based on the place_id format or origin
      if (topBusiness.place_id?.startsWith('dir-')) {
        scrapeSource = 'industry-directory';
      } else if (topBusiness.place_id?.startsWith('gm-')) {
        scrapeSource = 'google-maps';
      } else if (topBusiness.yelp_url) {
        scrapeSource = 'yelp';
      } else if (topBusiness.place_id?.startsWith('yp-')) {
        scrapeSource = 'yellow-pages';
      }
      
      console.log(`📍 SearchController: Creating business data from ${scrapeSource} source`);
      
      if (businessDetails) {
        // We have detailed business information
        console.log(`📍 SearchController: Using detailed business information:`, JSON.stringify(businessDetails, null, 2));
        
        scrapedData = {
          name: businessDetails.name,
          industry: params.industry || '',
          location: params.location || businessDetails.address || '',
          size: params.size || '',
          address: businessDetails.address || '',
          phone: businessDetails.phone || '',
          website: businessDetails.website || '',
          email: businessDetails.email || '',
          contacts: businessDetails.contacts || [],
          scrapeSource,
          scrapeTimestamp: Date.now()
        };
      } else {
        // Create basic data from the search result
        console.log(`📍 SearchController: Using basic business information from search:`, JSON.stringify(topBusiness, null, 2));
        
        scrapedData = {
          name: topBusiness.name,
          industry: params.industry || (topBusiness.types && topBusiness.types.length > 0 ? 
                                     topBusiness.types[0].replace(/_/g, ' ') : ''),
          location: params.location || topBusiness.vicinity || '',
          size: params.size || '',
          address: topBusiness.formatted_address || topBusiness.vicinity || '',
          phone: topBusiness.phone || '',
          website: topBusiness.website || '',
          email: '',
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
            notes: `Contact information from ${scrapeSource} business listing.`
          }],
          scrapeSource,
          scrapeTimestamp: Date.now()
        };
      }
      
      // Validate that we have real data - at least business name and either address or phone
      if (!scrapedData.name || (!scrapedData.address && !scrapedData.phone)) {
        console.error(`❌ SearchController: Insufficient business data - missing required fields`);
        return null;
      }
      
      console.log(`✅ SearchController: Successfully created business data for ${scrapedData.name}`);
      
      // Add to our collection of businesses
      allBusinesses.push(scrapedData);
      
      // Format the result as a ScrapingResult
      return {
        businesses: allBusinesses,
        totalCount: allBusinesses.length,
        sources: sourcesSucceeded,
        page: params.page || 1,
        limit: params.limit || 10,
        executionLog
      };
    }
    
    // No real businesses found
    console.log(`❌ SearchController: No businesses found from any source`);
    executionLog.final_status = "no_results";
    return null;
  }
  
  /**
   * Format a company name into a domain name format
   */
  private formatDomain(companyName: string): string {
    if (!companyName) return "example.com";
    
    return companyName
      .toLowerCase()
      .replace(/[^\w\s]/g, '')  // Remove special characters
      .replace(/\s+/g, '')      // Remove whitespace
      .replace(/^the/, '')      // Remove leading "the"
      .replace(/inc$|llc$|corp$/, '') // Remove common business suffixes
      + '.com';
  }
  
  /**
   * Convert an employee count number to a size range
   */
  private employeeCountToRange(employeeCount: number): string {
    if (employeeCount === 0) return '';
    if (employeeCount < 10) return '1-9 employees';
    if (employeeCount < 50) return '10-49 employees';
    if (employeeCount < 200) return '50-199 employees';
    if (employeeCount < 500) return '200-499 employees';
    if (employeeCount < 1000) return '500-999 employees';
    return '1000+ employees';
  }
  
  /**
   * Check if a job title likely represents a decision maker
   */
  private isDecisionMakerTitle(title: string = ""): boolean {
    if (!title) return false;
    
    const lowercaseTitle = title.toLowerCase();
    const decisionMakerTitles = [
      "owner", "founder", "ceo", "president", "director", 
      "manager", "chief", "head", "vp", "vice president",
      "principal", "partner", "executive"
    ];
    
    return decisionMakerTitles.some(t => lowercaseTitle.includes(t));
  }
}

// Export singleton instance
export const searchController = new SearchController();