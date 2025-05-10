/**
 * Service for scraping publicly available business information from Google Maps
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

export class GoogleMapsScraper {
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
   * Search for businesses on Google Maps and extract publicly available data
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
      executionId = `search-${Date.now()}-${randomBytes(4).toString('hex')}`;
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
    
    console.log(`🔍 GoogleMapsScraper: Searching for "${searchQuery}"`);
    
    // Log this attempt
    const attemptLog = {
      source: 'google-maps',
      timestamp: new Date().toISOString(),
      query: searchQuery,
      method: 'puppeteer',
      status: 'pending'
    };
    
    executionLog.scraping_attempts.push(attemptLog);
    
    try {
      // First try using Puppeteer for the best results
      const result = await this.searchWithPuppeteer(searchQuery, executionId, executionLog);
      attemptLog.status = 'success';
      
      if (result.businesses.length === 0) {
        attemptLog.status = 'empty';
        console.log(`⚠️ GoogleMapsScraper: No results found for "${searchQuery}" using Puppeteer`);
        
        // Try fallback method
        console.log(`🔄 GoogleMapsScraper: Trying fallback method for "${searchQuery}"`);
        const fallbackAttemptLog = {
          source: 'google-maps',
          timestamp: new Date().toISOString(),
          query: searchQuery,
          method: 'axios-fallback',
          status: 'pending'
        };
        
        executionLog.scraping_attempts.push(fallbackAttemptLog);
        
        try {
          const fallbackResult = await this.searchWithAxios(searchQuery, executionId, executionLog);
          fallbackAttemptLog.status = fallbackResult.businesses.length > 0 ? 'success' : 'empty';
          executionLog.scraping_results.push({
            source: 'google-maps-fallback',
            timestamp: new Date().toISOString(),
            count: fallbackResult.businesses.length,
            execution_time_ms: Date.now() - executionStartTime,
            first_result: fallbackResult.businesses[0] || null
          });
          
          return fallbackResult;
        } catch (fallbackError) {
          fallbackAttemptLog.status = 'error';
          executionLog.error_details.push({
            source: 'google-maps-fallback',
            timestamp: new Date().toISOString(),
            error: (fallbackError as Error).message,
            stack: (fallbackError as Error).stack
          });
          
          console.error(`❌ GoogleMapsScraper fallback error:`, fallbackError);
          
          // If both methods fail, return empty array
          return { businesses: [] };
        }
      }
      
      // Log successful result
      executionLog.scraping_results.push({
        source: 'google-maps',
        timestamp: new Date().toISOString(),
        count: result.businesses.length,
        execution_time_ms: Date.now() - executionStartTime,
        first_result: result.businesses[0] || null
      });
      
      return result;
    } catch (error) {
      attemptLog.status = 'error';
      executionLog.error_details.push({
        source: 'google-maps',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      console.error(`❌ GoogleMapsScraper error:`, error);
      
      // Try fallback method
      console.log(`🔄 GoogleMapsScraper: Trying fallback method for "${searchQuery}"`);
      const fallbackAttemptLog = {
        source: 'google-maps',
        timestamp: new Date().toISOString(),
        query: searchQuery,
        method: 'axios-fallback',
        status: 'pending'
      };
      
      executionLog.scraping_attempts.push(fallbackAttemptLog);
      
      try {
        const fallbackResult = await this.searchWithAxios(searchQuery, executionId, executionLog);
        fallbackAttemptLog.status = fallbackResult.businesses.length > 0 ? 'success' : 'empty';
        executionLog.scraping_results.push({
          source: 'google-maps-fallback',
          timestamp: new Date().toISOString(),
          count: fallbackResult.businesses.length,
          execution_time_ms: Date.now() - executionStartTime,
          first_result: fallbackResult.businesses[0] || null
        });
        
        return fallbackResult;
      } catch (fallbackError) {
        fallbackAttemptLog.status = 'error';
        executionLog.error_details.push({
          source: 'google-maps-fallback',
          timestamp: new Date().toISOString(),
          error: (fallbackError as Error).message,
          stack: (fallbackError as Error).stack
        });
        
        console.error(`❌ GoogleMapsScraper fallback error:`, fallbackError);
        
        // If both methods fail, return empty array
        return { businesses: [] };
      }
    }
  }

  /**
   * Get detailed information about a specific business on Google Maps
   * @param businessName The name of the business
   * @param location Optional location for more specific search
   */
  async getBusinessDetails(
    businessName: string, 
    location?: string,
    executionId?: string,
    executionLog?: any
  ): Promise<BusinessData | null> {
    console.log(`🔍 GoogleMapsScraper: Getting details for "${businessName}" ${location ? `in ${location}` : ''}`);
    
    try {
      // First search for the business
      const searchResult = await this.searchBusinesses(businessName, location, executionId, executionLog);
      
      if (searchResult.businesses.length === 0) {
        console.log(`⚠️ GoogleMapsScraper: Business "${businessName}" not found`);
        return null;
      }
      
      // Find the most relevant result (usually the first one)
      const business = searchResult.businesses.find(b => 
        this.normalizeString(b.name).includes(this.normalizeString(businessName))
      ) || searchResult.businesses[0];
      
      return business;
      
    } catch (error) {
      console.error(`❌ GoogleMapsScraper error:`, error);
      return null;
    }
  }

  /**
   * Search Google Maps using Puppeteer
   */
  private async searchWithPuppeteer(
    searchQuery: string,
    executionId: string,
    executionLog: any
  ): Promise<{ businesses: BusinessData[], totalResults?: number }> {
    // Select a good user agent
    const userAgent = this.selectBestUserAgent();
    
    // Update the user agent's stats
    userAgent.lastUsed = new Date();
    userAgent.totalAttempts++;
    
    // Log the user agent being used
    console.log(`🔍 GoogleMapsScraper: Using user agent: ${userAgent.name} ${userAgent.version || ''} on ${userAgent.os || ''}`);
    
    try {
      const baseUrl = 'https://www.google.com/maps/search/';
      const searchUrl = baseUrl + encodeURIComponent(searchQuery);
      
      // Log HTML snapshots to help with debugging
      const snapshotDir = path.join(this.logsDir, 'snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      
      const snapshotPath = path.join(snapshotDir, `google-maps-${executionId}.html`);
      
      // Launch puppeteer with the selected user agent
      const page = await puppeteerWrapper.newPage(userAgent.userAgent);
      
      // Go to Google Maps search
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Save a snapshot of the HTML for debugging
      const html = await page.content();
      fs.writeFileSync(snapshotPath, html);
      
      // Wait for search results to load
      await page.waitForSelector('div[role="article"]', { timeout: 15000 });
      
      // Extract business data
      const businesses = await page.evaluate(() => {
        const results: any[] = [];
        const items = document.querySelectorAll('div[role="article"]');
        
        items.forEach(item => {
          try {
            const nameElement = item.querySelector('a[aria-label]');
            const name = nameElement?.textContent?.trim() || '';
            const href = nameElement?.getAttribute('href') || '';
            
            // Extract place_id from the URL if available
            let placeId = null;
            if (href) {
              const match = href.match(/data=.*!1s([^!]+)/);
              if (match && match[1]) {
                placeId = match[1];
              }
            }
            
            // Extract address and other details
            const details = Array.from(item.querySelectorAll('div[role="img"]'));
            let address = '';
            let phoneNumber = '';
            let website = '';
            let category = '';
            
            details.forEach(detail => {
              const text = detail.getAttribute('aria-label') || '';
              if (text.includes('Address:')) {
                address = text.replace('Address:', '').trim();
              } else if (text.includes('Phone:')) {
                phoneNumber = text.replace('Phone:', '').trim();
              } else if (text.includes('Website:')) {
                website = text.replace('Website:', '').trim();
              }
            });
            
            // Try to get the category
            const categoryElem = item.querySelector('div:nth-child(3) > div:nth-child(2) > div');
            if (categoryElem) {
              category = categoryElem.textContent?.trim() || '';
            }
            
            // Parse rating and reviews if available
            const ratingText = item.querySelector('span[role="img"]')?.getAttribute('aria-label') || '';
            let rating = 0;
            let reviewCount = 0;
            
            if (ratingText) {
              const ratingMatch = ratingText.match(/([\d.]+) stars/);
              if (ratingMatch) {
                rating = parseFloat(ratingMatch[1]);
              }
              
              const reviewMatch = ratingText.match(/([\d,]+) reviews/);
              if (reviewMatch) {
                reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''), 10);
              }
            }
            
            results.push({
              name,
              address,
              phoneNumber,
              website,
              category,
              rating,
              reviewCount,
              place_id: placeId
            });
          } catch (error) {
            console.error('Error parsing business data:', error);
          }
        });
        
        return results;
      });
      
      // Format and return data
      const formattedBusinesses: BusinessData[] = businesses.map(business => {
        return {
          name: business.name,
          address: business.address,
          phoneNumber: business.phoneNumber,
          website: business.website || '',
          industry: business.category || '',
          location: business.address, // Use address as location
          size: 'Unknown', // Size information isn't typically available on Google Maps
          contacts: [], // We'll need to extract contacts separately
          place_id: business.place_id,
          data_source: 'google-maps',
          data_source_url: `https://www.google.com/maps/place/?q=place_id:${business.place_id}`,
          extraction_date: new Date().toISOString()
        };
      });
      
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 1) / userAgent.totalAttempts;
      
      return { businesses: formattedBusinesses };
      
    } catch (error) {
      // Update user agent success rate on failure
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
      
      // Log detailed error for later analysis
      const errorLog = {
        source: 'google-maps-puppeteer',
        timestamp: new Date().toISOString(),
        user_agent: userAgent.userAgent,
        error: (error as Error).message,
        stack: (error as Error).stack
      };
      
      executionLog.error_details.push(errorLog);
      
      console.error(`❌ GoogleMapsScraper Puppeteer error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Search Google Maps using Axios (as a fallback method)
   */
  private async searchWithAxios(
    searchQuery: string,
    executionId: string,
    executionLog: any
  ): Promise<{ businesses: BusinessData[], totalResults?: number }> {
    // Select a good user agent
    const userAgent = this.selectBestUserAgent();
    
    // Update the user agent's stats
    userAgent.lastUsed = new Date();
    userAgent.totalAttempts++;
    
    // Log the user agent being used
    console.log(`🔍 GoogleMapsScraper (Axios): Using user agent: ${userAgent.name} ${userAgent.version || ''} on ${userAgent.os || ''}`);
    
    try {
      const baseUrl = 'https://www.google.com/maps/search/';
      const searchUrl = baseUrl + encodeURIComponent(searchQuery);
      
      // Log HTML snapshots to help with debugging
      const snapshotDir = path.join(this.logsDir, 'snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      
      const snapshotPath = path.join(snapshotDir, `google-maps-axios-${executionId}.html`);
      
      // Make the HTTP request with axios
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': userAgent.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'TE': 'trailers'
        },
        timeout: 30000
      });
      
      // Save HTML snapshot for debugging
      fs.writeFileSync(snapshotPath, response.data);
      
      // Parse HTML with cheerio
      const $ = cheerio.load(response.data);
      const businesses: BusinessData[] = [];
      
      // Check if we've been blocked by anti-scraping
      if (response.data.includes('challenge-running') || response.data.includes('captcha') || 
          response.data.includes('detected unusual traffic') || response.data.includes('security check')) {
        console.warn('⚠️ GoogleMapsScraper: Detected anti-scraping measures on Google Maps. Try another method or user agent.');
        
        // Update user agent success rate
        userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
        
        executionLog.error_details.push({
          source: 'google-maps-axios',
          timestamp: new Date().toISOString(),
          error: 'Anti-scraping measures detected',
          user_agent: userAgent.userAgent,
          html_snapshot: snapshotPath
        });
        
        return { businesses: [] };
      }
      
      // Find business listings in the HTML
      // This is a simplified approach and might need adjustments based on the actual HTML structure
      $('div[role="article"], .section-result, .map-place-card').each((i, element) => {
        try {
          const name = $(element).find('h3, .section-result-title, .place-name').first().text().trim();
          const address = $(element).find('.section-result-location, .place-address').text().trim();
          const phoneNumber = $(element).find('[data-tooltip="Copy phone number"]').text().trim();
          
          // Only add if we have a valid name
          if (name) {
            businesses.push({
              name,
              address,
              phoneNumber,
              website: '',
              industry: '',
              location: address,
              size: 'Unknown',
              contacts: [],
              data_source: 'google-maps-fallback',
              data_source_url: searchUrl,
              extraction_date: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('Error parsing business element:', err);
        }
      });
      
      // Update user agent success rate based on results
      const success = businesses.length > 0 ? 1 : 0;
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + success) / userAgent.totalAttempts;
      
      return { businesses };
      
    } catch (error) {
      // Update user agent success rate on failure
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 0) / userAgent.totalAttempts;
      
      // Log detailed error for later analysis
      const errorLog = {
        source: 'google-maps-axios',
        timestamp: new Date().toISOString(),
        user_agent: userAgent.userAgent,
        error: (error as Error).message,
        stack: (error as Error).stack
      };
      
      executionLog.error_details.push(errorLog);
      
      console.error(`❌ GoogleMapsScraper Axios error: ${(error as Error).message}`);
      throw error;
    }
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

export const googleMapsScraper = new GoogleMapsScraper();