/**
 * Search controller to coordinate scraping from multiple sources and implement pagination
 */

import { BusinessData, ScrapingResult, SearchParams, ErrorResponse } from '../models/business-data';
import { googleMapsScraper } from '../api/google-maps-scraper';
import { yelpScraper } from '../api/yelp-scraper';
import { yellowPagesScraper } from '../api/yellow-pages-scraper';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

interface ScraperFunction {
  (query: string, location?: string, executionId?: string, executionLog?: any): Promise<{ businesses: BusinessData[], totalResults?: number }>;
}

export class SearchController {
  private logsDir = path.join(process.cwd(), 'logs');
  
  constructor() {
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Search for business data from multiple sources with pagination
   */
  async searchBusinessData(params: SearchParams): Promise<ScrapingResult | ErrorResponse> {
    const {
      industry,
      location,
      companyName,
      page = 1,
      limit = 20,
      executionId: providedExecutionId,
      executionLog: providedExecutionLog
    } = params;
    
    // Generate execution ID if not provided
    const executionId = providedExecutionId || `search-${Date.now()}-${randomBytes(4).toString('hex')}`;
    
    // Initialize execution log
    const executionLog = providedExecutionLog || {
      execution_id: executionId,
      timestamp: new Date().toISOString(),
      query_params: { industry, location, companyName, page, limit },
      scraping_attempts: [],
      scraping_results: [],
      error_details: []
    };
    
    const executionStartTime = Date.now();
    
    // Determine search query - prefer company name, fallback to industry
    const searchQuery = companyName || industry || '';
    if (!searchQuery) {
      return {
        error: 'No search query provided',
        details: 'Please provide either an industry or a company name to search for',
        executionId,
        executionDate: new Date().toISOString()
      };
    }
    
    console.log(`🔍 SearchController: Searching for "${searchQuery}" in "${location || 'any location'}" (page ${page}, limit ${limit})`);
    
    // Set up scraping pipeline
    const scrapers: { name: string; fn: ScraperFunction }[] = [
      { name: 'google-maps', fn: googleMapsScraper.searchBusinesses.bind(googleMapsScraper) },
      { name: 'yelp', fn: yelpScraper.searchBusinesses.bind(yelpScraper) },
      { name: 'yellow-pages', fn: yellowPagesScraper.searchBusinesses.bind(yellowPagesScraper) }
    ];
    
    // Log path for this execution
    const logFilePath = path.join(this.logsDir, `search-${executionId}.json`);
    
    try {
      // Run scrapers in parallel
      const scrapingResults = await Promise.allSettled(
        scrapers.map(scraper => 
          scraper.fn(searchQuery, location, `${executionId}-${scraper.name}`, executionLog)
          .catch(error => {
            console.error(`❌ Error in ${scraper.name} scraper:`, error);
            return { businesses: [] };
          })
        )
      );
      
      // Collect all successful business data
      const allBusinesses: BusinessData[] = [];
      
      scrapingResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.businesses.length > 0) {
          const scraperName = scrapers[index].name;
          console.log(`✅ ${scraperName} found ${result.value.businesses.length} results`);
          
          // Add all businesses from this scraper
          allBusinesses.push(...result.value.businesses);
        } else {
          console.log(`❌ ${scrapers[index].name} failed or returned no results`);
        }
      });
      
      // Remove duplicates based on name + phone number or name + address
      const uniqueBusinesses = this.removeDuplicates(allBusinesses);
      
      // If we have no data from any source, return error
      if (uniqueBusinesses.length === 0) {
        console.log(`❌ SearchController: No businesses found from any source`);
        const error: ErrorResponse = {
          error: "No real business data found after live attempts.",
          details: "All scraping attempts failed to return any business data.",
          executionId,
          executionDate: new Date().toISOString()
        };
        
        // Log the execution for diagnostics
        fs.writeFileSync(logFilePath, JSON.stringify({
          error,
          executionLog
        }, null, 2));
        
        return error;
      }
      
      // Apply pagination
      const totalResults = uniqueBusinesses.length;
      const totalPages = Math.ceil(totalResults / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBusinesses = uniqueBusinesses.slice(startIndex, endIndex);
      
      // Prepare response
      const response: ScrapingResult = {
        businesses: paginatedBusinesses,
        page,
        limit,
        totalResults,
        totalPages,
        executionTimeMs: Date.now() - executionStartTime,
        sources: scrapers.map(s => s.name),
        query: searchQuery,
        location: location,
        executionDate: new Date().toISOString(),
        executionId
      };
      
      // Log the execution for diagnostics
      executionLog.final_result = {
        total_businesses: totalResults,
        paginated_count: paginatedBusinesses.length,
        execution_time_ms: response.executionTimeMs
      };
      
      fs.writeFileSync(logFilePath, JSON.stringify({
        result: response,
        executionLog
      }, null, 2));
      
      return response;
      
    } catch (error) {
      console.error('❌ SearchController error:', error);
      
      const errorResponse: ErrorResponse = {
        error: "Search operation failed",
        details: (error as Error).message,
        executionId,
        executionDate: new Date().toISOString()
      };
      
      // Log the error for diagnostics
      executionLog.error = {
        message: (error as Error).message,
        stack: (error as Error).stack
      };
      
      fs.writeFileSync(logFilePath, JSON.stringify({
        error: errorResponse,
        executionLog
      }, null, 2));
      
      return errorResponse;
    }
  }

  /**
   * Remove duplicate businesses based on name + phone or name + address
   */
  private removeDuplicates(businesses: BusinessData[]): BusinessData[] {
    const uniqueMap = new Map<string, BusinessData>();
    
    businesses.forEach(business => {
      // Create unique keys based on name + phone or name + address
      const nameNormalized = this.normalizeString(business.name);
      const phoneNormalized = this.normalizeString(business.phoneNumber);
      const addressNormalized = this.normalizeString(business.address);
      
      // Try to create a unique identifier
      let key = '';
      if (nameNormalized && phoneNormalized) {
        key = `${nameNormalized}-${phoneNormalized}`;
      } else if (nameNormalized && addressNormalized) {
        key = `${nameNormalized}-${addressNormalized}`;
      } else {
        // If we don't have enough info to de-duplicate, use the whole business as a key
        key = JSON.stringify(business);
      }
      
      // Only add if we don't already have this business, or if this one has more details
      const existingBusiness = uniqueMap.get(key);
      if (!existingBusiness || this.hasMoreDetails(business, existingBusiness)) {
        
        // If we already have a business but from a different source, merge the contacts
        if (existingBusiness) {
          const mergedContacts = [...existingBusiness.contacts];
          
          // Add new contacts that aren't duplicates
          business.contacts.forEach(newContact => {
            const isDuplicate = mergedContacts.some(existingContact => 
              this.normalizeString(existingContact.name) === this.normalizeString(newContact.name)
            );
            
            if (!isDuplicate) {
              mergedContacts.push(newContact);
            }
          });
          
          // Create a merged business record
          business = {
            ...business,
            contacts: mergedContacts,
            // Preserve IDs if they exist
            place_id: business.place_id || existingBusiness.place_id,
            yelp_url: business.yelp_url || existingBusiness.yelp_url,
            yellow_pages_url: business.yellow_pages_url || existingBusiness.yellow_pages_url
          };
        }
        
        uniqueMap.set(key, business);
      }
    });
    
    return Array.from(uniqueMap.values());
  }

  /**
   * Check if one business record has more details than another
   */
  private hasMoreDetails(b1: BusinessData, b2: BusinessData): boolean {
    // Create a simple score based on field presence
    const score1 = this.calculateDetailScore(b1);
    const score2 = this.calculateDetailScore(b2);
    
    return score1 > score2;
  }

  /**
   * Calculate a detail score for a business based on available fields
   */
  private calculateDetailScore(business: BusinessData): number {
    let score = 0;
    
    // Basic info
    if (business.name) score += 1;
    if (business.address) score += 1;
    if (business.phoneNumber) score += 1;
    if (business.website) score += 2;
    
    // Industry and location
    if (business.industry) score += 1;
    if (business.location) score += 1;
    if (business.size && business.size !== 'Unknown') score += 1;
    
    // Contacts
    score += business.contacts.length * 3;
    
    // Additional data
    if (business.place_id) score += 1;
    if (business.yelp_url) score += 1;
    if (business.yellow_pages_url) score += 1;
    if (business.google_rating) score += 1;
    if (business.review_count) score += 1;
    
    // If we have types, that's more detailed information
    if (business.types && business.types.length > 0) score += 1;
    if (business.vicinity) score += 1;
    if (business.formatted_address) score += 1;
    
    return score;
  }

  /**
   * Helper function to normalize strings for comparison
   */
  private normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}

export const searchController = new SearchController();