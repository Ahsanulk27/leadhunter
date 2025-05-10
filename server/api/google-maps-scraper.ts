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
      executionId = `search-gmaps-${Date.now()}-${randomBytes(4).toString('hex')}`;
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
    
    // Puppeteer is the primary method for Google Maps, as their API requires billing
    
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
      // Launch puppeteer and search Google Maps
      const result = await this.searchWithPuppeteer(query, location, executionId, executionLog);
      attemptLog.status = 'success';
      
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
      
      // Return empty businesses array on error
      return { businesses: [] };
    }
  }

  /**
   * Search Google Maps using Puppeteer
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
      // Format the search query for Google Maps
      const searchQuery = location ? `${query} ${location}` : query;
      
      // Construct the Google Maps URL 
      const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      
      // Log HTML snapshots to help with debugging
      const snapshotDir = path.join(this.logsDir, 'snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      
      // Launch puppeteer with the selected user agent
      const page = await puppeteerWrapper.newPage(userAgent.userAgent);
      
      // Go to Google Maps search
      console.log(`🌐 GoogleMapsScraper: Navigating to ${url}`);
      await puppeteerWrapper.bypassProtection(page, url);
      
      // Wait for search results to load - look for business listings
      const businessListingSelector = 'div[role="feed"] > div';
      await page.waitForSelector(businessListingSelector, { timeout: 30000 });
      
      // Give results time to fully load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take a screenshot for debugging
      const screenshotPath = path.join(snapshotDir, `gmaps-screenshot-${executionId}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Save HTML snapshot for debugging
      const html = await page.content();
      const snapshotPath = path.join(snapshotDir, `gmaps-html-${executionId}.html`);
      fs.writeFileSync(snapshotPath, html);
      
      // Scroll to load more results
      console.log(`🌐 GoogleMapsScraper: Scrolling to load more results`);
      await this.scrollToLoadMore(page, 3); // Scroll 3 times to load more results
      
      // Extract business data
      console.log(`🌐 GoogleMapsScraper: Extracting business data from results`);
      const businesses = await page.evaluate(() => {
        const results: any[] = [];
        
        // Find all business listings
        const businessListings = document.querySelectorAll('div[role="feed"] > div');
        
        // Process each listing
        businessListings.forEach(listing => {
          try {
            // Get business name
            const nameEl = listing.querySelector('a[aria-label]');
            if (!nameEl) return; // Skip if no name element (probably not a business listing)
            
            const name = nameEl.textContent?.trim() || '';
            const googleUrl = nameEl.getAttribute('href') || '';
            if (!name || !googleUrl) return; // Skip if missing critical information
            
            // Get address
            const addressEl = listing.querySelector('.fontBodyMedium [aria-label] span');
            const address = addressEl?.textContent?.trim() || '';
            
            // Get rating
            const ratingText = listing.querySelector('span[aria-label]');
            const ratingMatch = ratingText?.getAttribute('aria-label')?.match(/([\d.]+) stars/);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
            
            // Get business type/category
            const typeEl = listing.querySelector('.fontBodyMedium span:nth-child(1)');
            const businessType = typeEl?.textContent?.trim() || '';
            
            // Get review count
            const reviewContainer = listing.querySelector('.fontBodyMedium:nth-child(2)');
            const reviewText = reviewContainer?.textContent || '';
            const reviewMatch = reviewText.match(/(\d+)/);
            const reviewCount = reviewMatch ? parseInt(reviewMatch[1], 10) : 0;
            
            // Add to results
            results.push({
              name,
              address,
              googleUrl,
              rating,
              businessType,
              reviewCount
            });
          } catch (e) {
            // Skip any listing that causes errors during extraction
            console.error("Error extracting business listing:", e);
          }
        });
        
        return results;
      });
      
      // Close the page when done
      await page.close();
      
      console.log(`🌐 GoogleMapsScraper: Extracted ${businesses.length} businesses`);
      
      // Format the data
      const formattedBusinesses: BusinessData[] = businesses.map(b => ({
        name: b.name,
        address: b.address,
        phoneNumber: '', // Not directly available from search results
        website: '', // Not directly available from search results
        industry: b.businessType,
        location: b.address || (location || ''),
        size: 'Unknown',
        contacts: [],
        data_source: 'google-maps',
        data_source_url: b.googleUrl,
        extraction_date: new Date().toISOString(),
        place_id: this.extractPlaceIdFromUrl(b.googleUrl),
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
        source: 'google-maps-puppeteer',
        timestamp: new Date().toISOString(),
        user_agent: userAgent.userAgent,
        error: (error as Error).message,
        stack: (error as Error).stack
      };
      
      executionLog.error_details.push(errorLog);
      
      console.error(`❌ GoogleMapsScraper error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Scroll down to load more results in Google Maps
   */
  private async scrollToLoadMore(page: any, times: number = 3): Promise<void> {
    const resultsContainerSelector = 'div[role="feed"]';
    
    for (let i = 0; i < times; i++) {
      await page.evaluate((selector: string) => {
        const container = document.querySelector(selector);
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, resultsContainerSelector);
      
      // Wait for new results to load
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * Extract Google Place ID from URL
   */
  private extractPlaceIdFromUrl(url: string): string {
    try {
      const match = url.match(/places?\/([^\/]+)/);
      return match ? match[1] : '';
    } catch (e) {
      return '';
    }
  }

  /**
   * Get detailed information about a specific business by Place ID
   */
  async getBusinessDetailsByPlaceId(
    placeId: string,
    executionId?: string,
    executionLog?: any
  ): Promise<BusinessData | null> {
    if (!executionId) {
      executionId = `detail-gmaps-${Date.now()}-${randomBytes(4).toString('hex')}`;
    }
    
    if (!executionLog) {
      executionLog = {
        execution_id: executionId,
        timestamp: new Date().toISOString(),
        query_params: { placeId },
        scraping_attempts: [],
        scraping_results: [],
        error_details: []
      };
    }
    
    console.log(`🔍 GoogleMapsScraper: Getting details for place ID "${placeId}"`);
    
    try {
      // Construct URL for the specific place
      const url = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
      
      // Select a good user agent
      const userAgent = this.selectBestUserAgent();
      
      // Update the user agent's stats
      userAgent.lastUsed = new Date();
      userAgent.totalAttempts++;
      
      // Launch puppeteer with the selected user agent
      const page = await puppeteerWrapper.newPage(userAgent.userAgent);
      
      // Go to Google Maps place page
      await puppeteerWrapper.bypassProtection(page, url);
      
      // Wait for place details to load
      await page.waitForSelector('h1', { timeout: 30000 });
      
      // Take a screenshot for debugging
      const screenshotPath = path.join(this.logsDir, `gmaps-detail-${executionId}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Extract business data
      const business = await page.evaluate(() => {
        // Helper function to safely get text content
        const getText = (selector: string): string => {
          const element = document.querySelector(selector);
          return element ? element.textContent?.trim() || '' : '';
        };
        
        // Get business name
        const name = getText('h1');
        
        // Get address, phone, website
        let address = '';
        let phoneNumber = '';
        let website = '';
        
        // Find contact details
        const buttons = document.querySelectorAll('button[data-item-id]');
        buttons.forEach(button => {
          const dataItemId = button.getAttribute('data-item-id');
          const text = button.textContent || '';
          
          if (dataItemId === 'address') {
            address = text.trim();
          } else if (dataItemId === 'phone') {
            phoneNumber = text.trim();
          } else if (dataItemId === 'authority') {
            website = button.getAttribute('aria-label') || '';
            if (website.includes('Visit')) {
              website = website.replace('Visit', '').trim();
            }
          }
        });
        
        // Get categories/industry
        const categories: string[] = [];
        document.querySelectorAll('button[jsaction="pane.rating.category"]').forEach(el => {
          const category = el.textContent?.trim();
          if (category) {
            categories.push(category);
          }
        });
        
        // Get rating
        const ratingText = getText('div[role="img"][aria-label*="stars"]');
        const ratingMatch = ratingText ? ratingText.match(/([\d.]+) stars/) : null;
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
        
        // Get review count
        const reviewText = getText('button[jsaction*="pane.rating.moreReviews"]');
        const reviewMatch = reviewText ? reviewText.match(/(\d+)/) : null;
        const reviewCount = reviewMatch ? parseInt(reviewMatch[1], 10) : 0;
        
        // Extract business hours if available
        const hours: string[] = [];
        document.querySelectorAll('div[aria-label^="Hours"] tr').forEach(row => {
          const day = row.querySelector('th')?.textContent?.trim();
          const time = row.querySelector('td')?.textContent?.trim();
          if (day && time) {
            hours.push(`${day} ${time}`);
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
          hours: hours.join('; ')
        };
      });
      
      // Close the page when done
      await page.close();
      
      // Format the business data
      const formattedBusiness: BusinessData = {
        name: business.name,
        address: business.address,
        phoneNumber: business.phoneNumber,
        website: business.website,
        industry: business.categories,
        location: business.address,
        size: 'Unknown',
        contacts: [], // No contact information available directly from Google Maps
        data_source: 'google-maps-detail',
        data_source_url: url,
        extraction_date: new Date().toISOString(),
        place_id: placeId,
        google_rating: business.rating,
        review_count: business.reviewCount
      };
      
      // Update user agent success rate
      userAgent.successRate = ((userAgent.successRate * (userAgent.totalAttempts - 1)) + 1) / userAgent.totalAttempts;
      
      return formattedBusiness;
      
    } catch (error) {
      console.error(`❌ GoogleMapsScraper detail error:`, error);
      
      // Log the error for analysis
      if (executionLog) {
        executionLog.error_details.push({
          source: 'google-maps-detail',
          timestamp: new Date().toISOString(),
          error: (error as Error).message,
          stack: (error as Error).stack
        });
      }
      
      return null;
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
}

export const googleMapsScraper = new GoogleMapsScraper();