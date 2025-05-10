/**
 * Service for scraping publicly available business information from Yellow Pages
 * Only extracts information that businesses have explicitly made public
 */

import { puppeteerWrapper } from './puppeteer-wrapper';
import { BusinessData } from '../models/business-data';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

// Helper interfaces
interface UserAgentInfo {
  userAgent: string;
  name: string;
  version: string | null;
  os: string | null;
  lastUsed: Date;
  successRate: number;
  totalAttempts: number;
}

export class YellowPagesScraper {
  private userAgents: UserAgentInfo[] = [
    {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      name: 'Chrome',
      version: '123.0.0.0',
      os: 'Windows 10',
      lastUsed: new Date(0),
      successRate: 1.0,
      totalAttempts: 0
    },
    {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      name: 'Safari',
      version: '17.0',
      os: 'macOS',
      lastUsed: new Date(0),
      successRate: 1.0,
      totalAttempts: 0
    },
    {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      name: 'Chrome',
      version: '123.0.0.0',
      os: 'Linux',
      lastUsed: new Date(0),
      successRate: 1.0,
      totalAttempts: 0
    },
    {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
      name: 'Firefox',
      version: '124.0',
      os: 'Windows 10',
      lastUsed: new Date(0),
      successRate: 1.0,
      totalAttempts: 0
    },
    {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      name: 'Safari Mobile',
      version: '17.0',
      os: 'iOS',
      lastUsed: new Date(0), 
      successRate: 1.0,
      totalAttempts: 0
    }
  ];
  
  private logsDir = path.join(process.cwd(), 'logs');
  
  constructor() {
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Search for businesses on Yellow Pages and extract publicly available data
   * @param query Search query for finding businesses
   * @param location Optional location for more specific search
   * @param executionId Optional ID for tracking this execution
   * @param executionLog Optional log object for tracking execution details
   */
  async searchBusinesses(
    query: string, 
    location?: string, 
    executionId?: string,
    executionLog?: any
  ): Promise<{ businesses: BusinessData[], totalResults?: number }> {
    const searchQuery = location ? `${query} in ${location}` : query;
    const executionStartTime = Date.now();
    
    // Generate an execution ID if not provided
    if (!executionId) {
      executionId = `search-yp-${Date.now()}-${randomBytes(4).toString('hex')}`;
    }
    
    // Initialize execution log if not provided
    if (!executionLog) {
      executionLog = {
        execution_id: executionId,
        timestamp: new Date().toISOString(),
        query_params: { query, location },
        scraping_attempts: [],
        scraping_results: [],
        error_details: []
      };
    }
    
    console.log(`🔍 YellowPagesScraper: Searching for "${searchQuery}"`);
    
    // Log this attempt
    const attemptLog = {
      source: 'yellowpages',
      timestamp: new Date().toISOString(),
      query: searchQuery,
      method: 'axios',
      status: 'pending'
    };
    
    executionLog.scraping_attempts.push(attemptLog);
    
    try {
      // First try using Axios (faster and less resource-intensive)
      const result = await this.searchWithAxios(query, location, executionId, executionLog);
      attemptLog.status = 'success';
      
      if (result.businesses.length === 0) {
        attemptLog.status = 'empty';
        console.log(`⚠️ YellowPagesScraper: No results found for "${searchQuery}" using Axios`);
        
        // Try fallback method with Puppeteer
        console.log(`🔄 YellowPagesScraper: Trying fallback method with Puppeteer for "${searchQuery}"`);
        const fallbackAttemptLog = {
          source: 'yellowpages',
          timestamp: new Date().toISOString(),
          query: searchQuery,
          method: 'puppeteer-fallback',
          status: 'pending'
        };
        
        executionLog.scraping_attempts.push(fallbackAttemptLog);
        
        try {
          const fallbackResult = await this.searchWithPuppeteer(query, location, executionId, executionLog);
          fallbackAttemptLog.status = fallbackResult.businesses.length > 0 ? 'success' : 'empty';
          executionLog.scraping_results.push({
            source: 'yellowpages-puppeteer',
            timestamp: new Date().toISOString(),
            count: fallbackResult.businesses.length,
            execution_time_ms: Date.now() - executionStartTime,
            first_result: fallbackResult.businesses[0] || null
          });
          
          return fallbackResult;
        } catch (fallbackError) {
          fallbackAttemptLog.status = 'error';
          executionLog.error_details.push({
            source: 'yellowpages-puppeteer',
            timestamp: new Date().toISOString(),
            error: (fallbackError as Error).message,
            stack: (fallbackError as Error).stack
          });
          
          console.error(`❌ YellowPagesScraper Puppeteer fallback error:`, fallbackError);
          
          // If both methods fail, return empty array
          return { businesses: [] };
        }
      }
      
      // Log successful result
      executionLog.scraping_results.push({
        source: 'yellowpages',
        timestamp: new Date().toISOString(),
        count: result.businesses.length,
        execution_time_ms: Date.now() - executionStartTime,
        first_result: result.businesses[0] || null
      });
      
      return result;
    } catch (error) {
      attemptLog.status = 'error';
      executionLog.error_details.push({
        source: 'yellowpages-axios',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      console.error(`❌ YellowPagesScraper Axios error:`, error);
      
      // Try fallback method with Puppeteer
      console.log(`🔄 YellowPagesScraper: Trying fallback method with Puppeteer for "${searchQuery}"`);
      const fallbackAttemptLog = {
        source: 'yellowpages',
        timestamp: new Date().toISOString(),
        query: searchQuery,
        method: 'puppeteer-fallback',
        status: 'pending'
      };
      
      executionLog.scraping_attempts.push(fallbackAttemptLog);
      
      try {
        const fallbackResult = await this.searchWithPuppeteer(query, location, executionId, executionLog);
        fallbackAttemptLog.status = fallbackResult.businesses.length > 0 ? 'success' : 'empty';
        executionLog.scraping_results.push({
          source: 'yellowpages-puppeteer',
          timestamp: new Date().toISOString(),
          count: fallbackResult.businesses.length,
          execution_time_ms: Date.now() - executionStartTime,
          first_result: fallbackResult.businesses[0] || null
        });
        
        return fallbackResult;
      } catch (fallbackError) {
        fallbackAttemptLog.status = 'error';
        executionLog.error_details.push({
          source: 'yellowpages-puppeteer',
          timestamp: new Date().toISOString(),
          error: (fallbackError as Error).message,
          stack: (fallbackError as Error).stack
        });
        
        console.error(`❌ YellowPagesScraper Puppeteer fallback error:`, fallbackError);
        
        // If both methods fail, return empty array
        return { businesses: [] };
      }
    }
  }

  /**
   * Search Yellow Pages using Axios
   */
  private async searchWithAxios(
    query: string,
    location: string | undefined,
    executionId: string,
    executionLog: any
  ): Promise<{ businesses: BusinessData[], totalResults?: number }> {
    // Select a good user agent
    const userAgent = this.selectBestUserAgent();
    
    // Update the user agent's stats
    userAgent.lastUsed = new Date();
    userAgent.totalAttempts++;
    
    try {
      // Format query and location for Yellow Pages URL format
      const formattedQuery = query.replace(/\s+/g, '+');
      let formattedLocation = '';
      if (location) {
        // Extract city and state if possible
        const locationParts = location.split(',').map(part => part.trim());
        if (locationParts.length > 1) {
          // Likely city, state format
          formattedLocation = `${locationParts[0].replace(/\s+/g, '+')},+${locationParts[1].replace(/\s+/g, '+')}`;
        } else {
          formattedLocation = location.replace(/\s+/g, '+');
        }
      }
      
      // Construct URL
      let url = `https://www.yellowpages.com/search?search_terms=${formattedQuery}`;
      if (formattedLocation) {
        url += `&geo_location_terms=${formattedLocation}`;
      }
      
      // Log HTML snapshots to help with debugging
      const snapshotDir = path.join(this.logsDir, 'snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      
      const snapshotPath = path.join(snapshotDir, `yellowpages-axios-${executionId}.html`);
      
      // Make the HTTP request
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        timeout: 30000
      });
      
      // Save HTML snapshot for debugging
      fs.writeFileSync(snapshotPath, response.data);
      
      // Check if we've been blocked
      if (response.data.includes('captcha') || response.data.includes('human verification')) {
        console.warn('⚠️ YellowPagesScraper: Detected anti-scraping measures. Falling back to Puppeteer.');
        userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
        throw new Error('Anti-scraping measures detected');
      }
      
      // Parse HTML
      const $ = cheerio.load(response.data);
      
      const businesses: BusinessData[] = [];
      
      // Extract business listings
      $('.search-results .v-card').each((i, el) => {
        // Business name
        const nameElement = $(el).find('.business-name');
        const name = nameElement.text().trim();
        const ypUrl = nameElement.attr('href') ? `https://www.yellowpages.com${nameElement.attr('href')}` : '';
        
        // Skip if no valid name
        if (!name) return;
        
        // Address
        const addressElement = $(el).find('.street-address');
        const cityElement = $(el).find('.locality');
        const stateElement = $(el).find('.region');
        const zipElement = $(el).find('.postal-code');
        
        let address = addressElement.text().trim();
        const city = cityElement.text().trim();
        const state = stateElement.text().trim();
        const zip = zipElement.text().trim();
        
        if (city && state) {
          address += address ? `, ${city}, ${state}` : `${city}, ${state}`;
          if (zip) {
            address += ` ${zip}`;
          }
        }
        
        // Phone number
        const phoneElement = $(el).find('.phones');
        const phoneNumber = phoneElement.text().trim();
        
        // Website
        const websiteElement = $(el).find('.track-visit-website');
        const website = websiteElement.attr('href') || '';
        
        // Categories/Industry
        const categories: string[] = [];
        $(el).find('.categories a').each((j, catEl) => {
          const category = $(catEl).text().trim();
          if (category) {
            categories.push(category);
          }
        });
        
        // Years in business (helps estimate company size)
        const yearsElement = $(el).find('.years-in-business .count');
        const yearsInBusiness = yearsElement.text().trim();
        
        // Estimate company size based on years in business
        let size = 'Unknown';
        if (yearsInBusiness) {
          const years = parseInt(yearsInBusiness, 10);
          if (!isNaN(years)) {
            if (years < 5) size = '1-10 employees';
            else if (years < 10) size = '10-50 employees';
            else if (years < 20) size = '50-200 employees';
            else size = '200+ employees';
          }
        }
        
        // Add to businesses array
        businesses.push({
          name,
          address,
          phoneNumber,
          website,
          industry: categories.join(', '),
          location: address || (location || ''),
          size,
          contacts: [],
          data_source: 'yellowpages',
          data_source_url: ypUrl,
          extraction_date: new Date().toISOString(),
          yellow_pages_url: ypUrl
        });
      });
      
      // Extract total results count if available
      let totalResults: number | undefined = undefined;
      const resultsCountText = $('.pagination').text();
      const resultsMatch = resultsCountText.match(/of\s+(\d+)/i);
      if (resultsMatch && resultsMatch[1]) {
        totalResults = parseInt(resultsMatch[1], 10);
      }
      
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 1) / userAgent.totalAttempts;
      
      return { businesses, totalResults };
      
    } catch (error) {
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
      
      // Log detailed error for later analysis
      const errorLog = {
        source: 'yellowpages-axios',
        timestamp: new Date().toISOString(),
        user_agent: userAgent.userAgent,
        error: (error as Error).message,
        stack: (error as Error).stack
      };
      
      executionLog.error_details.push(errorLog);
      
      console.error(`❌ YellowPagesScraper Axios error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Search Yellow Pages using Puppeteer as a fallback method
   */
  private async searchWithPuppeteer(
    query: string,
    location: string | undefined,
    executionId: string,
    executionLog: any
  ): Promise<{ businesses: BusinessData[], totalResults?: number }> {
    // Select a good user agent
    const userAgent = this.selectBestUserAgent();
    
    // Update the user agent's stats
    userAgent.lastUsed = new Date();
    userAgent.totalAttempts++;
    
    try {
      // Format query and location for Yellow Pages URL format
      const formattedQuery = query.replace(/\s+/g, '+');
      let formattedLocation = '';
      if (location) {
        // Extract city and state if possible
        const locationParts = location.split(',').map(part => part.trim());
        if (locationParts.length > 1) {
          // Likely city, state format
          formattedLocation = `${locationParts[0].replace(/\s+/g, '+')},+${locationParts[1].replace(/\s+/g, '+')}`;
        } else {
          formattedLocation = location.replace(/\s+/g, '+');
        }
      }
      
      // Construct URL
      let url = `https://www.yellowpages.com/search?search_terms=${formattedQuery}`;
      if (formattedLocation) {
        url += `&geo_location_terms=${formattedLocation}`;
      }
      
      // Log HTML snapshots to help with debugging
      const snapshotDir = path.join(this.logsDir, 'snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      
      const snapshotPath = path.join(snapshotDir, `yellowpages-puppeteer-${executionId}.html`);
      
      // Launch puppeteer with the selected user agent
      const page = await puppeteerWrapper.newPage(userAgent.userAgent);
      
      // Go to Yellow Pages search
      await puppeteerWrapper.bypassProtection(page, url);
      
      // Wait for search results to load
      await page.waitForSelector('.search-results', { timeout: 30000 });
      
      // Save a snapshot of the HTML for debugging
      const html = await page.content();
      fs.writeFileSync(snapshotPath, html);
      
      // Extract business data
      const businesses = await page.evaluate(() => {
        const results: any[] = [];
        
        // Helper function to safely get text content
        const getText = (element: Element | null, selector: string): string => {
          if (!element) return '';
          const el = element.querySelector(selector);
          return el ? el.textContent?.trim() || '' : '';
        };
        
        // Get all business listings
        const listings = document.querySelectorAll('.search-results .v-card');
        
        listings.forEach(listing => {
          // Business name and URL
          const nameElement = listing.querySelector('.business-name');
          if (!nameElement) return; // Skip if no name element (probably not a business)
          
          const name = nameElement.textContent?.trim() || '';
          const href = nameElement.getAttribute('href') || '';
          const ypUrl = href ? `https://www.yellowpages.com${href}` : '';
          
          // Skip if no valid name
          if (!name) return;
          
          // Address
          const addressElement = listing.querySelector('.street-address');
          const cityElement = listing.querySelector('.locality');
          const stateElement = listing.querySelector('.region');
          const zipElement = listing.querySelector('.postal-code');
          
          let address = addressElement ? addressElement.textContent?.trim() || '' : '';
          const city = cityElement ? cityElement.textContent?.trim() || '' : '';
          const state = stateElement ? stateElement.textContent?.trim() || '' : '';
          const zip = zipElement ? zipElement.textContent?.trim() || '' : '';
          
          if (city && state) {
            address += address ? `, ${city}, ${state}` : `${city}, ${state}`;
            if (zip) {
              address += ` ${zip}`;
            }
          }
          
          // Phone number
          const phoneElement = listing.querySelector('.phones');
          const phoneNumber = phoneElement ? phoneElement.textContent?.trim() || '' : '';
          
          // Website
          const websiteElement = listing.querySelector('.track-visit-website');
          const website = websiteElement ? websiteElement.getAttribute('href') || '' : '';
          
          // Categories/Industry
          const categories: string[] = [];
          listing.querySelectorAll('.categories a').forEach(catEl => {
            const category = catEl.textContent?.trim() || '';
            if (category) {
              categories.push(category);
            }
          });
          
          // Years in business (helps estimate company size)
          const yearsElement = listing.querySelector('.years-in-business .count');
          const yearsInBusiness = yearsElement ? yearsElement.textContent?.trim() || '' : '';
          
          // Estimate company size based on years in business
          let size = 'Unknown';
          if (yearsInBusiness) {
            const years = parseInt(yearsInBusiness, 10);
            if (!isNaN(years)) {
              if (years < 5) size = '1-10 employees';
              else if (years < 10) size = '10-50 employees';
              else if (years < 20) size = '50-200 employees';
              else size = '200+ employees';
            }
          }
          
          results.push({
            name,
            address,
            phoneNumber,
            website,
            categories: categories.join(', '),
            size,
            ypUrl
          });
        });
        
        // Try to extract total results count
        let totalResults: number | undefined = undefined;
        const resultsCountText = document.querySelector('.pagination')?.textContent || '';
        const resultsMatch = resultsCountText.match(/of\s+(\d+)/i);
        if (resultsMatch && resultsMatch[1]) {
          totalResults = parseInt(resultsMatch[1], 10);
        }
        
        return { results, totalResults };
      });
      
      // Close the page when done
      await page.close();
      
      // Format and return data
      const formattedBusinesses: BusinessData[] = businesses.results.map((b: any) => ({
        name: b.name,
        address: b.address,
        phoneNumber: b.phoneNumber,
        website: b.website,
        industry: b.categories,
        location: b.address || (location || ''),
        size: b.size,
        contacts: [],
        data_source: 'yellowpages-puppeteer',
        data_source_url: b.ypUrl,
        extraction_date: new Date().toISOString(),
        yellow_pages_url: b.ypUrl
      }));
      
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 1) / userAgent.totalAttempts;
      
      return { businesses: formattedBusinesses, totalResults: businesses.totalResults };
      
    } catch (error) {
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
      
      // Log detailed error for later analysis
      const errorLog = {
        source: 'yellowpages-puppeteer',
        timestamp: new Date().toISOString(),
        user_agent: userAgent.userAgent,
        error: (error as Error).message,
        stack: (error as Error).stack
      };
      
      executionLog.error_details.push(errorLog);
      
      console.error(`❌ YellowPagesScraper Puppeteer error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific business by its Yellow Pages URL
   */
  async getBusinessDetailsByUrl(
    url: string,
    executionId?: string,
    executionLog?: any
  ): Promise<BusinessData | null> {
    if (!executionId) {
      executionId = `detail-yp-${Date.now()}-${randomBytes(4).toString('hex')}`;
    }
    
    if (!executionLog) {
      executionLog = {
        execution_id: executionId,
        timestamp: new Date().toISOString(),
        query_params: { url },
        scraping_attempts: [],
        scraping_results: [],
        error_details: []
      };
    }
    
    console.log(`🔍 YellowPagesScraper: Getting details for "${url}"`);
    
    // Try Axios first then fall back to Puppeteer
    try {
      return await this.getBusinessDetailsByUrlAxios(url, executionId, executionLog);
    } catch (error) {
      console.log(`⚠️ YellowPagesScraper: Axios detail fetch failed, trying Puppeteer fallback for "${url}"`);
      return await this.getBusinessDetailsByUrlPuppeteer(url, executionId, executionLog);
    }
  }

  /**
   * Get detailed business information using Axios
   */
  private async getBusinessDetailsByUrlAxios(
    url: string,
    executionId: string,
    executionLog: any
  ): Promise<BusinessData | null> {
    // Select a good user agent
    const userAgent = this.selectBestUserAgent();
    
    // Update the user agent's stats
    userAgent.lastUsed = new Date();
    userAgent.totalAttempts++;
    
    try {
      // Log HTML snapshots to help with debugging
      const snapshotDir = path.join(this.logsDir, 'snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      
      const snapshotPath = path.join(snapshotDir, `yellowpages-detail-axios-${executionId}.html`);
      
      // Make the HTTP request
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        timeout: 30000
      });
      
      // Save HTML snapshot for debugging
      fs.writeFileSync(snapshotPath, response.data);
      
      // Parse HTML with cheerio
      const $ = cheerio.load(response.data);
      
      // Extract business info
      const name = $('.business-name').text().trim();
      if (!name) {
        throw new Error('Business name not found, possible anti-scraping protection');
      }
      
      // Extract address
      const streetAddress = $('.address .street-address').text().trim();
      const locality = $('.address .locality').text().trim();
      const region = $('.address .region').text().trim();
      const postalCode = $('.address .postal-code').text().trim();
      
      let address = streetAddress;
      if (locality && region) {
        address += address ? `, ${locality}, ${region}` : `${locality}, ${region}`;
        if (postalCode) {
          address += ` ${postalCode}`;
        }
      }
      
      // Extract phone
      const phoneNumber = $('.contact .phone').text().trim();
      
      // Extract website
      const websiteLink = $('.website-link');
      const website = websiteLink.attr('href') || '';
      
      // Extract categories/industry
      const categories: string[] = [];
      $('.categories a').each((i, el) => {
        const category = $(el).text().trim();
        if (category) {
          categories.push(category);
        }
      });
      
      // Extract business details
      const yearsInBusiness = $('.years-in-business .count').text().trim();
      
      // Estimate size based on years in business
      let size = 'Unknown';
      if (yearsInBusiness) {
        const years = parseInt(yearsInBusiness, 10);
        if (!isNaN(years)) {
          if (years < 5) size = '1-10 employees';
          else if (years < 10) size = '10-50 employees';
          else if (years < 20) size = '50-200 employees';
          else size = '200+ employees';
        }
      }
      
      // Extract contacts - look for owner/manager info if available
      const contacts: any[] = this.extractContactsFromYellowPagesHtml($);
      
      // Create business data object
      const business: BusinessData = {
        name,
        address,
        phoneNumber,
        website,
        industry: categories.join(', '),
        location: address,
        size,
        contacts,
        data_source: 'yellowpages-detail',
        data_source_url: url,
        extraction_date: new Date().toISOString(),
        yellow_pages_url: url
      };
      
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 1) / userAgent.totalAttempts;
      
      return business;
    } catch (error) {
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
      
      // Log detailed error for later analysis
      const errorLog = {
        source: 'yellowpages-detail-axios',
        timestamp: new Date().toISOString(),
        user_agent: userAgent.userAgent,
        error: (error as Error).message,
        stack: (error as Error).stack,
        url
      };
      
      executionLog.error_details.push(errorLog);
      
      console.error(`❌ YellowPagesScraper detail axios error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get detailed business information using Puppeteer
   */
  private async getBusinessDetailsByUrlPuppeteer(
    url: string,
    executionId: string,
    executionLog: any
  ): Promise<BusinessData | null> {
    // Select a good user agent
    const userAgent = this.selectBestUserAgent();
    
    // Update the user agent's stats
    userAgent.lastUsed = new Date();
    userAgent.totalAttempts++;
    
    try {
      // Log HTML snapshots to help with debugging
      const snapshotDir = path.join(this.logsDir, 'snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      
      const snapshotPath = path.join(snapshotDir, `yellowpages-detail-puppeteer-${executionId}.html`);
      
      // Launch puppeteer with the selected user agent
      const page = await puppeteerWrapper.newPage(userAgent.userAgent);
      
      // Go to Yellow Pages business page
      await puppeteerWrapper.bypassProtection(page, url);
      
      // Wait for business details to load
      await page.waitForSelector('.business-name', { timeout: 30000 });
      
      // Save a snapshot of the HTML for debugging
      const html = await page.content();
      fs.writeFileSync(snapshotPath, html);
      
      // Extract business data
      const businessData = await page.evaluate(() => {
        // Helper function to safely get text content
        const getText = (selector: string): string => {
          const element = document.querySelector(selector);
          return element ? element.textContent?.trim() || '' : '';
        };
        
        // Extract business name
        const name = getText('.business-name');
        if (!name) {
          return null;
        }
        
        // Extract address
        const streetAddress = getText('.address .street-address');
        const locality = getText('.address .locality');
        const region = getText('.address .region');
        const postalCode = getText('.address .postal-code');
        
        let address = streetAddress;
        if (locality && region) {
          address += address ? `, ${locality}, ${region}` : `${locality}, ${region}`;
          if (postalCode) {
            address += ` ${postalCode}`;
          }
        }
        
        // Extract phone
        const phoneNumber = getText('.contact .phone');
        
        // Extract website
        const websiteLink = document.querySelector('.website-link');
        const website = websiteLink ? websiteLink.getAttribute('href') || '' : '';
        
        // Extract categories/industry
        const categories: string[] = [];
        document.querySelectorAll('.categories a').forEach(el => {
          const category = el.textContent?.trim() || '';
          if (category) {
            categories.push(category);
          }
        });
        
        // Extract business details
        const yearsInBusiness = getText('.years-in-business .count');
        
        // Estimate size based on years in business
        let size = 'Unknown';
        if (yearsInBusiness) {
          const years = parseInt(yearsInBusiness, 10);
          if (!isNaN(years)) {
            if (years < 5) size = '1-10 employees';
            else if (years < 10) size = '10-50 employees';
            else if (years < 20) size = '50-200 employees';
            else size = '200+ employees';
          }
        }
        
        // Extract contacts - look for any mention of people
        const contacts: any[] = [];
        
        // Look for owner/manager info
        document.querySelectorAll('.about-owner, .owner-info').forEach(ownerEl => {
          const ownerName = ownerEl.querySelector('.owner-name')?.textContent?.trim();
          if (ownerName) {
            contacts.push({
              name: ownerName,
              position: 'Owner/Manager',
              isDecisionMaker: true
            });
          }
        });
        
        return {
          name,
          address,
          phoneNumber,
          website,
          categories: categories.join(', '),
          size,
          contacts
        };
      });
      
      // Close the page when done
      await page.close();
      
      if (!businessData) {
        throw new Error('Failed to extract business data from Yellow Pages detail page');
      }
      
      // Format and return data
      const formattedBusiness: BusinessData = {
        name: businessData.name,
        address: businessData.address,
        phoneNumber: businessData.phoneNumber,
        website: businessData.website,
        industry: businessData.categories,
        location: businessData.address,
        size: businessData.size,
        contacts: businessData.contacts.map((c: any) => ({
          name: c.name,
          position: c.position,
          email: '',
          phoneNumber: '',
          isDecisionMaker: c.isDecisionMaker || false
        })),
        data_source: 'yellowpages-detail-puppeteer',
        data_source_url: url,
        extraction_date: new Date().toISOString(),
        yellow_pages_url: url
      };
      
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 1) / userAgent.totalAttempts;
      
      return formattedBusiness;
      
    } catch (error) {
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
      
      // Log detailed error for later analysis
      const errorLog = {
        source: 'yellowpages-detail-puppeteer',
        timestamp: new Date().toISOString(),
        user_agent: userAgent.userAgent,
        error: (error as Error).message,
        stack: (error as Error).stack,
        url
      };
      
      executionLog.error_details.push(errorLog);
      
      console.error(`❌ YellowPagesScraper detail puppeteer error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Extract contact information from Yellow Pages HTML
   */
  private extractContactsFromYellowPagesHtml($: cheerio.CheerioAPI): any[] {
    const contacts: any[] = [];
    
    // Look for owner/manager info
    $('.about-owner, .owner-info').each((i, ownerEl) => {
      const ownerName = $(ownerEl).find('.owner-name').text().trim();
      if (ownerName) {
        contacts.push({
          name: ownerName,
          position: 'Owner/Manager',
          email: '',
          phoneNumber: '',
          isDecisionMaker: true
        });
      }
    });
    
    return contacts;
  }

  /**
   * Select the best user agent for scraping based on success rate and last used date
   */
  private selectBestUserAgent(): UserAgentInfo {
    // Sort user agents by success rate (descending) and last used date (ascending)
    const sortedAgents = [...this.userAgents].sort((a, b) => {
      // Prioritize success rate with a weight of 0.7
      const successRateDiff = (b.successRate - a.successRate) * 0.7;
      
      // Also consider when the agent was last used (prefer ones not used recently)
      const lastUsedDiff = (a.lastUsed.getTime() - b.lastUsed.getTime()) / (1000 * 60 * 60) * 0.3;
      
      return successRateDiff + lastUsedDiff;
    });
    
    // Choose the best agent
    return sortedAgents[0];
  }
}

export const yellowPagesScraper = new YellowPagesScraper();