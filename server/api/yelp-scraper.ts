import axios from 'axios';
import * as cheerio from 'cheerio';
import { puppeteerWrapper } from './puppeteer-wrapper';
import { getRandomUserAgent, getRandomDelay } from './scraper-utils';
import * as puppeteer from 'puppeteer';

/**
 * Service for scraping publicly available business information from Yelp
 * Only extracts information that businesses have explicitly made public
 */
export class YelpScraper {
  /**
   * Search for businesses on Yelp and extract publicly available data
   * @param query Search query for finding businesses
   * @param location Optional location to filter results
   */
  async searchBusinesses(query: string, location?: string): Promise<any[]> {
    console.log(`Starting real Yelp scraping for: ${query}${location ? ' in ' + location : ''}`);
    
    try {
      // First try with Axios and Cheerio (faster, less resource intensive)
      const results = await this.scrapeYelpWithAxios(query, location);
      if (results && results.length > 0) {
        console.log(`Found ${results.length} businesses on Yelp using Axios`);
        return results;
      }
      
      // Fallback to Puppeteer if needed for more complex pages
      return await this.scrapeYelpWithPuppeteer(query, location);
    } catch (error) {
      console.error('Error during Yelp scraping:', error);
      return [];
    }
  }
  
  /**
   * Scrape Yelp business listings using Axios and Cheerio
   * @param query Search query for finding businesses
   * @param location Optional location to filter results
   */
  private async scrapeYelpWithAxios(query: string, location?: string): Promise<any[]> {
    try {
      // Construct the Yelp search URL
      const searchUrl = location 
        ? `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}&find_loc=${encodeURIComponent(location)}`
        : `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}`;
      
      console.log(`📍 YelpScraper: Using Axios to scrape ${searchUrl}`);
      
      // Make the request with a random user agent
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 15000
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to fetch Yelp search results: ${response.status}`);
      }
      
      const html = response.data;
      const $ = cheerio.load(html);
      
      // Look for business listings
      const businesses: any[] = [];
      
      // Different selectors for Yelp business listings
      const listingSelectors = [
        'li.border-color--default__09f24__NPAKY',
        'div[data-testid="serp-ia-card"]',
        'li.border--bottom__09f24__alRjn',
        'div.container__09f24__mpR8_',
        'li.regular-search-result',
        'div[class*="businessName"]'
      ];
      
      // Try different selectors to find results
      for (const selector of listingSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} Yelp listings with selector: ${selector}`);
          
          elements.each((i, el) => {
            try {
              // Extract business name
              const nameElement = $(el).find('a[name], a[href*="/biz/"], h3 a, span[class*="businessName"]').first();
              const name = nameElement.text().trim();
              const businessUrl = nameElement.attr('href');
              
              // Only continue if we found a name and URL
              if (name && businessUrl) {
                // Extract ratings if available
                const ratingElement = $(el).find('div[aria-label*="star rating"], [class*="star-rating"]');
                let rating = null;
                if (ratingElement.length) {
                  const ratingText = ratingElement.attr('aria-label') || '';
                  const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
                  if (ratingMatch) {
                    rating = parseFloat(ratingMatch[1]);
                  }
                }
                
                // Extract address/location
                const addressElement = $(el).find('address, [class*="secondaryAttributes"], [class*="address"]');
                const address = addressElement.text().trim();
                
                // Extract business type/category
                const categoryElement = $(el).find('span[class*="category"], a[href*="c_"], [class*="businessType"]');
                const category = categoryElement.text().trim();
                
                // Build the full URL if it's a relative URL
                let fullUrl = businessUrl;
                if (businessUrl && businessUrl.startsWith('/')) {
                  fullUrl = `https://www.yelp.com${businessUrl}`;
                }
                
                // Create a place_id (unique identifier for our purposes)
                const place_id = `yelp-${Date.now()}-${i}`;
                
                // Add the business to our results
                businesses.push({
                  place_id,
                  name,
                  yelp_url: fullUrl,
                  formatted_address: address,
                  vicinity: address,
                  types: category ? category.toLowerCase().split(/,\s*/).map(c => c.replace(/\s+/g, '_')) : ['business'],
                  rating,
                  business_status: 'OPERATIONAL'
                });
              }
            } catch (itemError) {
              console.error('Error extracting Yelp business data:', itemError);
            }
          });
          
          // If we found businesses with this selector, stop trying others
          if (businesses.length > 0) {
            break;
          }
        }
      }
      
      return businesses;
    } catch (error) {
      console.error('Error scraping Yelp with Axios:', error);
      return [];
    }
  }
  
  /**
   * Fallback method to scrape Yelp using Puppeteer for more complex cases
   * @param query Search query for finding businesses
   * @param location Optional location to filter results
   */
  private async scrapeYelpWithPuppeteer(query: string, location?: string): Promise<any[]> {
    console.log(`📍 YelpScraper: Falling back to Puppeteer for scraping Yelp`);
    
    let browser: puppeteer.Browser | null = null;
    
    try {
      // Construct the Yelp search URL
      const searchUrl = location 
        ? `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}&find_loc=${encodeURIComponent(location)}`
        : `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}`;
      
      // Launch puppeteer browser
      browser = await puppeteerWrapper.launch();
      const page = await puppeteerWrapper.createPage(browser);
      
      // Navigate to Yelp
      await puppeteerWrapper.navigate(page, searchUrl);
      
      // Wait for results to load
      await puppeteerWrapper.randomDelay(page, 3000, 5000);
      
      // Check if we hit a CAPTCHA
      const hasCaptcha = await (page as any).checkForCaptcha();
      if (hasCaptcha) {
        console.error('CAPTCHA detected on Yelp. Unable to proceed with scraping.');
        await browser.close();
        return [];
      }
      
      // Wait for business listings to appear
      const listingSelectors = [
        'li.border-color--default__09f24__NPAKY',
        'div[data-testid="serp-ia-card"]',
        'li.border--bottom__09f24__alRjn',
        'div.container__09f24__mpR8_',
        'li.regular-search-result'
      ];
      
      let foundListings = false;
      for (const selector of listingSelectors) {
        if (await puppeteerWrapper.waitForSelector(page, selector, 3000)) {
          console.log(`Found Yelp listings with selector: ${selector}`);
          foundListings = true;
          break;
        }
      }
      
      if (!foundListings) {
        console.log('Could not find Yelp business listings');
        await browser.close();
        return [];
      }
      
      // Take a screenshot for debugging
      try {
        await page.screenshot({ path: './yelp-search-screenshot.png' });
        console.log(`📍 YelpScraper: Captured screenshot of search results`);
      } catch (screenshotError) {
        console.error('Error taking screenshot:', screenshotError);
      }
      
      // Extract business data from the search results
      const results = await page.evaluate(() => {
        const businesses: any[] = [];
        
        // Different selectors for Yelp business listings
        const listingSelectors = [
          'li.border-color--default__09f24__NPAKY',
          'div[data-testid="serp-ia-card"]',
          'li.border--bottom__09f24__alRjn',
          'div.container__09f24__mpR8_',
          'li.regular-search-result'
        ];
        
        let elements: NodeListOf<Element> | null = null;
        
        // Try different selectors to find results
        for (const selector of listingSelectors) {
          const foundElements = document.querySelectorAll(selector);
          if (foundElements && foundElements.length > 0) {
            elements = foundElements;
            break;
          }
        }
        
        if (!elements || elements.length === 0) {
          return businesses;
        }
        
        // Process listings
        Array.from(elements).forEach((el, index) => {
          try {
            // Find the business name and link
            const nameEl = el.querySelector('a[name], a[href*="/biz/"], h3 a, span[class*="businessName"]');
            if (!nameEl) return;
            
            const name = nameEl.textContent ? nameEl.textContent.trim() : '';
            const href = nameEl instanceof HTMLAnchorElement ? nameEl.href : null;
            
            if (!name || !href) return;
            
            // Extract address
            const addressEl = el.querySelector('address, [class*="secondaryAttributes"], [class*="address"]');
            const address = addressEl && addressEl.textContent ? addressEl.textContent.trim() : '';
            
            // Extract categories
            const categoryEl = el.querySelector('span[class*="category"], a[href*="c_"], [class*="businessType"]');
            const category = categoryEl && categoryEl.textContent ? categoryEl.textContent.trim() : '';
            
            // Extract rating
            const ratingEl = el.querySelector('div[aria-label*="star rating"], [class*="star-rating"]');
            let rating = null;
            
            if (ratingEl) {
              const ratingText = ratingEl.getAttribute('aria-label') || '';
              const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
              if (ratingMatch) {
                rating = parseFloat(ratingMatch[1]);
              }
            }
            
            // Create a place_id (unique identifier for our purposes)
            const place_id = `yelp-${Date.now()}-${index}`;
            
            // Add the business to our results
            businesses.push({
              place_id,
              name,
              yelp_url: href,
              formatted_address: address,
              vicinity: address,
              types: category ? category.toLowerCase().split(/,\s*/).map((c: string) => c.replace(/\s+/g, '_')) : ['business'],
              rating,
              business_status: 'OPERATIONAL'
            });
          } catch (e) {
            // Skip this item if we encounter an error
            console.error('Error extracting business data:', e);
          }
        });
        
        return businesses;
      });
      
      // Close the browser
      await browser.close();
      
      console.log(`Found ${results.length} businesses on Yelp using Puppeteer`);
      return results;
    } catch (error) {
      console.error('Error during Yelp scraping with Puppeteer:', error);
      if (browser) await browser.close();
      return [];
    }
  }
  
  /**
   * Get detailed information about a specific business from its Yelp page
   * @param yelpUrl The Yelp URL for the business
   */
  async getBusinessDetails(yelpUrl: string): Promise<any> {
    console.log(`Getting detailed Yelp info for: ${yelpUrl}`);
    
    let browser: puppeteer.Browser | null = null;
    
    try {
      // Launch puppeteer browser
      browser = await puppeteerWrapper.launch();
      const page = await puppeteerWrapper.createPage(browser);
      
      // Navigate to the Yelp business page
      await puppeteerWrapper.navigate(page, yelpUrl);
      
      // Wait for business details to load
      await puppeteerWrapper.randomDelay(page, 3000, 5000);
      
      // Check if we hit a CAPTCHA
      const hasCaptcha = await (page as any).checkForCaptcha();
      if (hasCaptcha) {
        console.error('CAPTCHA detected on Yelp. Unable to proceed with scraping.');
        await browser.close();
        return null;
      }
      
      // Take a screenshot for debugging
      try {
        await page.screenshot({ path: './yelp-business-screenshot.png' });
        console.log(`📍 YelpScraper: Captured screenshot of business page`);
      } catch (screenshotError) {
        console.error('Error taking screenshot:', screenshotError);
      }
      
      // Extract business information
      const businessInfo = await page.evaluate(() => {
        // Initialize results
        const info: any = {
          name: '',
          address: '',
          phone: '',
          website: '',
          business_hours: [],
          categories: [],
          rating: null,
          reviews_count: null,
          contacts: []
        };
        
        // Extract business name
        const nameEl = document.querySelector('h1');
        if (nameEl && nameEl.textContent) {
          info.name = nameEl.textContent.trim();
        }
        
        // Extract address
        const addressEl = document.querySelector('address p, [href*="maps"], [class*="address"]');
        if (addressEl && addressEl.textContent) {
          info.address = addressEl.textContent.trim();
        }
        
        // Extract phone number
        const phoneEl = document.querySelector('[href^="tel:"], p:contains("("), p:contains("+")');
        if (phoneEl && phoneEl.textContent) {
          info.phone = phoneEl.textContent.trim();
        }
        
        // Extract website
        const websiteEl = document.querySelector('a[href*="biz_redir"]');
        if (websiteEl) {
          info.website = websiteEl.getAttribute('href');
        }
        
        // Extract business hours
        const hoursEls = document.querySelectorAll('[class*="hour"], [class*="time"], table tr');
        
        if (hoursEls.length > 0) {
          Array.from(hoursEls).forEach(el => {
            if (el.textContent && el.textContent.trim() && 
                (el.textContent.includes('day') || 
                 el.textContent.includes('Mon') || 
                 el.textContent.includes('Tue'))) {
              info.business_hours.push(el.textContent.trim());
            }
          });
        }
        
        // Extract categories
        const categoryEls = document.querySelectorAll('a[href*="c_"], [class*="category"]');
        
        if (categoryEls.length > 0) {
          Array.from(categoryEls).forEach(el => {
            if (el.textContent) {
              info.categories.push(el.textContent.trim());
            }
          });
        }
        
        // Extract rating
        const ratingEl = document.querySelector('[aria-label*="star rating"], [class*="star-rating"]');
        
        if (ratingEl) {
          const ratingText = ratingEl.getAttribute('aria-label') || ratingEl.textContent;
          if (ratingText) {
            const match = ratingText.match(/(\d+(\.\d+)?)/);
            if (match) {
              info.rating = parseFloat(match[1]);
            }
          }
        }
        
        // Extract review count
        const reviewEl = document.querySelector('[class*="review-count"], [class*="reviews"]');
        
        if (reviewEl && reviewEl.textContent) {
          const match = reviewEl.textContent.match(/(\d+)/);
          if (match) {
            info.reviews_count = parseInt(match[1]);
          }
        }
        
        return info;
      });
      
      // If we have a business name, create basic contacts
      if (businessInfo.name) {
        // Basic contact for the business
        const mainContact = {
          id: 1,
          name: `Contact at ${businessInfo.name}`,
          position: businessInfo.categories && businessInfo.categories.length > 0 ? 
                  `${businessInfo.categories[0]} Professional` : "Business Representative",
          email: null,
          companyPhone: businessInfo.phone || null,
          personalPhone: null,
          isDecisionMaker: true,
          influence: 75,
          notes: 'Contact information from Yelp business listing.'
        };
        
        businessInfo.contacts = [mainContact];
        
        // If we have a website, add it to the business info
        if (businessInfo.website) {
          businessInfo.website_link = businessInfo.website;
        }
      }
      
      // Close the browser
      await browser.close();
      return businessInfo;
    } catch (error) {
      console.error('Error during Yelp business info scraping:', error);
      if (browser) await browser.close();
      return null;
    }
  }
}

// Export singleton instance
export const yelpScraper = new YelpScraper();