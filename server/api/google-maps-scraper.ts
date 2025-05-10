import { puppeteerWrapper } from './puppeteer-wrapper';
import { getRandomDelay } from './scraper-utils';
import * as puppeteer from 'puppeteer';

/**
 * Service for scraping publicly available business information from Google Maps
 * Only extracts information that businesses have explicitly made public
 */
export class GoogleMapsScraper {
  
  /**
   * Search for businesses on Google Maps and extract publicly available data
   * @param query Search query for finding businesses
   */
  async searchBusinesses(query: string) {
    console.log(`Starting real Google Maps scraping for: ${query}`);
    
    let browser: puppeteer.Browser | null = null;
    
    try {
      console.log(`📍 GoogleMapsScraper: Launching puppeteer browser`);
      
      // Launch puppeteer browser
      browser = await puppeteerWrapper.launch();
      const page = await puppeteerWrapper.createPage(browser);
      
      console.log(`📍 GoogleMapsScraper: Browser launched, navigating to Google Maps`);
      
      // Navigate to Google Maps
      await puppeteerWrapper.navigate(page, 'https://www.google.com/maps');
      
      console.log(`📍 GoogleMapsScraper: Loaded Google Maps, waiting for search box to appear`);
      
      // Wait for the search box to appear
      const searchBoxSelector = 'input#searchboxinput, input.searchboxinput, input[aria-label="Search Google Maps"]';
      if (!await puppeteerWrapper.waitForSelector(page, searchBoxSelector)) {
        console.error('Could not find Google Maps search box - scraper failed');
        await browser.close();
        return [];
      }
      
      console.log(`📍 GoogleMapsScraper: Found search box, preparing to enter search query`);
      
      // Add a screenshot for debugging
      try {
        await page.screenshot({ path: './google-maps-screenshot.png' });
        console.log(`📍 GoogleMapsScraper: Captured screenshot before search`);
      } catch (screenshotError) {
        console.error('Error taking screenshot:', screenshotError);
      }
      
      // Type the search query with human-like delays
      await puppeteerWrapper.typeText(page, searchBoxSelector, query);
      
      // Click the search button
      const searchButtonSelector = 'button#searchbox-searchbutton, button[aria-label="Search"]';
      await puppeteerWrapper.clickElement(page, searchButtonSelector);
      
      // Wait for results to load
      await puppeteerWrapper.randomDelay(page, 3000, 5000);
      
      // Wait for business listings to appear
      const listingSelectors = [
        'div[role="feed"] > div', 
        '.section-result', 
        'div.Nv2PK',
        '.MVVflb',
        '.dm7YTc'
      ];
      
      let foundListings = false;
      for (const selector of listingSelectors) {
        if (await puppeteerWrapper.waitForSelector(page, selector, 3000)) {
          console.log(`Found Google Maps listings with selector: ${selector}`);
          foundListings = true;
          break;
        }
      }
      
      if (!foundListings) {
        console.log('Could not find Google Maps business listings');
        await browser.close();
        return [];
      }
      
      // Wait additional time for results to fully load
      await puppeteerWrapper.randomDelay(page, 2000, 4000);
      
      // Check if we've been blocked by a CAPTCHA
      const hasCaptcha = await (page as any).checkForCaptcha();
      if (hasCaptcha) {
        console.error('CAPTCHA detected on Google Maps. Unable to proceed with scraping.');
        await browser.close();
        return [];
      }
      
      // Extract business data from the search results
      const businesses = await page.evaluate(() => {
        const results: any[] = [];
        
        // Try different selectors for finding business listings
        const listingSelectors = [
          'div[role="feed"] > div', 
          '.section-result', 
          'div.Nv2PK',
          '.MVVflb',
          '.dm7YTc'
        ];
        
        let listings: NodeListOf<Element> | null = null;
        
        // Find which selector works for the current page
        for (const selector of listingSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements && elements.length > 0) {
            listings = elements;
            break;
          }
        }
        
        if (!listings || listings.length === 0) {
          return results;
        }
        
        // Process each listing
        // Convert NodeList to Array to avoid TypeScript error
        Array.from(listings).forEach((listing, index) => {
          try {
            // Find business name element (try various selectors)
            const nameSelectors = [
              'div.fontHeadlineSmall span',
              'h3',
              'div[role="heading"]',
              'a[aria-label]',
              '.qBF1Pd',
              '.MVVflb div.fontHeadlineSmall',
              '.MVVflb h3'
            ];
            
            let nameElement: Element | null = null;
            for (const selector of nameSelectors) {
              const element = listing.querySelector(selector);
              if (element) {
                nameElement = element;
                break;
              }
            }
            
            // Only proceed if we found a name element
            if (!nameElement) return;
            
            const name = nameElement.textContent ? nameElement.textContent.trim() : '';
            if (!name) return;
            
            // Extract address/vicinity
            const addressSelectors = [
              'div.fontBodyMedium:not(:first-child)',
              '.address',
              '.AeaXub',
              '.OOQlpe div.fontBodyMedium'
            ];
            
            let addressElement: Element | null = null;
            for (const selector of addressSelectors) {
              const element = listing.querySelector(selector);
              if (element) {
                addressElement = element;
                break;
              }
            }
            
            const vicinity = addressElement && addressElement.textContent ? 
                            addressElement.textContent.trim() : '';
            
            // Create a place id (unique identifier for our purposes)
            const place_id = `gm-${Date.now()}-${index}`;
            
            // Try to extract business categories/types
            const typeSelectors = [
              'div.fontBodySmall',
              '.category',
              'span[jsinstance] span',
              '.W4Efsd div.fontBodyMedium:last-child'
            ];
            
            let typeElement: Element | null = null;
            for (const selector of typeSelectors) {
              const element = listing.querySelector(selector);
              if (element) {
                typeElement = element;
                break;
              }
            }
            
            const typeText = typeElement && typeElement.textContent ? 
                           typeElement.textContent.trim() : '';
            
            // Process type text to extract categories
            let types: string[] = ['business'];
            if (typeText) {
              // Handle cases where multiple categories are separated by dot, comma, or bullet
              types = typeText.split(/[•,.·]/).map(t => t.trim().toLowerCase().replace(/\s+/g, '_'))
                             .filter(t => t.length > 0);
            }
            
            // Check if business is open
            const statusSelectors = [
              'span.UxPEfe',
              'span.ZVIUdb',
              'span:contains("Open")',
              'span:contains("Closed")'
            ];
            
            let statusElement: Element | null = null;
            for (const selector of statusSelectors) {
              try {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                  if (el.textContent && 
                      (el.textContent.includes('Open') || 
                       el.textContent.includes('Closed'))) {
                    statusElement = el;
                    break;
                  }
                }
                if (statusElement) break;
              } catch (e) {
                // Ignore errors from :contains pseudo-selector
              }
            }
            
            const business_status = statusElement && statusElement.textContent ? 
                                  (statusElement.textContent.includes('Open') ? 'OPERATIONAL' : 'CLOSED') : 
                                  'UNKNOWN';
            
            // Extract rating if available
            const ratingSelectors = [
              '.EB7znd',
              '.RDApEe',
              'span.MW4etd',
              'span[role="img"]'
            ];
            
            let ratingElement: Element | null = null;
            for (const selector of ratingSelectors) {
              const element = listing.querySelector(selector);
              if (element) {
                ratingElement = element;
                break;
              }
            }
            
            let rating = null;
            if (ratingElement) {
              const ratingText = ratingElement.getAttribute('aria-label') || ratingElement.textContent;
              if (ratingText) {
                const match = ratingText.match(/(\d+\.\d+)/);
                if (match) {
                  rating = parseFloat(match[1]);
                }
              }
            }
            
            // Look for link to extract place_id
            const linkSelectors = [
              'a[href*="place/"]',
              'a[href*="maps/place/"]',
              'a[data-value]'
            ];
            
            let realPlaceId = null;
            for (const selector of linkSelectors) {
              const element = listing.querySelector(selector);
              if (element) {
                const href = element.getAttribute('href');
                if (href) {
                  const placeMatch = href.match(/place\/[^\/]+\/([\w\d-]+)/);
                  if (placeMatch && placeMatch[1]) {
                    realPlaceId = placeMatch[1];
                    break;
                  }
                }
              }
            }
            
            // Add the business to our results
            results.push({
              place_id: realPlaceId || place_id,
              name,
              formatted_address: vicinity,
              vicinity,
              business_status,
              types,
              rating
            });
          } catch (e) {
            // Skip this item if we encounter an error
            console.error('Error extracting business data:', e);
          }
        });
        
        return results;
      });
      
      console.log(`Found ${businesses.length} businesses via Google Maps scraping`);
      
      // Close the browser
      await browser.close();
      
      return businesses;
    } catch (error) {
      console.error('Error during Google Maps scraping:', error);
      if (browser) await browser.close();
      return [];
    }
  }
  
  /**
   * Get detailed information about a specific business on Google Maps
   * @param businessName The name of the business
   * @param location Optional location for more specific search
   */
  async getBusinessDetails(businessName: string, location?: string) {
    console.log(`Getting detailed Google Maps info for: ${businessName} ${location ? 'in ' + location : ''}`);
    
    let browser: puppeteer.Browser | null = null;
    
    try {
      // Create the search query
      const searchQuery = location ? 
        `${businessName} ${location}` : 
        businessName;
      
      // Launch puppeteer browser
      browser = await puppeteerWrapper.launch();
      const page = await puppeteerWrapper.createPage(browser);
      
      // Navigate to Google Maps with the search query
      const encodedQuery = encodeURIComponent(searchQuery);
      await puppeteerWrapper.navigate(page, `https://www.google.com/maps/search/${encodedQuery}`);
      
      // Wait for results
      await puppeteerWrapper.randomDelay(page, 3000, 5000);
      
      // Check if we hit a CAPTCHA
      const hasCaptcha = await (page as any).checkForCaptcha();
      if (hasCaptcha) {
        console.error('CAPTCHA detected on Google Maps. Unable to proceed with scraping.');
        await browser.close();
        return null;
      }
      
      // Click on the first result to open the details panel
      const firstResultSelector = 'div[role="feed"] > div:first-child, .section-result:first-child, div.Nv2PK:first-child';
      await puppeteerWrapper.clickElement(page, firstResultSelector);
      
      // Wait for details panel to load
      await puppeteerWrapper.randomDelay(page, 3000, 5000);
      
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
        const nameSelectors = ['h1', '.DUwDvf', '.fontHeadlineLarge'];
        for (const selector of nameSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            info.name = element.textContent.trim();
            break;
          }
        }
        
        // Extract address
        const addressSelectors = [
          'button[data-item-id="address"]', 
          'button[aria-label*="Address"]',
          'button[data-tooltip="Copy address"]',
          '.rogA2c'
        ];
        
        for (const selector of addressSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            const addressText = element.textContent.trim();
            info.address = addressText.replace('Address:', '').trim();
            break;
          }
        }
        
        // Extract phone number
        const phoneSelectors = [
          'button[data-item-id="phone"]',
          'button[aria-label*="Phone"]',
          'button[data-tooltip="Copy phone number"]',
          'button[aria-label*="Call phone number"]'
        ];
        
        for (const selector of phoneSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            const phoneText = element.textContent.trim();
            info.phone = phoneText.replace('Phone:', '').trim();
            break;
          }
        }
        
        // Extract website
        const websiteSelectors = [
          'a[data-item-id="authority"]',
          'a[aria-label*="website"]',
          'a[data-tooltip="Open website"]',
          'a[aria-label*="Website"]'
        ];
        
        for (const selector of websiteSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            info.website = element.getAttribute('href') || '';
            break;
          }
        }
        
        // Extract business hours
        const hoursSelectors = [
          '.OMl5r .eK4R0e',
          '.OMl5r .o0Svhf',
          '.section-info-hour-text',
          '.section-info-hour-text-holiday-hours'
        ];
        
        for (const selector of hoursSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach(el => {
              if (el.textContent) {
                info.business_hours.push(el.textContent.trim());
              }
            });
            break;
          }
        }
        
        // Extract categories
        const categorySelectors = [
          '.LBgpqf',
          '.Y5hP7e',
          '.section-rating-term'
        ];
        
        for (const selector of categorySelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach(el => {
              if (el.textContent) {
                info.categories.push(el.textContent.trim());
              }
            });
            break;
          }
        }
        
        // Extract rating
        const ratingSelectors = [
          '.jANrlb', 
          '.section-rating-term-star', 
          'span[aria-label*="stars"]'
        ];
        
        for (const selector of ratingSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const ratingText = element.getAttribute('aria-label') || element.textContent;
            if (ratingText) {
              const match = ratingText.match(/(\d+(\.\d+)?)/);
              if (match) {
                info.rating = parseFloat(match[1]);
                break;
              }
            }
          }
        }
        
        // Extract review count
        const reviewsSelectors = [
          '.DkEaL',
          '.fontBodySmall.sdp38c',
          'button[aria-label*="review"]'
        ];
        
        for (const selector of reviewsSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            const reviewsText = element.textContent.trim();
            const match = reviewsText.match(/(\d+(?:,\d+)?)/);
            if (match) {
              info.reviews_count = parseInt(match[1].replace(',', ''));
              break;
            }
          }
        }
        
        return info;
      });
      
      // If we have a business name, create basic contacts
      if (businessInfo.name) {
        // Basic contact for the business
        const mainContact = {
          name: `Contact at ${businessInfo.name}`,
          position: 'Business Representative',
          email: null,
          phone: businessInfo.phone || null,
          isDecisionMaker: true
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
      console.error('Error during Google Maps business info scraping:', error);
      if (browser) await browser.close();
      return null;
    }
  }
}

// Export singleton instance
export const googleMapsScraper = new GoogleMapsScraper();