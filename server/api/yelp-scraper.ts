/**
 * Service for scraping publicly available business information from Yelp
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

export class YelpScraper {
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
   * Search for businesses on Yelp and extract publicly available data
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
      executionId = `search-yelp-${Date.now()}-${randomBytes(4).toString('hex')}`;
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
    
    console.log(`🔍 YelpScraper: Searching for "${searchQuery}"`);
    
    // Log this attempt
    const attemptLog = {
      source: 'yelp',
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
        console.log(`⚠️ YelpScraper: No results found for "${searchQuery}" using Axios`);
        
        // Try fallback method with Puppeteer
        console.log(`🔄 YelpScraper: Trying fallback method with Puppeteer for "${searchQuery}"`);
        const fallbackAttemptLog = {
          source: 'yelp',
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
            source: 'yelp-puppeteer',
            timestamp: new Date().toISOString(),
            count: fallbackResult.businesses.length,
            execution_time_ms: Date.now() - executionStartTime,
            first_result: fallbackResult.businesses[0] || null
          });
          
          return fallbackResult;
        } catch (fallbackError) {
          fallbackAttemptLog.status = 'error';
          executionLog.error_details.push({
            source: 'yelp-puppeteer',
            timestamp: new Date().toISOString(),
            error: (fallbackError as Error).message,
            stack: (fallbackError as Error).stack
          });
          
          console.error(`❌ YelpScraper Puppeteer fallback error:`, fallbackError);
          
          // If both methods fail, return empty array
          return { businesses: [] };
        }
      }
      
      // Log successful result
      executionLog.scraping_results.push({
        source: 'yelp',
        timestamp: new Date().toISOString(),
        count: result.businesses.length,
        execution_time_ms: Date.now() - executionStartTime,
        first_result: result.businesses[0] || null
      });
      
      return result;
    } catch (error) {
      attemptLog.status = 'error';
      executionLog.error_details.push({
        source: 'yelp-axios',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      console.error(`❌ YelpScraper Axios error:`, error);
      
      // Try fallback method with Puppeteer
      console.log(`🔄 YelpScraper: Trying fallback method with Puppeteer for "${searchQuery}"`);
      const fallbackAttemptLog = {
        source: 'yelp',
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
          source: 'yelp-puppeteer',
          timestamp: new Date().toISOString(),
          count: fallbackResult.businesses.length,
          execution_time_ms: Date.now() - executionStartTime,
          first_result: fallbackResult.businesses[0] || null
        });
        
        return fallbackResult;
      } catch (fallbackError) {
        fallbackAttemptLog.status = 'error';
        executionLog.error_details.push({
          source: 'yelp-puppeteer',
          timestamp: new Date().toISOString(),
          error: (fallbackError as Error).message,
          stack: (fallbackError as Error).stack
        });
        
        console.error(`❌ YelpScraper Puppeteer fallback error:`, fallbackError);
        
        // If both methods fail, return empty array
        return { businesses: [] };
      }
    }
  }

  /**
   * Get detailed information about a specific business on Yelp
   * @param businessName The name of the business
   * @param location Optional location for more specific search
   */
  async getBusinessDetails(
    businessName: string, 
    location?: string,
    executionId?: string,
    executionLog?: any
  ): Promise<BusinessData | null> {
    console.log(`🔍 YelpScraper: Getting details for "${businessName}" ${location ? `in ${location}` : ''}`);
    
    try {
      // First search for the business
      const searchResult = await this.searchBusinesses(businessName, location, executionId, executionLog);
      
      if (searchResult.businesses.length === 0) {
        console.log(`⚠️ YelpScraper: Business "${businessName}" not found`);
        return null;
      }
      
      // Find the most relevant result (usually the first one)
      const business = searchResult.businesses.find(b => 
        this.normalizeString(b.name).includes(this.normalizeString(businessName))
      ) || searchResult.businesses[0];
      
      // If we have a Yelp URL, try to get more detailed information
      if (business.yelp_url) {
        try {
          const detailedBusiness = await this.getBusinessDetailsByUrl(business.yelp_url, executionId, executionLog);
          if (detailedBusiness) {
            return {
              ...business,
              ...detailedBusiness,
              contacts: [...(business.contacts || []), ...(detailedBusiness.contacts || [])]
            };
          }
        } catch (detailError) {
          console.error(`❌ YelpScraper detail error:`, detailError);
          // Continue with the basic business info if detailed fetch fails
        }
      }
      
      return business;
      
    } catch (error) {
      console.error(`❌ YelpScraper error:`, error);
      return null;
    }
  }

  /**
   * Get detailed information about a business from its Yelp URL
   */
  private async getBusinessDetailsByUrl(
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
      
      const snapshotPath = path.join(snapshotDir, `yelp-details-${executionId}.html`);
      
      // Make the HTTP request with axios
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
      
      const business: BusinessData = {
        name: $('h1').text().trim(),
        address: this.getYelpAddress($),
        phoneNumber: this.getYelpPhoneNumber($),
        website: this.getYelpWebsite($),
        industry: this.getYelpCategories($).join(', '),
        location: this.getYelpAddress($),
        size: 'Unknown',
        contacts: this.getYelpContactsFromPage($),
        data_source: 'yelp-details',
        data_source_url: url,
        extraction_date: new Date().toISOString(),
        yelp_url: url,
        google_rating: this.getYelpRating($),
        review_count: this.getYelpReviewCount($)
      };
      
      // Update user agent success rate based on results
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 1) / userAgent.totalAttempts;
      
      return business;
      
    } catch (error) {
      // Update user agent success rate on failure
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
      
      // Try with Puppeteer as fallback
      try {
        return await this.getBusinessDetailsByUrlWithPuppeteer(url, executionId, executionLog);
      } catch (puppeteerError) {
        console.error(`❌ YelpScraper both Axios and Puppeteer detail fetch error:`, puppeteerError);
        return null;
      }
    }
  }

  /**
   * Get detailed information about a business from its Yelp URL using Puppeteer
   */
  private async getBusinessDetailsByUrlWithPuppeteer(
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
      
      const snapshotPath = path.join(snapshotDir, `yelp-details-puppeteer-${executionId}.html`);
      
      // Launch puppeteer with the selected user agent
      const page = await puppeteerWrapper.newPage(userAgent.userAgent);
      
      // Go to Yelp business page
      await puppeteerWrapper.bypassProtection(page, url);
      
      // Save a snapshot of the HTML for debugging
      const html = await page.content();
      fs.writeFileSync(snapshotPath, html);
      
      // Extract business data
      const business = await page.evaluate(() => {
        // Helper function to safely query text content
        const getText = (selector: string) => {
          const element = document.querySelector(selector);
          return element ? element.textContent?.trim() : '';
        };
        
        // Get the business name
        const name = getText('h1');
        
        // Get address
        const addressElement = document.querySelector('[href^="https://maps.google.com"]');
        const address = addressElement ? addressElement.textContent?.trim() : '';
        
        // Get phone number
        const phoneLink = document.querySelector('a[href^="tel:"]');
        const phoneNumber = phoneLink ? phoneLink.textContent?.trim() : '';
        
        // Get website
        const websiteLink = document.querySelector('a[href^="https://www.yelp.com/biz_redir"]');
        const website = websiteLink ? websiteLink.getAttribute('href') || '' : '';
        
        // Get categories
        const categories: string[] = [];
        document.querySelectorAll('a[href^="/search?cflt="]').forEach(el => {
          const category = el.textContent?.trim();
          if (category) {
            categories.push(category);
          }
        });
        
        // Get rating
        const ratingText = getText('div[aria-label*="star rating"]');
        const ratingMatch = ratingText.match(/([\d.]+)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
        
        // Get review count
        const reviewText = getText('a[href$="?sort_by=date_desc"]');
        const reviewMatch = reviewText.match(/(\d+)/);
        const reviewCount = reviewMatch ? parseInt(reviewMatch[1], 10) : 0;
        
        // Try to find staff/contact names
        const contacts: any[] = [];
        document.querySelectorAll('.user-passport-info').forEach(el => {
          const name = getText('.user-passport-info .user-display-name');
          const title = getText('.user-passport-info .user-title');
          
          if (name) {
            contacts.push({
              name,
              position: title || 'Staff',
              isDecisionMaker: title ? title.toLowerCase().includes('owner') || title.toLowerCase().includes('manager') : false
            });
          }
        });
        
        return {
          name,
          address,
          phoneNumber,
          website,
          categories: categories.join(', '),
          rating,
          reviewCount,
          contacts
        };
      });
      
      // Format and return data
      const formattedBusiness: BusinessData = {
        name: business.name,
        address: business.address,
        phoneNumber: business.phoneNumber,
        website: business.website,
        industry: business.categories,
        location: business.address,
        size: 'Unknown',
        contacts: business.contacts.map((c: any) => ({
          name: c.name,
          position: c.position,
          email: '',
          phoneNumber: '',
          isDecisionMaker: c.isDecisionMaker
        })),
        data_source: 'yelp-details-puppeteer',
        data_source_url: url,
        extraction_date: new Date().toISOString(),
        yelp_url: url,
        google_rating: business.rating,
        review_count: business.reviewCount
      };
      
      // Close the page when done
      await page.close();
      
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 1) / userAgent.totalAttempts;
      
      return formattedBusiness;
      
    } catch (error) {
      // Update user agent success rate on failure
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
      
      // Log detailed error for later analysis
      const errorLog = {
        source: 'yelp-details-puppeteer',
        timestamp: new Date().toISOString(),
        user_agent: userAgent.userAgent,
        error: (error as Error).message,
        stack: (error as Error).stack,
        url
      };
      
      executionLog.error_details.push(errorLog);
      
      console.error(`❌ YelpScraper Puppeteer details error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Search Yelp using Axios
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
      // Construct URL
      let url = 'https://www.yelp.com/search?find_desc=' + encodeURIComponent(query);
      if (location) {
        url += '&find_loc=' + encodeURIComponent(location);
      }
      
      // Log HTML snapshots to help with debugging
      const snapshotDir = path.join(this.logsDir, 'snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      
      const snapshotPath = path.join(snapshotDir, `yelp-axios-${executionId}.html`);
      
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
        console.warn('⚠️ YelpScraper: Detected anti-scraping measures on Yelp. Falling back to Puppeteer.');
        userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
        throw new Error('Anti-scraping measures detected');
      }
      
      // Parse HTML
      const $ = cheerio.load(response.data);
      
      const businesses: BusinessData[] = [];
      
      // Extract business listings
      $('div[data-testid="serp-content"] ul li').each((i, el) => {
        // Business name
        const nameElement = $(el).find('a[data-testid="business-link"]');
        const name = nameElement.text().trim();
        const yelpUrl = nameElement.attr('href') ? `https://www.yelp.com${nameElement.attr('href')}` : '';
        
        // Skip ads or non-business elements
        if (!name || !yelpUrl) return;
        
        // Rating
        const ratingText = $(el).find('div[aria-label*="star rating"]').attr('aria-label') || '';
        const ratingMatch = ratingText.match(/([\d.]+) star rating/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
        
        // Review count
        const reviewText = $(el).find('a[href*="reviews"]').text();
        const reviewMatch = reviewText.match(/(\d+)/);
        const reviewCount = reviewMatch ? parseInt(reviewMatch[1], 10) : 0;
        
        // Categories
        const categories: string[] = [];
        $(el).find('a[href^="/search?cflt="]').each((j, catEl) => {
          const category = $(catEl).text().trim();
          if (category) {
            categories.push(category);
          }
        });
        
        // Address
        const address = $(el).find('[data-testid="business-address-container"]').text().trim();
        
        // Phone number (typically not available in search results)
        const phoneNumber = '';
        
        // Website (typically not available in search results)
        const website = '';
        
        // Add to businesses array
        businesses.push({
          name,
          address,
          phoneNumber,
          website,
          industry: categories.join(', '),
          location: address || (location || ''),
          size: 'Unknown',
          contacts: [],
          data_source: 'yelp',
          data_source_url: yelpUrl,
          extraction_date: new Date().toISOString(),
          yelp_url: yelpUrl,
          google_rating: rating,
          review_count: reviewCount
        });
      });
      
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 1) / userAgent.totalAttempts;
      
      return { businesses };
      
    } catch (error) {
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
      
      // Log detailed error for later analysis
      const errorLog = {
        source: 'yelp-axios',
        timestamp: new Date().toISOString(),
        user_agent: userAgent.userAgent,
        error: (error as Error).message,
        stack: (error as Error).stack
      };
      
      executionLog.error_details.push(errorLog);
      
      console.error(`❌ YelpScraper Axios error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Search Yelp using Puppeteer as a fallback method
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
      // Construct URL
      let url = 'https://www.yelp.com/search?find_desc=' + encodeURIComponent(query);
      if (location) {
        url += '&find_loc=' + encodeURIComponent(location);
      }
      
      // Log HTML snapshots to help with debugging
      const snapshotDir = path.join(this.logsDir, 'snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      
      const snapshotPath = path.join(snapshotDir, `yelp-puppeteer-${executionId}.html`);
      
      // Launch puppeteer with the selected user agent
      const page = await puppeteerWrapper.newPage(userAgent.userAgent);
      
      // Go to Yelp search
      await puppeteerWrapper.bypassProtection(page, url);
      
      // Wait for search results to load
      await page.waitForSelector('div[data-testid="serp-content"]', { timeout: 30000 });
      
      // Save a snapshot of the HTML for debugging
      const html = await page.content();
      fs.writeFileSync(snapshotPath, html);
      
      // Extract business data
      const businesses = await page.evaluate(() => {
        const results: any[] = [];
        
        // Helper function to safely get text content
        const getText = (element: Element, selector: string): string => {
          const el = element.querySelector(selector);
          return el ? el.textContent?.trim() || '' : '';
        };
        
        // Get all business listings
        const listings = document.querySelectorAll('div[data-testid="serp-content"] ul li');
        
        listings.forEach(listing => {
          // Business name and URL
          const nameElement = listing.querySelector('a[data-testid="business-link"]');
          if (!nameElement) return; // Skip if no name element (probably not a business)
          
          const name = nameElement.textContent?.trim() || '';
          const href = nameElement.getAttribute('href') || '';
          const yelpUrl = href ? `https://www.yelp.com${href}` : '';
          
          // Skip ads or non-business elements
          if (!name || !yelpUrl) return;
          
          // Rating
          const ratingElement = listing.querySelector('div[aria-label*="star rating"]');
          const ratingText = ratingElement ? ratingElement.getAttribute('aria-label') || '' : '';
          const ratingMatch = ratingText.match(/([\d.]+) star rating/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
          
          // Review count
          const reviewElement = listing.querySelector('a[href*="reviews"]');
          const reviewText = reviewElement ? reviewElement.textContent?.trim() || '' : '';
          const reviewMatch = reviewText.match(/(\d+)/);
          const reviewCount = reviewMatch ? parseInt(reviewMatch[1], 10) : 0;
          
          // Categories
          const categories: string[] = [];
          listing.querySelectorAll('a[href^="/search?cflt="]').forEach(catEl => {
            const category = catEl.textContent?.trim() || '';
            if (category) {
              categories.push(category);
            }
          });
          
          // Address
          const address = getText(listing, '[data-testid="business-address-container"]');
          
          results.push({
            name,
            address,
            yelpUrl,
            rating,
            reviewCount,
            categories: categories.join(', ')
          });
        });
        
        return results;
      });
      
      // Close the page when done
      await page.close();
      
      // Format and return data
      const formattedBusinesses: BusinessData[] = businesses.map(b => ({
        name: b.name,
        address: b.address,
        phoneNumber: '',
        website: '',
        industry: b.categories,
        location: b.address || (location || ''),
        size: 'Unknown',
        contacts: [],
        data_source: 'yelp-puppeteer',
        data_source_url: b.yelpUrl,
        extraction_date: new Date().toISOString(),
        yelp_url: b.yelpUrl,
        google_rating: b.rating,
        review_count: b.reviewCount
      }));
      
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 1) / userAgent.totalAttempts;
      
      return { businesses: formattedBusinesses };
      
    } catch (error) {
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
      
      // Log detailed error for later analysis
      const errorLog = {
        source: 'yelp-puppeteer',
        timestamp: new Date().toISOString(),
        user_agent: userAgent.userAgent,
        error: (error as Error).message,
        stack: (error as Error).stack
      };
      
      executionLog.error_details.push(errorLog);
      
      console.error(`❌ YelpScraper Puppeteer error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Extract address from Yelp business page
   */
  private getYelpAddress($: cheerio.CheerioAPI): string {
    // Try different ways Yelp might structure the address
    const addressElement = $('[href^="https://maps.google.com"]').first();
    if (addressElement.length) {
      return addressElement.text().trim();
    }
    
    // Try another common pattern
    const addressContainer = $('[data-testid="bizDetailsHeader"] address').first();
    if (addressContainer.length) {
      return addressContainer.text().trim();
    }
    
    return '';
  }

  /**
   * Extract phone number from Yelp business page
   */
  private getYelpPhoneNumber($: cheerio.CheerioAPI): string {
    // Look for phone links
    const phoneLink = $('a[href^="tel:"]').first();
    if (phoneLink.length) {
      return phoneLink.text().trim();
    }
    
    return '';
  }

  /**
   * Extract website URL from Yelp business page
   */
  private getYelpWebsite($: cheerio.CheerioAPI): string {
    // Yelp redirects external websites, so look for the redirect link
    const websiteLink = $('a[href^="https://www.yelp.com/biz_redir"]').first();
    if (websiteLink.length) {
      return websiteLink.attr('href') || '';
    }
    
    return '';
  }

  /**
   * Extract categories from Yelp business page
   */
  private getYelpCategories($: cheerio.CheerioAPI): string[] {
    const categories: string[] = [];
    
    $('a[href^="/search?cflt="]').each((i, el) => {
      const category = $(el).text().trim();
      if (category) {
        categories.push(category);
      }
    });
    
    return categories;
  }

  /**
   * Extract rating from Yelp business page
   */
  private getYelpRating($: cheerio.CheerioAPI): number {
    const ratingElement = $('div[aria-label*="star rating"]').first();
    if (ratingElement.length) {
      const ariaLabel = ratingElement.attr('aria-label') || '';
      const match = ariaLabel.match(/([\d.]+) star rating/);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    
    return 0;
  }

  /**
   * Extract review count from Yelp business page
   */
  private getYelpReviewCount($: cheerio.CheerioAPI): number {
    const reviewElement = $('a[href$="?sort_by=date_desc"]').first();
    if (reviewElement.length) {
      const text = reviewElement.text();
      const match = text.match(/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    return 0;
  }

  /**
   * Extract contacts from Yelp business page
   */
  private getYelpContactsFromPage($: cheerio.CheerioAPI): any[] {
    const contacts: any[] = [];
    
    // Look for owner/manager profiles
    $('.user-passport-info').each((i, el) => {
      const name = $(el).find('.user-display-name').text().trim();
      const title = $(el).find('.user-title').text().trim();
      
      if (name) {
        contacts.push({
          name,
          position: title || 'Staff',
          email: '',
          phoneNumber: '',
          isDecisionMaker: title ? 
            title.toLowerCase().includes('owner') || 
            title.toLowerCase().includes('manager') ||
            title.toLowerCase().includes('director') : 
            false
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

  /**
   * Helper function to normalize strings for comparison
   */
  private normalizeString(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}

export const yelpScraper = new YelpScraper();