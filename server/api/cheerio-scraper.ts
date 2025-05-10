/**
 * Cheerio-based scraper for extracting business data from multiple sources
 * Designed to be more reliable in Replit's environment than Puppeteer-based scrapers
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { BusinessData, Contact } from '../models/business-data';
import { getRandomUserAgent } from './scraper-utils';

interface ScrapeOptions {
  maxRetries?: number;
  timeout?: number;
  logRequests?: boolean;
  executionId?: string;
  executionLog?: any;
}

export class CheerioScraper {
  private logsDir = path.join(process.cwd(), 'logs');
  private htmlCacheDir = path.join(this.logsDir, 'html-cache');
  
  constructor() {
    // Ensure logs directories exist
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    if (!fs.existsSync(this.htmlCacheDir)) {
      fs.mkdirSync(this.htmlCacheDir, { recursive: true });
    }
  }
  
  /**
   * Search for businesses on Google
   */
  async searchGoogleBusinesses(query: string, location?: string, options: ScrapeOptions = {}): Promise<BusinessData[]> {
    const searchQuery = location ? `${query} in ${location}` : query;
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=lcl`;
    
    console.log(`🔍 CheerioScraper: Searching Google for '${searchQuery}'`);
    
    try {
      const html = await this.fetchWithRetry(url, options);
      return this.parseGoogleBusinessResults(html, query, location, options);
    } catch (error) {
      console.error(`❌ CheerioScraper Google error: ${(error as Error).message}`);
      
      // Log this error to the execution log if provided
      if (options.executionLog) {
        options.executionLog.error_details.push({
          source: 'google',
          error: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: new Date().toISOString()
        });
      }
      
      return [];
    }
  }
  
  /**
   * Parse Google search results for local businesses
   */
  private parseGoogleBusinessResults(html: string, query: string, location?: string, options: ScrapeOptions = {}): BusinessData[] {
    const $ = cheerio.load(html);
    const businesses: BusinessData[] = [];
    
    // Save HTML for debugging
    this.saveHtml(html, 'google-search', options.executionId);
    
    // Look for business listings
    const businessCards = $('.rlfl__tls > div');
    console.log(`🔍 CheerioScraper: Found ${businessCards.length} Google business cards`);
    
    businessCards.each((i, el) => {
      try {
        const name = $(el).find('div[role="heading"]').first().text().trim();
        const address = $(el).find('.rllt__details div:nth-child(3)').text().trim();
        const phoneMatch = $(el).find('.rllt__details div:nth-child(4)').text().trim().match(/\(\d{3}\) \d{3}-\d{4}|\d{3}-\d{3}-\d{4}/);
        const phoneNumber = phoneMatch ? phoneMatch[0] : '';
        
        // Find website
        const websiteLink = $(el).find('a[href*="//"]').filter((i, el) => {
          const href = $(el).attr('href');
          return href && !href.includes('google.com') && !href.includes('goo.gl');
        }).first();
        
        const websiteUrl = websiteLink.length ? 
          new URL(websiteLink.attr('href') || '').hostname : '';
        
        // Extract business type/category
        const categoryText = $(el).find('.rllt__details div:nth-child(2)').text().trim();
        
        if (name) {
          const business: BusinessData = {
            name,
            address,
            phoneNumber,
            website: websiteUrl || '',
            industry: query,
            location: location || '',
            size: '', // Not available from Google search
            contacts: [],
            data_source: 'google',
            data_source_url: url,
            extraction_date: new Date().toISOString()
          };
          
          businesses.push(business);
        }
      } catch (error) {
        console.error(`❌ CheerioScraper: Error parsing Google business #${i}:`, error);
      }
    });
    
    return businesses;
  }
  
  /**
   * Search for businesses on Yelp
   */
  async searchYelpBusinesses(query: string, location?: string, options: ScrapeOptions = {}): Promise<BusinessData[]> {
    const searchUrl = location ? 
      `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}&find_loc=${encodeURIComponent(location)}` : 
      `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}`;
    
    console.log(`🔍 CheerioScraper: Searching Yelp for '${query}' ${location ? `in ${location}` : ''}`);
    
    try {
      const html = await this.fetchWithRetry(searchUrl, options);
      return this.parseYelpSearchResults(html, query, location, searchUrl, options);
    } catch (error) {
      console.error(`❌ CheerioScraper Yelp error: ${(error as Error).message}`);
      
      // Log this error to the execution log if provided
      if (options.executionLog) {
        options.executionLog.error_details.push({
          source: 'yelp',
          error: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: new Date().toISOString()
        });
      }
      
      return [];
    }
  }
  
  /**
   * Parse Yelp search results
   */
  private parseYelpSearchResults(html: string, query: string, location?: string, searchUrl?: string, options: ScrapeOptions = {}): BusinessData[] {
    const $ = cheerio.load(html);
    const businesses: BusinessData[] = [];
    
    // Save HTML for debugging
    this.saveHtml(html, 'yelp-search', options.executionId);
    
    // Find business listings - Yelp structure changes frequently, so try multiple selectors
    const businessCards = $('div[data-testid="serp-ia-card"], div[class*="businessName"], .biz-listing-large, .businessresult');
    console.log(`🔍 CheerioScraper: Found ${businessCards.length} Yelp business cards`);
    
    businessCards.each((i, el) => {
      try {
        // Extract data using multiple potential selectors
        const nameElement = $(el).find('a[name], .businessName a, .heading--h3, [data-testid="business-name"]').first();
        const name = nameElement.text().trim();
        const businessUrl = nameElement.attr('href');
        
        // Extract address - try multiple potential selectors
        let address = $(el).find('[data-testid="address"], .secondaryAttributes address, .address').first().text().trim();
        if (!address) {
          address = $(el).find('.secondaryAttributes').text().trim().split('·')[0]?.trim() || '';
        }
        
        // Extract phone
        let phoneNumber = '';
        const phoneText = $(el).find('.phoneNumber, [data-testid="phone-number"]').text().trim();
        const phoneMatch = phoneText.match(/\(\d{3}\) \d{3}-\d{4}|\d{3}-\d{3}-\d{4}/);
        if (phoneMatch) {
          phoneNumber = phoneMatch[0];
        }
        
        if (name) {
          // Normalize URL
          let fullBusinessUrl = '';
          if (businessUrl) {
            fullBusinessUrl = businessUrl.startsWith('http') ? 
              businessUrl : `https://www.yelp.com${businessUrl}`;
          }
          
          const business: BusinessData = {
            name,
            address,
            phoneNumber,
            website: '', // Need to visit business page to get website
            industry: query,
            location: location || '',
            size: '', // Not available from Yelp
            contacts: [],
            data_source: 'yelp',
            data_source_url: searchUrl || '',
            extraction_date: new Date().toISOString(),
            yelp_url: fullBusinessUrl
          };
          
          // Extract rating if available
          const ratingText = $(el).find('.rating, [aria-label*="star rating"]').first().attr('aria-label');
          if (ratingText) {
            const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
            if (ratingMatch) {
              business.google_rating = parseFloat(ratingMatch[0]);
            }
          }
          
          // Extract reviews count if available
          const reviewText = $(el).find('.reviewCount, [data-testid="review-count"]').first().text().trim();
          if (reviewText) {
            const reviewMatch = reviewText.match(/(\d+)/);
            if (reviewMatch) {
              business.review_count = parseInt(reviewMatch[0]);
            }
          }
          
          businesses.push(business);
        }
      } catch (error) {
        console.error(`❌ CheerioScraper: Error parsing Yelp business #${i}:`, error);
      }
    });
    
    return businesses;
  }
  
  /**
   * Search for businesses on Yellow Pages
   */
  async searchYellowPagesBusinesses(query: string, location?: string, options: ScrapeOptions = {}): Promise<BusinessData[]> {
    const searchUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(query)}${location ? `&geo_location_terms=${encodeURIComponent(location)}` : ''}`;
    
    console.log(`🔍 CheerioScraper: Searching Yellow Pages for '${query}' ${location ? `in ${location}` : ''}`);
    
    try {
      const html = await this.fetchWithRetry(searchUrl, options);
      return this.parseYellowPagesResults(html, query, location, searchUrl, options);
    } catch (error) {
      console.error(`❌ CheerioScraper Yellow Pages error: ${(error as Error).message}`);
      
      // Log this error to the execution log if provided
      if (options.executionLog) {
        options.executionLog.error_details.push({
          source: 'yellowpages',
          error: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: new Date().toISOString()
        });
      }
      
      return [];
    }
  }
  
  /**
   * Parse Yellow Pages search results
   */
  private parseYellowPagesResults(html: string, query: string, location?: string, searchUrl?: string, options: ScrapeOptions = {}): BusinessData[] {
    const $ = cheerio.load(html);
    const businesses: BusinessData[] = [];
    
    // Save HTML for debugging
    this.saveHtml(html, 'yellowpages-search', options.executionId);
    
    // Find business listings
    const businessCards = $('.search-results .result, .organic');
    console.log(`🔍 CheerioScraper: Found ${businessCards.length} Yellow Pages business cards`);
    
    businessCards.each((i, el) => {
      try {
        const name = $(el).find('.business-name, h2 a').text().trim();
        const address = $(el).find('.street-address').text().trim() + ' ' + 
                      $(el).find('.locality').text().trim() + ' ' + 
                      $(el).find('.region').text().trim() + ' ' + 
                      $(el).find('.postal-code').text().trim();
        
        // Extract phone
        let phoneNumber = $(el).find('.phones.phone.primary').text().trim();
        if (!phoneNumber) {
          phoneNumber = $(el).find('[class*="phone"]').text().trim();
        }
        
        // Extract website if available
        let website = '';
        const websiteLink = $(el).find('a.track-visit-website');
        if (websiteLink.length > 0) {
          const href = websiteLink.attr('href');
          if (href) {
            // Yellow Pages often uses redirects, so try to extract the real URL if possible
            const urlMatch = href.match(/http[s]?:\/\/[^\/]+/);
            if (urlMatch) {
              website = urlMatch[0];
            }
          }
        }
        
        if (name) {
          const business: BusinessData = {
            name,
            address,
            phoneNumber,
            website,
            industry: query,
            location: location || '',
            size: '', // Not available from Yellow Pages
            contacts: [],
            data_source: 'yellowpages',
            data_source_url: searchUrl || '',
            extraction_date: new Date().toISOString(),
            yellow_pages_url: $(el).find('.business-name, h2 a').attr('href') || ''
          };
          
          // Extract categories
          const categories: string[] = [];
          $(el).find('.categories a').each((i, cat) => {
            categories.push($(cat).text().trim());
          });
          
          if (categories.length > 0) {
            business.types = categories;
          }
          
          // Extract years in business if available
          const yearsText = $(el).find('.years-in-business').text().trim();
          if (yearsText) {
            business.size = yearsText; // Use as size proxy
          }
          
          businesses.push(business);
        }
      } catch (error) {
        console.error(`❌ CheerioScraper: Error parsing Yellow Pages business #${i}:`, error);
      }
    });
    
    return businesses;
  }
  
  /**
   * Fetch a URL with retries and different user agents
   */
  private async fetchWithRetry(url: string, options: ScrapeOptions = {}): Promise<string> {
    const maxRetries = options.maxRetries || 3;
    const timeout = options.timeout || 20000;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Generate a random user agent for each attempt
        const userAgent = getRandomUserAgent();
        
        if (options.logRequests) {
          console.log(`🌐 CheerioScraper: Fetching ${url} (attempt ${attempt + 1}/${maxRetries})`);
          console.log(`🌐 CheerioScraper: Using User-Agent: ${userAgent}`);
        }
        
        // Add to execution log if provided
        if (options.executionLog) {
          options.executionLog.scraping_attempts.push({
            url,
            attempt: attempt + 1,
            timestamp: new Date().toISOString(),
            user_agent: userAgent
          });
        }
        
        // Randomize delay to avoid rate limiting
        const delay = Math.floor(Math.random() * 1000) + 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://www.google.com/'
          },
          timeout: timeout,
          maxRedirects: 5
        });
        
        if (response.status === 200) {
          return response.data;
        } else {
          throw new Error(`Server responded with status code ${response.status}`);
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ CheerioScraper: Error on attempt ${attempt + 1}/${maxRetries}:`, error);
        
        // Wait before retrying
        const retryDelay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
  }
  
  /**
   * Save HTML to a file for debugging
   */
  private saveHtml(html: string, prefix: string, executionId?: string): string {
    const filename = `${prefix}-${executionId || Date.now()}.html`;
    const filepath = path.join(this.htmlCacheDir, filename);
    
    try {
      fs.writeFileSync(filepath, html);
      return filepath;
    } catch (error) {
      console.error(`❌ CheerioScraper: Error saving HTML to ${filepath}:`, error);
      return '';
    }
  }
  
  /**
   * Health check to verify the scraper is working correctly
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error', details: any }> {
    try {
      // Try a simple Google search
      const testResults = await this.searchGoogleBusinesses('restaurant', 'new york', { maxRetries: 1, timeout: 10000 });
      
      return {
        status: testResults.length > 0 ? 'ok' : 'error',
        details: {
          timestamp: new Date().toISOString(),
          google_test: {
            success: testResults.length > 0,
            results_count: testResults.length
          }
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          timestamp: new Date().toISOString(),
          error: (error as Error).message,
          stack: (error as Error).stack
        }
      };
    }
  }
}

export const cheerioScraper = new CheerioScraper();