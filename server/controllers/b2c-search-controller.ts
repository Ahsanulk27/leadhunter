/**
 * B2C Search Controller for Lead Hunter
 * Handles B2C lead generation requests with proxy rotation
 */

import { ProxyCheerioScraper } from '../api/proxy-cheerio-scraper';
import { ScrapingResult, SearchParams } from '../models/business-data';
import { generateExecutionId } from '../api/scraper-utils';

export class B2CSearchController {
  private scrapers: Map<string, ProxyCheerioScraper> = new Map();
  
  constructor() {
    console.log('🔍 B2CSearchController: Initialized');
  }
  
  /**
   * Get a scraper instance, creating a new one if needed
   */
  private getScraper(sessionId: string): ProxyCheerioScraper {
    if (!this.scrapers.has(sessionId)) {
      const scraper = new ProxyCheerioScraper();
      this.scrapers.set(sessionId, scraper);
      console.log(`🔄 B2CSearchController: Created new scraper for session ${sessionId}`);
    }
    
    return this.scrapers.get(sessionId)!;
  }
  
  /**
   * Execute a B2C search with the given parameters
   */
  async search(
    params: SearchParams, 
    sessionId: string = generateExecutionId()
  ): Promise<ScrapingResult> {
    console.log(`🔍 B2CSearchController: Starting B2C search for '${params.query}' in ${params.location || 'all locations'}`);
    const startTime = Date.now();
    
    try {
      const scraper = this.getScraper(sessionId);
      
      // Set up scraper options from search params
      const scraperOptions = {
        useProxies: params.useProxies ?? true,
        saveHtml: params.saveHtml ?? false,
        delayMin: params.delayMin ?? 2000,
        delayMax: params.delayMax ?? 5000
      };
      
      // Execute B2C search
      const result = await scraper.searchB2CLeads(params.query, params.location, scraperOptions);
      
      // Calculate data quality score based on completeness
      const dataQualityScore = this.calculateDataQualityScore(result.businesses);
      
      // Filter by rating if specified
      let filteredBusinesses = result.businesses;
      if (params.minRating && params.minRating > 0) {
        filteredBusinesses = filteredBusinesses.filter(b => 
          b.rating !== undefined && b.rating >= (params.minRating || 0)
        );
      }
      
      // Filter for decision makers if specified
      if (params.onlyDecisionMakers) {
        filteredBusinesses = filteredBusinesses.map(business => {
          if (business.contacts) {
            business.contacts = business.contacts.filter(contact => 
              contact.isDecisionMaker === true
            );
          }
          return business;
        });
        
        // Remove businesses with no contacts
        filteredBusinesses = filteredBusinesses.filter(business => 
          business.contacts && business.contacts.length > 0
        );
      }
      
      // Limit results if specified
      if (params.maxResults && params.maxResults > 0 && filteredBusinesses.length > params.maxResults) {
        filteredBusinesses = filteredBusinesses.slice(0, params.maxResults);
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      console.log(`✅ B2CSearchController: Search completed in ${executionTime}ms, found ${filteredBusinesses.length} businesses`);
      
      // Prepare the result
      const scrapingResult: ScrapingResult = {
        businesses: filteredBusinesses,
        sources: result.sources,
        query: params.query,
        location: params.location,
        executionTime,
        dataQualityScore
      };
      
      return scrapingResult;
    } catch (error) {
      console.error(`❌ B2CSearchController Error: ${(error as Error).message}`);
      return {
        businesses: [],
        sources: [],
        query: params.query,
        location: params.location,
        executionTime: Date.now() - startTime,
        dataQualityScore: 0
      };
    }
  }
  
  /**
   * Get proxy statistics for a session
   */
  getProxyStats(sessionId: string) {
    const scraper = this.scrapers.get(sessionId);
    
    if (!scraper) {
      return { error: 'Session not found' };
    }
    
    return scraper.getProxyStats();
  }
  
  /**
   * Check health of all proxies for a session
   */
  async checkProxyHealth(sessionId: string) {
    const scraper = this.scrapers.get(sessionId);
    
    if (!scraper) {
      return { error: 'Session not found' };
    }
    
    return await scraper.checkProxyHealth();
  }
  
  /**
   * Calculate a data quality score (0-100) based on completeness of data
   */
  private calculateDataQualityScore(businesses: any[]): number {
    if (businesses.length === 0) return 0;
    
    const totalScore = businesses.reduce((sum, business) => {
      let itemScore = 0;
      
      // Basic info (30 points)
      if (business.name) itemScore += 5;
      if (business.address) itemScore += 5;
      if (business.phoneNumber) itemScore += 5;
      if (business.email) itemScore += 5;
      if (business.website) itemScore += 5;
      if (business.description) itemScore += 5;
      
      // Contacts (50 points)
      if (business.contacts && business.contacts.length > 0) {
        // Base points for having contacts
        itemScore += 10;
        
        // Points for contact quality (average across contacts)
        const contactQuality = business.contacts.reduce((contactSum: number, contact: any) => {
          let contactScore = 0;
          if (contact.name) contactScore += 2;
          if (contact.position) contactScore += 2;
          if (contact.email) contactScore += 6;
          if (contact.phoneNumber) contactScore += 5;
          
          // Extra points for decision makers
          if (contact.isDecisionMaker) contactScore += 5;
          
          return contactSum + contactScore;
        }, 0) / business.contacts.length;
        
        // Add weighted contact quality (max 40 points)
        itemScore += Math.min(contactQuality * 2, 40);
      }
      
      // Metadata (20 points)
      if (business.category) itemScore += 5;
      if (business.rating) itemScore += 5;
      if (business.yearEstablished) itemScore += 5;
      if (business.reviewCount) itemScore += 5;
      
      return sum + itemScore;
    }, 0);
    
    // Calculate average and normalize to 0-100
    const maxPossibleScore = 100; // per business
    const averageScore = (totalScore / businesses.length) / maxPossibleScore * 100;
    
    return Math.min(Math.round(averageScore), 100);
  }
}

export const b2cSearchController = new B2CSearchController();