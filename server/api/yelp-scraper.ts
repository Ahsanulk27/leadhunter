import axios from 'axios';
import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';
import { getRandomUserAgent, getRandomDelay } from './scraper-utils';

/**
 * Service for scraping publicly available business information from Yelp
 * Only extracts information that businesses have explicitly made public
 */
export class YelpScraper {
  
  /**
   * Search for businesses on Yelp
   * @param query Search query for finding businesses
   * @param location Optional location to narrow search
   */
  async searchBusinesses(query: string, location?: string) {
    console.log(`Scraping Yelp for: ${query} in ${location || 'all locations'}`);
    
    try {
      // First try with Axios + Cheerio for better performance
      return await this.searchWithAxios(query, location);
    } catch (error) {
      console.error('Axios Yelp scraping failed, trying Puppeteer fallback:', error);
      return await this.searchWithPuppeteer(query, location);
    }
  }
  
  /**
   * Search Yelp using Axios + Cheerio
   */
  private async searchWithAxios(query: string, location?: string) {
    // Build the search URL
    const searchUrl = location ? 
      `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}&find_loc=${encodeURIComponent(location)}` :
      `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}`;
    
    // Add random delay to prevent being blocked
    await new Promise(resolve => setTimeout(resolve, getRandomDelay(1000, 3000)));
    
    // Make the request with a random user agent
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000
    });
    
    // Load the HTML into cheerio
    const $ = cheerio.load(response.data);
    const businesses = [];
    
    // Find business listing containers
    $('.css-1qn0b6x').each((index, element) => {
      try {
        // Extract business name
        const nameElement = $(element).find('a.css-19v1rkv');
        const name = nameElement.text().trim();
        
        // Extract business URL for additional details
        const businessUrl = nameElement.attr('href');
        const yelpId = businessUrl ? businessUrl.split('?')[0].split('/').pop() : `yelp-${Date.now()}-${index}`;
        
        // Extract address
        const addressElement = $(element).find('.css-dzq7l1 address');
        const address = addressElement.text().trim();
        
        // Extract categories/types
        const categoriesElement = $(element).find('.css-dzq7l1 span:contains(",")');
        const categoriesText = categoriesElement.text().trim();
        const categories = categoriesText.split(',').map(c => c.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'));
        
        // Extract rating
        const ratingElement = $(element).find('.css-1fdy0l5');
        const ratingText = ratingElement.text().trim();
        const rating = ratingText ? parseFloat(ratingText) : null;
        
        // Only add businesses where we found a name
        if (name && name.length > 0) {
          businesses.push({
            place_id: yelpId,
            name,
            formatted_address: address,
            vicinity: address,
            business_status: 'OPERATIONAL',
            types: categories.length > 0 ? categories : ['business'],
            rating,
            yelp_url: businessUrl ? `https://www.yelp.com${businessUrl}` : null
          });
        }
      } catch (e) {
        console.error('Error parsing Yelp business listing:', e);
      }
    });
    
    console.log(`Found ${businesses.length} businesses on Yelp using Axios`);
    return businesses;
  }
  
  /**
   * Search Yelp using Puppeteer (fallback method)
   */
  private async searchWithPuppeteer(query: string, location?: string) {
    console.log('Using Puppeteer fallback for Yelp search');
    
    try {
      // Launch puppeteer browser
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        
        // Set random user agent
        await page.setUserAgent(getRandomUserAgent());
        
        // Build the search URL
        const searchUrl = location ? 
          `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}&find_loc=${encodeURIComponent(location)}` :
          `https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}`;
        
        // Navigate to Yelp search
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        
        // Wait for search results to load
        await page.waitForSelector('.css-1qn0b6x', { timeout: 10000 }).catch(() => {
          console.log('Could not find standard Yelp business listings, will try alternative selectors');
        });
        
        // Extract business information
        const businesses = await page.evaluate(() => {
          const results = [];
          
          // Try different selectors since Yelp might change their HTML structure
          const listingSelectors = [
            '.css-1qn0b6x', // Primary target
            '.businessName', // Alternative
            '.biz-listing-large', // Alternative
            'li.regular-search-result', // Alternative
            'div[data-testid="serp-ia-card"]', // Newer version
            '.css-1qn0b6x'
          ];
          
          // Find business listings using various selectors
          for (const selector of listingSelectors) {
            const listings = document.querySelectorAll(selector);
            if (listings.length > 0) {
              console.log(`Found ${listings.length} listings with selector: ${selector}`);
              
              listings.forEach((listing, index) => {
                try {
                  // Extract business information
                  // Look for name in various possible elements
                  const nameEl = listing.querySelector('a.css-19v1rkv') || 
                                listing.querySelector('.businessName') ||
                                listing.querySelector('a.biz-name') ||
                                listing.querySelector('h3 a') ||
                                listing.querySelector('h4');
                  
                  if (!nameEl) return;
                  
                  const name = nameEl.textContent.trim();
                  
                  // Try to get the URL for the business detail page
                  const linkEl = nameEl.closest('a');
                  const businessUrl = linkEl ? linkEl.getAttribute('href') : null;
                  
                  // Try to extract address
                  const addressEl = listing.querySelector('address') || 
                                   listing.querySelector('.neighborhood-str-list') ||
                                   listing.querySelector('.secondaryAttributes');
                  
                  const address = addressEl ? addressEl.textContent.trim() : '';
                  
                  // Try to extract categories
                  const categoryEl = listing.querySelector('.category-str-list') ||
                                    listing.querySelector('.price-category') ||
                                    listing.querySelector('.css-dzq7l1 span:contains(",")');
                  
                  const categoryText = categoryEl ? categoryEl.textContent.trim() : '';
                  const categories = categoryText ? 
                                    categoryText.split(',').map(c => c.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')) :
                                    ['business'];
                  
                  // Generate a place ID
                  const placeId = businessUrl ? 
                                 businessUrl.split('?')[0].split('/').pop() : 
                                 `yelp-${Date.now()}-${index}`;
                  
                  // Only add businesses with names
                  if (name && name.length > 0) {
                    results.push({
                      place_id: placeId,
                      name,
                      formatted_address: address,
                      vicinity: address,
                      business_status: 'OPERATIONAL',
                      types: categories,
                      yelp_url: businessUrl ? `https://www.yelp.com${businessUrl}` : null
                    });
                  }
                } catch (e) {
                  console.error('Error extracting business data from Yelp:', e);
                }
              });
              
              // If we found results with this selector, stop trying others
              if (results.length > 0) {
                break;
              }
            }
          }
          
          return results;
        });
        
        await browser.close();
        
        console.log(`Found ${businesses.length} businesses on Yelp using Puppeteer`);
        return businesses;
      } catch (error) {
        console.error('Error during Puppeteer Yelp search:', error);
        await browser.close();
        return [];
      }
    } catch (error) {
      console.error('Error launching Puppeteer for Yelp search:', error);
      return [];
    }
  }
  
  /**
   * Get detailed business information from a Yelp page
   * @param yelpUrl The URL of the Yelp business page
   */
  async getBusinessDetails(yelpUrl: string) {
    console.log(`Scraping details from Yelp: ${yelpUrl}`);
    
    try {
      // Add random delay to prevent being blocked
      await new Promise(resolve => setTimeout(resolve, getRandomDelay(1000, 3000)));
      
      // Try with Axios first
      const response = await axios.get(yelpUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      // Initialize business details
      const businessInfo: any = {
        name: '',
        address: '',
        phone: '',
        website: '',
        categories: [],
        hours: [],
        contacts: []
      };
      
      // Extract business name
      businessInfo.name = $('h1').text().trim();
      
      // Extract address
      const addressElement = $('.css-qyp8bo').first();
      if (addressElement.length) {
        businessInfo.address = addressElement.text().trim();
      }
      
      // Extract phone number
      const phoneElement = $('p:contains("(")');
      if (phoneElement.length) {
        const phoneText = phoneElement.text().trim();
        const phoneMatch = phoneText.match(/\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
        if (phoneMatch) {
          businessInfo.phone = phoneMatch[0];
        }
      }
      
      // Extract website
      const websiteElement = $('a[href*="biz_redir"]').first();
      if (websiteElement.length) {
        const websiteUrl = websiteElement.attr('href');
        if (websiteUrl) {
          try {
            const url = new URL(`https://www.yelp.com${websiteUrl}`);
            businessInfo.website = decodeURIComponent(url.searchParams.get('url') || '');
          } catch (e) {
            console.error('Error parsing website URL:', e);
          }
        }
      }
      
      // Extract categories
      $('.css-1fdy0l5').each((_, element) => {
        const category = $(element).text().trim();
        if (category) {
          businessInfo.categories.push(category);
        }
      });
      
      // Extract hours
      $('.css-1274e3y').each((_, element) => {
        const hours = $(element).text().trim();
        if (hours) {
          businessInfo.hours.push(hours);
        }
      });
      
      // Look for staff members/contacts
      if (businessInfo.name) {
        // Create a basic contact from the business name and phone
        businessInfo.contacts = [{
          name: `Contact at ${businessInfo.name}`,
          position: 'Business Representative',
          email: null,
          phone: businessInfo.phone,
          isDecisionMaker: true
        }];
        
        // Look for staff names if present (rare on Yelp, but possible)
        $('.user-display-name').each((_, element) => {
          const name = $(element).text().trim();
          const role = $(element).next('.user-role').text().trim();
          
          if (name && role && role.includes('Owner') || role.includes('Manager')) {
            businessInfo.contacts.push({
              name,
              position: role || 'Owner/Manager',
              email: null,
              phone: businessInfo.phone,
              isDecisionMaker: true
            });
          }
        });
      }
      
      return businessInfo;
    } catch (error) {
      console.error('Error with Axios Yelp details, trying Puppeteer:', error);
      return await this.getBusinessDetailsWithPuppeteer(yelpUrl);
    }
  }
  
  /**
   * Get business details using Puppeteer (fallback method)
   */
  private async getBusinessDetailsWithPuppeteer(yelpUrl: string) {
    console.log('Using Puppeteer for Yelp business details');
    
    try {
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        await page.setUserAgent(getRandomUserAgent());
        
        // Navigate to the business page
        await page.goto(yelpUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        
        // Extract business details
        const businessInfo = await page.evaluate(() => {
          const info: any = {
            name: '',
            address: '',
            phone: '',
            website: '',
            categories: [],
            hours: [],
            contacts: []
          };
          
          // Extract business name
          const nameEl = document.querySelector('h1');
          if (nameEl) {
            info.name = nameEl.textContent.trim();
          }
          
          // Extract address
          const addressEl = document.querySelector('.css-qyp8bo, .css-1h1j0y3, address');
          if (addressEl) {
            info.address = addressEl.textContent.trim();
          }
          
          // Extract phone
          const phoneEl = document.querySelector('.css-1h1j0y3:contains("(")');
          if (phoneEl) {
            const phoneText = phoneEl.textContent.trim();
            const phoneMatch = phoneText.match(/\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
            if (phoneMatch) {
              info.phone = phoneMatch[0];
            }
          }
          
          // Extract website
          const websiteEl = document.querySelector('a[href*="biz_redir"]');
          if (websiteEl && websiteEl.getAttribute('href')) {
            const href = websiteEl.getAttribute('href');
            // The actual URL is in the query parameter
            try {
              const url = new URL(`https://www.yelp.com${href}`);
              info.website = decodeURIComponent(url.searchParams.get('url') || '');
            } catch (e) {
              console.error('Error parsing website URL');
            }
          }
          
          // Extract categories
          document.querySelectorAll('.css-1fdy0l5, .category-str-list a').forEach(el => {
            const category = el.textContent.trim();
            if (category) {
              info.categories.push(category);
            }
          });
          
          // Extract hours
          document.querySelectorAll('.css-1274e3y, .hours-table tr').forEach(el => {
            const hours = el.textContent.trim();
            if (hours) {
              info.hours.push(hours);
            }
          });
          
          return info;
        });
        
        // Create a basic contact from the business name
        if (businessInfo.name) {
          businessInfo.contacts = [{
            name: `Contact at ${businessInfo.name}`,
            position: 'Business Representative',
            email: null,
            phone: businessInfo.phone,
            isDecisionMaker: true
          }];
        }
        
        await browser.close();
        return businessInfo;
      } catch (error) {
        console.error('Error during Puppeteer Yelp business details:', error);
        await browser.close();
        return null;
      }
    } catch (error) {
      console.error('Error launching Puppeteer for Yelp business details:', error);
      return null;
    }
  }
}

// Export singleton instance
export const yelpScraper = new YelpScraper();