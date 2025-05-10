/**
 * Cheerio-based web scraper for the NexLead application
 * Uses Cheerio for lightweight HTML parsing instead of a full browser
 * Implements rate limiting, user agent rotation, and CAPTCHA detection
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { 
  getRandomizedHeaders, 
  randomDelay, 
  detectCaptcha, 
  saveHtmlSnapshot, 
  sleep,
  isDecisionMakerTitle,
  extractContactInfo,
  formatSearchQuery
} from './scraper-utils';
import { BusinessData, Contact } from '../models/business-data';

interface ScraperOptions {
  maxRetries?: number;
  saveHtml?: boolean;
  delayMin?: number; 
  delayMax?: number;
  logDetails?: boolean;
}

export class CheerioScraper {
  private defaultOptions: ScraperOptions = {
    maxRetries: 3,
    saveHtml: true,
    delayMin: 2000,
    delayMax: 5000,
    logDetails: true
  };
  
  constructor() {}
  
  /**
   * Search Google for business listings
   */
  async searchGoogle(query: string, location?: string, options: ScraperOptions = {}): Promise<BusinessData[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const searchQuery = location ? `${query} in ${location}` : query;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    
    console.log(`🔍 CheerioScraper: Searching Google for '${searchQuery}'`);
    
    try {
      const response = await axios.get(searchUrl, {
        headers: getRandomizedHeaders(),
        timeout: 30000
      });
      
      const html = response.data;
      
      // Check for CAPTCHA
      if (detectCaptcha(html)) {
        console.log('⚠️ CheerioScraper: Google CAPTCHA detected');
        if (mergedOptions.saveHtml) {
          saveHtmlSnapshot(html, 'google-captcha', searchQuery);
        }
        return [];
      }
      
      if (mergedOptions.saveHtml) {
        saveHtmlSnapshot(html, 'google', searchQuery);
      }
      
      const $ = cheerio.load(html);
      const businesses: BusinessData[] = [];
      
      // Parse local business results
      $('.VkpGBb').each((i, el) => {
        try {
          const titleEl = $(el).find('h3').first();
          const title = titleEl.text().trim();
          
          // Skip if no title found
          if (!title) return;
          
          // Extract details
          const addressEl = $(el).find('div.rllt__details div:contains("·")').first();
          const address = addressEl.text()?.split('·')?.[1]?.trim() || '';
          
          // Extract phone if available
          const phoneMatch = $(el).find('div.rllt__details').text().match(/(?:\+1|1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
          const phone = phoneMatch ? phoneMatch[0] : '';
          
          // Extract website
          const websiteLink = $(el).find('a.yYlJEf').attr('href') || '';
          const website = websiteLink.startsWith('/url?q=') 
            ? decodeURIComponent(websiteLink.substring(7).split('&')[0]) 
            : websiteLink;
          
          // Extract rating
          const ratingText = $(el).find('span.BTtC6e').text().trim();
          const rating = ratingText ? parseFloat(ratingText.split(' ')[0]) : undefined;
          
          // Extract category from the first span with class "BTtC6e"
          const categoryEl = $(el).find('div.rllt__details span').first();
          const category = categoryEl.text().trim();
          
          const business: BusinessData = {
            id: uuidv4(),
            name: title,
            address,
            phoneNumber: phone,
            website,
            category,
            rating,
            source: 'google',
            sourceUrl: searchUrl,
            scrapedDate: new Date()
          };
          
          businesses.push(business);
        } catch (error) {
          console.error('Error parsing Google business:', error);
        }
      });
      
      // Parse organic search results for websites
      $('.g .yuRUbf').each((i, el) => {
        try {
          const titleEl = $(el).find('h3').first();
          const title = titleEl.text().trim();
          
          // Skip if no title found
          if (!title) return;
          
          const url = $(el).find('a').attr('href') || '';
          
          // Skip if it's already in the businesses array
          if (businesses.some(b => b.name === title)) return;
          
          const descriptionEl = $(el).parent().find('.VwiC3b').first();
          const description = descriptionEl.text().trim();
          
          // Try to extract contact info from description
          const contactInfo = extractContactInfo(description);
          
          const business: BusinessData = {
            id: uuidv4(),
            name: title,
            website: url,
            description: description.substring(0, 200),
            source: 'google-organic',
            sourceUrl: searchUrl,
            scrapedDate: new Date()
          };
          
          if (contactInfo.emails.length > 0) {
            business.email = contactInfo.emails[0];
          }
          
          if (contactInfo.phones.length > 0) {
            business.phoneNumber = contactInfo.phones[0];
          }
          
          businesses.push(business);
        } catch (error) {
          console.error('Error parsing Google organic result:', error);
        }
      });
      
      console.log(`✅ CheerioScraper: Found ${businesses.length} businesses from Google`);
      return businesses;
    } catch (error) {
      console.error(`❌ CheerioScraper Google error: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Search Yelp for business listings
   */
  async searchYelp(query: string, location?: string, options: ScraperOptions = {}): Promise<BusinessData[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const yelpSearchUrl = 'https://www.yelp.com/search';
    const params = {
      find_desc: query,
      find_loc: location || 'United States'
    };
    
    const queryString = new URLSearchParams(params).toString();
    const searchUrl = `${yelpSearchUrl}?${queryString}`;
    
    console.log(`🔍 CheerioScraper: Searching Yelp for '${query}' in ${location || 'United States'}`);
    
    try {
      await sleep(randomDelay(mergedOptions.delayMin!, mergedOptions.delayMax!));
      
      const response = await axios.get(searchUrl, {
        headers: getRandomizedHeaders(),
        timeout: 30000
      });
      
      const html = response.data;
      
      // Check for CAPTCHA
      if (detectCaptcha(html)) {
        console.log('⚠️ CheerioScraper: Yelp CAPTCHA detected');
        if (mergedOptions.saveHtml) {
          saveHtmlSnapshot(html, 'yelp-captcha', `${query}-${location}`);
        }
        return [];
      }
      
      if (mergedOptions.saveHtml) {
        saveHtmlSnapshot(html, 'yelp', `${query}-${location}`);
      }
      
      const $ = cheerio.load(html);
      const businesses: BusinessData[] = [];
      
      // Find business listings
      $('h3 a.css-1m051bw').each((i, el) => {
        try {
          const nameEl = $(el);
          const name = nameEl.text().trim();
          
          // Skip if no name found
          if (!name) return;
          
          // Get the parent business card element
          const businessCard = nameEl.closest('div.container__09f24__mpR8_');
          
          // Extract address
          const addressEl = businessCard.find('address span.css-1h7ysrc');
          const address = addressEl.text().trim();
          
          // Extract category
          const categoryEl = businessCard.find('span.css-1fdy0l5');
          const category = categoryEl.text().trim();
          
          // Extract rating
          const ratingEl = businessCard.find('div[aria-label*="star rating"]');
          const ratingText = ratingEl.attr('aria-label');
          const rating = ratingText ? parseFloat(ratingText.split(' ')[0]) : undefined;
          
          // Extract review count
          const reviewsEl = businessCard.find('span.css-1h7ysrc:contains("reviews")');
          const reviewText = reviewsEl.text().trim();
          const reviewCount = reviewText ? parseInt(reviewText.replace(/[^0-9]/g, '')) : undefined;
          
          // Extract URL
          const businessUrl = nameEl.attr('href');
          const fullUrl = businessUrl ? `https://www.yelp.com${businessUrl}` : undefined;
          
          const business: BusinessData = {
            id: uuidv4(),
            name,
            address,
            category,
            rating,
            reviewCount,
            source: 'yelp',
            sourceUrl: searchUrl,
            website: fullUrl,
            scrapedDate: new Date()
          };
          
          businesses.push(business);
        } catch (error) {
          console.error('Error parsing Yelp business:', error);
        }
      });
      
      console.log(`✅ CheerioScraper: Found ${businesses.length} businesses from Yelp`);
      return businesses;
    } catch (error) {
      console.error(`❌ CheerioScraper Yelp error: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Search Yellow Pages for business listings
   */
  async searchYellowPages(query: string, location?: string, options: ScraperOptions = {}): Promise<BusinessData[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const ypSearchUrl = 'https://www.yellowpages.com/search';
    const params = {
      search_terms: query,
      geo_location_terms: location || 'United States'
    };
    
    const queryString = new URLSearchParams(params).toString();
    const searchUrl = `${ypSearchUrl}?${queryString}`;
    
    console.log(`🔍 CheerioScraper: Searching Yellow Pages for '${query}' in ${location || 'United States'}`);
    
    try {
      await sleep(randomDelay(mergedOptions.delayMin!, mergedOptions.delayMax!));
      
      const response = await axios.get(searchUrl, {
        headers: getRandomizedHeaders(),
        timeout: 30000
      });
      
      const html = response.data;
      
      // Check for CAPTCHA
      if (detectCaptcha(html)) {
        console.log('⚠️ CheerioScraper: Yellow Pages CAPTCHA detected');
        if (mergedOptions.saveHtml) {
          saveHtmlSnapshot(html, 'yp-captcha', `${query}-${location}`);
        }
        return [];
      }
      
      if (mergedOptions.saveHtml) {
        saveHtmlSnapshot(html, 'yellow-pages', `${query}-${location}`);
      }
      
      const $ = cheerio.load(html);
      const businesses: BusinessData[] = [];
      
      // Find business listings
      $('.organic-result, .sponsored-result').each((i, el) => {
        try {
          const nameEl = $(el).find('.business-name');
          const name = nameEl.text().trim();
          
          // Skip if no name found
          if (!name) return;
          
          // Extract category
          const categoryEl = $(el).find('.categories');
          const category = categoryEl.text().trim();
          
          // Extract address
          const streetAddress = $(el).find('.street-address').text().trim();
          const locality = $(el).find('.locality').text().trim();
          const addressLine = `${streetAddress}, ${locality}`.trim();
          
          // Extract phone
          const phoneEl = $(el).find('.phones');
          const phone = phoneEl.text().trim();
          
          // Extract website URL
          const websiteEl = $(el).find('.track-visit-website');
          const website = websiteEl.attr('href') || '';
          
          // Extract years in business
          const yearsEl = $(el).find('.years-in-business');
          const years = yearsEl.text().replace('Years in Business:', '').trim();
          
          // Create business object
          const business: BusinessData = {
            id: uuidv4(),
            name,
            category,
            address: addressLine,
            phoneNumber: phone,
            website,
            yearEstablished: years || undefined,
            source: 'yellow-pages',
            sourceUrl: searchUrl,
            scrapedDate: new Date()
          };
          
          businesses.push(business);
        } catch (error) {
          console.error('Error parsing Yellow Pages business:', error);
        }
      });
      
      console.log(`✅ CheerioScraper: Found ${businesses.length} businesses from Yellow Pages`);
      return businesses;
    } catch (error) {
      console.error(`❌ CheerioScraper Yellow Pages error: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Parallel search across multiple sources
   */
  async multiSourceSearch(query: string, location?: string, options: ScraperOptions = {}): Promise<{
    businesses: BusinessData[];
    sources: string[];
  }> {
    const startTime = Date.now();
    console.log(`🔍 CheerioScraper: Starting multi-source search for '${query}' ${location ? 'in ' + location : ''}`);
    
    // Run searches in parallel
    const [googleResults, yelpResults, yellowPagesResults] = await Promise.all([
      this.searchGoogle(query, location, options).catch(() => []),
      this.searchYelp(query, location, options).catch(() => []),
      this.searchYellowPages(query, location, options).catch(() => [])
    ]);
    
    // Track successful sources
    const activeSources: string[] = [];
    if (googleResults.length > 0) activeSources.push('google-maps');
    if (yelpResults.length > 0) activeSources.push('yelp');
    if (yellowPagesResults.length > 0) activeSources.push('yellow-pages');
    
    // Combine results and deduplicate by name (simple deduplication)
    const nameMap = new Map<string, BusinessData>();
    const allResults = [...googleResults, ...yelpResults, ...yellowPagesResults];
    
    for (const business of allResults) {
      const existingBusiness = nameMap.get(business.name);
      
      if (existingBusiness) {
        // Merge properties if the business already exists
        nameMap.set(business.name, {
          ...existingBusiness,
          ...business,
          // Combine contact information
          phoneNumber: business.phoneNumber || existingBusiness.phoneNumber,
          email: business.email || existingBusiness.email,
          website: business.website || existingBusiness.website,
          // Keep higher rating if available
          rating: Math.max(business.rating || 0, existingBusiness.rating || 0) || undefined,
          // Combine sources
          source: `${existingBusiness.source},${business.source}`
        });
      } else {
        nameMap.set(business.name, business);
      }
    }
    
    const businesses = Array.from(nameMap.values());
    
    // Add potential contacts to each business
    businesses.forEach(business => {
      // Only add dummy contacts for now
      // In a real implementation, this would involve scraping the business website or profile pages
      
      const contactCount = Math.floor(Math.random() * 3) + 1; // 1-3 contacts per business
      const contacts: Contact[] = [];
      
      for (let i = 0; i < contactCount; i++) {
        const isDecisionMaker = i === 0; // Make the first contact a decision maker
        contacts.push({
          contactId: uuidv4(),
          name: `Contact ${i + 1}`,
          position: isDecisionMaker ? 'Owner' : 'Staff',
          email: `contact${i + 1}@${business.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          phoneNumber: business.phoneNumber,
          isDecisionMaker,
          companyName: business.name
        });
      }
      
      business.contacts = contacts;
    });
    
    const endTime = Date.now();
    console.log(`✅ CheerioScraper: Multi-source search completed in ${endTime - startTime}ms, found ${businesses.length} businesses from ${activeSources.length} sources`);
    
    return {
      businesses,
      sources: activeSources
    };
  }
}

export const cheerioScraper = new CheerioScraper();