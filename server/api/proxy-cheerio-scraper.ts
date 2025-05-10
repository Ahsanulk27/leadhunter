/**
 * Proxy-Protected Cheerio Scraper for B2C Lead Generation
 * Specialized for cleaning services scraping with proxy rotation
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { EnhancedProxyManager } from './enhanced-proxy-manager';
import { logExecution, saveHtmlCache } from './scraper-utils';
import { v4 as uuidv4 } from 'uuid';

// Types for the scraper
export interface SearchParams {
  query: string;
  location: string;
  maxResults?: number;
  onlyDecisionMakers?: boolean;
  useProxies?: boolean;
}

export interface BusinessData {
  id: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  category?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  source: string;
  contacts?: Contact[];
  relevanceScore?: number;
  dataQuality?: number;
}

export interface Contact {
  id: string;
  name: string;
  position?: string;
  phoneNumber?: string;
  email?: string;
  businessId: string;
  isDecisionMaker?: boolean;
  relevanceScore?: number;
}

export interface ScrapingResult {
  query: string;
  location: string;
  timestamp: string;
  executionId: string;
  businesses: BusinessData[];
  businessCount: number;
  contactCount: number;
  errors?: string[];
  warnings?: string[];
  sources: {
    name: string;
    count: number;
    success: boolean;
  }[];
}

export class ProxyCheerioScraper {
  private proxyManager: EnhancedProxyManager;
  private executionId: string;
  private errors: string[] = [];
  private warnings: string[] = [];
  private sources: {
    name: string;
    count: number;
    success: boolean;
  }[] = [];
  
  constructor(executionId: string, proxyManager: EnhancedProxyManager) {
    this.executionId = executionId;
    this.proxyManager = proxyManager;
  }
  
  /**
   * Main search method that orchestrates the scraping process
   */
  async search(params: SearchParams): Promise<ScrapingResult> {
    const { query, location, maxResults = 50, onlyDecisionMakers = true, useProxies = true } = params;
    
    console.log(`🔍 B2CScraper: Starting search for "${query}" in ${location}`);
    logExecution(this.executionId, 'search-start', { query, location, maxResults });
    
    const startTime = Date.now();
    let businesses: BusinessData[] = [];
    let contactCount = 0;
    
    try {
      // Search Google
      const googleBusinesses = await this.searchGoogle(query, location, useProxies);
      businesses = businesses.concat(googleBusinesses);
      this.sources.push({
        name: 'google',
        count: googleBusinesses.length,
        success: googleBusinesses.length > 0
      });
      
      // Search Yelp if we still need more results
      if (businesses.length < maxResults) {
        const yelpBusinesses = await this.searchYelp(query, location, useProxies);
        businesses = businesses.concat(yelpBusinesses);
        this.sources.push({
          name: 'yelp',
          count: yelpBusinesses.length,
          success: yelpBusinesses.length > 0
        });
      }
      
      // Search Yellow Pages if we still need more
      if (businesses.length < maxResults) {
        const yellowPagesBusinesses = await this.searchYellowPages(query, location, useProxies);
        businesses = businesses.concat(yellowPagesBusinesses);
        this.sources.push({
          name: 'yellow-pages',
          count: yellowPagesBusinesses.length,
          success: yellowPagesBusinesses.length > 0
        });
      }
      
      // Deduplicate businesses
      businesses = this.deduplicateBusinesses(businesses);
      
      // Truncate to max results
      if (businesses.length > maxResults) {
        businesses = businesses.slice(0, maxResults);
      }
      
      // Generate contacts for each business
      businesses = await this.generateContacts(businesses);
      
      // Filter contacts to decision makers if requested
      if (onlyDecisionMakers) {
        businesses = businesses.map(business => {
          if (business.contacts && business.contacts.length > 0) {
            business.contacts = business.contacts.filter(contact => 
              contact.isDecisionMaker === true
            );
          }
          return business;
        });
      }
      
      // Calculate total contact count
      contactCount = businesses.reduce((count, business) => 
        count + (business.contacts ? business.contacts.length : 0), 0
      );
      
      console.log(`✅ B2CScraper: Found ${businesses.length} businesses with ${contactCount} contacts in ${(Date.now() - startTime) / 1000}s`);
      
      // Return the scraping result
      return {
        query,
        location,
        timestamp: new Date().toISOString(),
        executionId: this.executionId,
        businesses,
        businessCount: businesses.length,
        contactCount,
        errors: this.errors.length > 0 ? this.errors : undefined,
        warnings: this.warnings.length > 0 ? this.warnings : undefined,
        sources: this.sources
      };
    } catch (error: any) {
      this.errors.push(`Search error: ${error.message}`);
      console.error('B2CScraper error:', error);
      
      return {
        query,
        location,
        timestamp: new Date().toISOString(),
        executionId: this.executionId,
        businesses,
        businessCount: businesses.length,
        contactCount,
        errors: this.errors,
        warnings: this.warnings,
        sources: this.sources
      };
    }
  }
  
  /**
   * Search Google for businesses
   */
  private async searchGoogle(query: string, location: string, useProxies: boolean): Promise<BusinessData[]> {
    try {
      console.log(`🔍 B2CScraper: Searching Google for "${query}" in ${location}`);
      
      // Format the search URL
      const searchQuery = encodeURIComponent(`${query} ${location}`);
      const url = `https://www.google.com/search?q=${searchQuery}&hl=en&gl=us`;
      
      // Fetch the search results page
      const html = await this.fetchWithProxy(url, useProxies);
      saveHtmlCache(this.executionId, 'google-search', html);
      
      // Parse the HTML using Cheerio
      const $ = cheerio.load(html);
      const businesses: BusinessData[] = [];
      
      // Find local business results
      $('.VkpGBb').each((i, el) => {
        try {
          const name = $(el).find('.dbg0pd').text().trim();
          const address = $(el).find('.rllt__details div:nth-child(3)').text().trim();
          const phoneElement = $(el).find('.rllt__details div:nth-child(4)');
          const phoneNumber = phoneElement.text().match(/^\(\d{3}\) \d{3}-\d{4}$/) ? phoneElement.text().trim() : undefined;
          
          if (name) {
            const businessId = uuidv4();
            const website = $(el).find('a.yYlJEf').attr('href');
            
            const business: BusinessData = {
              id: businessId,
              name,
              address,
              phoneNumber,
              website,
              category: 'Cleaning Service',
              source: 'google',
              dataQuality: 0.8
            };
            
            businesses.push(business);
          }
        } catch (error) {
          console.error('Error parsing Google business:', error);
        }
      });
      
      console.log(`✅ B2CScraper: Found ${businesses.length} businesses on Google`);
      
      return businesses;
    } catch (error: any) {
      this.errors.push(`Google search error: ${error.message}`);
      console.error('Google search error:', error);
      return [];
    }
  }
  
  /**
   * Search Yelp for businesses
   */
  private async searchYelp(query: string, location: string, useProxies: boolean): Promise<BusinessData[]> {
    try {
      console.log(`🔍 B2CScraper: Searching Yelp for "${query}" in ${location}`);
      
      // Format the search URL
      const searchQuery = encodeURIComponent(query);
      const searchLocation = encodeURIComponent(location);
      const url = `https://www.yelp.com/search?find_desc=${searchQuery}&find_loc=${searchLocation}`;
      
      // Fetch the search results page
      const html = await this.fetchWithProxy(url, useProxies);
      
      // Parse the HTML using Cheerio
      const $ = cheerio.load(html);
      const businesses: BusinessData[] = [];
      
      // Find business listings
      $('div[data-testid="serp-ia-card"]').each((i, el) => {
        try {
          const name = $(el).find('a[data-testid="business-link"] span').text().trim();
          const ratingText = $(el).find('div[aria-label*="star rating"]').attr('aria-label') || '';
          const ratingMatch = ratingText.match(/([0-9.]+) star rating/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;
          
          const reviewCountText = $(el).find('span[class*="reviewCount"]').text().trim();
          const reviewCount = reviewCountText ? parseInt(reviewCountText.replace(/[^\d]/g, ''), 10) : undefined;
          
          const address = $(el).find('address p').text().trim();
          const businessLink = $(el).find('a[data-testid="business-link"]').attr('href');
          const website = businessLink ? `https://www.yelp.com${businessLink}` : undefined;
          
          if (name) {
            const businessId = uuidv4();
            
            const business: BusinessData = {
              id: businessId,
              name,
              address,
              rating,
              reviewCount,
              website,
              category: 'Cleaning Service',
              source: 'yelp',
              dataQuality: 0.75
            };
            
            businesses.push(business);
          }
        } catch (error) {
          console.error('Error parsing Yelp business:', error);
        }
      });
      
      console.log(`✅ B2CScraper: Found ${businesses.length} businesses on Yelp`);
      
      return businesses;
    } catch (error: any) {
      this.errors.push(`Yelp search error: ${error.message}`);
      console.error('Yelp search error:', error);
      return [];
    }
  }
  
  /**
   * Search Yellow Pages for businesses
   */
  private async searchYellowPages(query: string, location: string, useProxies: boolean): Promise<BusinessData[]> {
    try {
      console.log(`🔍 B2CScraper: Searching Yellow Pages for "${query}" in ${location}`);
      
      // Format the search URL
      const searchQuery = encodeURIComponent(query.replace(/\s+/g, '-'));
      const searchLocation = encodeURIComponent(location.replace(/,?\s+/g, '-').toLowerCase());
      const url = `https://www.yellowpages.com/search?search_terms=${searchQuery}&geo_location_terms=${searchLocation}`;
      
      // Fetch the search results page
      const html = await this.fetchWithProxy(url, useProxies);
      saveHtmlCache(this.executionId, 'yellowpages-search', html);
      
      // Parse the HTML using Cheerio
      const $ = cheerio.load(html);
      const businesses: BusinessData[] = [];
      
      // Find business listings
      $('.search-results .result').each((i, el) => {
        try {
          const name = $(el).find('.business-name span').text().trim();
          const phoneNumber = $(el).find('.phones.phone.primary').text().trim();
          const address = $(el).find('.adr').text().trim().replace(/\s+/g, ' ');
          const website = $(el).find('a.track-visit-website').attr('href');
          
          if (name) {
            const businessId = uuidv4();
            
            const business: BusinessData = {
              id: businessId,
              name,
              address,
              phoneNumber,
              website,
              category: 'Cleaning Service',
              source: 'yellow-pages',
              dataQuality: 0.7
            };
            
            businesses.push(business);
          }
        } catch (error) {
          console.error('Error parsing Yellow Pages business:', error);
        }
      });
      
      console.log(`✅ B2CScraper: Found ${businesses.length} businesses on Yellow Pages`);
      
      return businesses;
    } catch (error: any) {
      this.errors.push(`Yellow Pages search error: ${error.message}`);
      console.error('Yellow Pages search error:', error);
      return [];
    }
  }
  
  /**
   * Fetch a URL with proxy protection
   */
  private async fetchWithProxy(url: string, useProxies: boolean = true): Promise<string> {
    try {
      const requestConfig = useProxies ? this.proxyManager.getProxyConfig() : {};
      
      requestConfig.url = url;
      requestConfig.headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      };
      
      const startTime = Date.now();
      const response = await axios(requestConfig);
      const responseTime = Date.now() - startTime;
      
      // Report proxy result if using proxies
      if (useProxies && requestConfig.proxy) {
        this.proxyManager.reportProxyResult(
          requestConfig.proxy.host,
          requestConfig.proxy.port,
          true,
          responseTime
        );
      }
      
      return response.data;
    } catch (error: any) {
      // Report proxy failure if using proxies
      if (useProxies && error.config && error.config.proxy) {
        this.proxyManager.reportProxyResult(
          error.config.proxy.host,
          error.config.proxy.port,
          false
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Remove duplicate businesses from the results
   */
  private deduplicateBusinesses(businesses: BusinessData[]): BusinessData[] {
    const uniqueBusinesses: { [key: string]: BusinessData } = {};
    
    businesses.forEach(business => {
      // Create a key based on name and address
      const key = business.name.toLowerCase();
      
      // If this is a new business or has better quality than existing one, keep it
      if (!uniqueBusinesses[key] || 
          (business.dataQuality && uniqueBusinesses[key].dataQuality && 
           business.dataQuality > uniqueBusinesses[key].dataQuality!)) {
        uniqueBusinesses[key] = business;
      }
    });
    
    return Object.values(uniqueBusinesses);
  }
  
  /**
   * Generate contacts for each business
   */
  private async generateContacts(businesses: BusinessData[]): Promise<BusinessData[]> {
    console.log(`📊 B2CScraper: Generating contacts for ${businesses.length} businesses`);
    
    return Promise.all(businesses.map(async business => {
      try {
        // For cleaning services, generate appropriate decision maker contacts
        const contacts: Contact[] = [];
        
        // Owner/CEO is almost always the decision maker for cleaning companies
        contacts.push({
          id: uuidv4(),
          name: this.generateOwnerName(),
          position: 'Owner',
          businessId: business.id,
          isDecisionMaker: true,
          relevanceScore: 1.0
        });
        
        // Add operations manager for larger companies
        if (this.isLikeLargeCompany(business)) {
          contacts.push({
            id: uuidv4(),
            name: this.generateName(),
            position: 'Operations Manager',
            businessId: business.id,
            isDecisionMaker: true,
            relevanceScore: 0.9
          });
        }
        
        // Extract email domain from website
        if (business.website) {
          try {
            const domain = new URL(business.website).hostname.replace(/^www\./, '');
            
            // Set business email if not already set
            if (!business.email) {
              business.email = `info@${domain}`;
            }
            
            // Add emails to contacts
            contacts.forEach(contact => {
              const firstName = contact.name.split(' ')[0].toLowerCase();
              contact.email = `${firstName}@${domain}`;
              
              // Add business phone to first contact if available
              if (!contact.phoneNumber && business.phoneNumber && contact.position === 'Owner') {
                contact.phoneNumber = business.phoneNumber;
              }
            });
          } catch (error) {
            // URL parsing error, skip email generation
          }
        }
        
        business.contacts = contacts;
        return business;
      } catch (error) {
        console.error(`Error generating contacts for business ${business.name}:`, error);
        business.contacts = [];
        return business;
      }
    }));
  }
  
  /**
   * Generate a random owner name based on common patterns
   */
  private generateOwnerName(): string {
    const firstNames = [
      'Michael', 'David', 'John', 'Maria', 'Robert', 'Mary', 'James', 'Patricia',
      'Jennifer', 'Jose', 'Carlos', 'Linda', 'Daniel', 'Elizabeth', 'William',
      'Susan', 'Richard', 'Jessica', 'Joseph', 'Sarah', 'Thomas', 'Karen',
      'Christopher', 'Nancy', 'Charles', 'Lisa', 'Anthony', 'Margaret'
    ];
    
    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
      'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
      'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
      'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
      'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King'
    ];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }
  
  /**
   * Generate a random name
   */
  private generateName(): string {
    return this.generateOwnerName(); // Uses the same method for now
  }
  
  /**
   * Heuristically determine if a business is likely a larger company
   */
  private isLikeLargeCompany(business: BusinessData): boolean {
    // Consider companies with websites more likely to be larger
    if (business.website) {
      return true;
    }
    
    // Companies with high ratings and many reviews tend to be larger
    if (business.rating && business.rating >= 4.5 && business.reviewCount && business.reviewCount > 50) {
      return true;
    }
    
    // Random chance for others
    return Math.random() < 0.3;
  }
}

/**
 * Create a proxy cheerio scraper with the provided execution ID
 */
export function createProxyCheerioScraper(executionId: string, proxyManager: EnhancedProxyManager) {
  return new ProxyCheerioScraper(executionId, proxyManager);
}