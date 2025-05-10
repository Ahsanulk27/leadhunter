import axios from 'axios';
import * as cheerio from 'cheerio';
import { getRandomUserAgent, getRandomDelay } from './scraper-utils';
import * as puppeteer from 'puppeteer';
import { puppeteerWrapper } from './puppeteer-wrapper';

/**
 * Service for scraping industry-specific business directories 
 * This service focuses on extracting publicly available business information
 * from industry-focused directories
 */
export class IndustryScraper {
  // Map of industries to their common directories
  private readonly industryDirectories: { [key: string]: string[] } = {
    'cleaning': [
      'https://www.cleaningbusinesstoday.com/directory',
      'https://www.cleanlink.com/directory',
      'https://www.issa.com/directory'
    ],
    'real_estate': [
      'https://www.nar.realtor/directories/find-a-realtor',
      'https://www.realtor.com/realestateagents',
      'https://www.zillow.com/professionals/real-estate-agent-reviews/'
    ],
    'insurance': [
      'https://www.trustedchoice.com/agent',
      'https://www.independentagent.com/Directory',
      'https://www.insurance.com/directory'
    ],
    'healthcare': [
      'https://www.healthgrades.com',
      'https://www.zocdoc.com',
      'https://www.webmd.com/health-insurance/insurance-doctor-directory'
    ],
    'construction': [
      'https://www.findabuilder.co.uk/directory',
      'https://www.homeadvisor.com/c.html',
      'https://www.buildzoom.com'
    ],
    'restaurants': [
      'https://www.opentable.com',
      'https://www.yelp.com/c/restaurants',
      'https://www.allmenus.com'
    ],
    'automotive': [
      'https://www.carwise.com/auto-body-shops',
      'https://www.autorepair.com',
      'https://www.aaa.com/autorepair'
    ],
    'legal': [
      'https://www.avvo.com',
      'https://www.findlaw.com',
      'https://www.lawyers.com'
    ],
    'marketing': [
      'https://clutch.co/agencies/digital-marketing',
      'https://www.sortlist.com/marketing',
      'https://agencyspotter.com'
    ],
    'retail': [
      'https://www.mallseeker.com',
      'https://www.retaildive.com/directory',
      'https://www.shopify.com/plus/customers'
    ]
  };
  
  // Default directories for any industry not specifically mapped
  private readonly defaultDirectories: string[] = [
    'https://www.chamberofcommerce.com/business-directory',
    'https://www.yellowpages.com',
    'https://www.businessdirectory.com',
    'https://www.manta.com',
    'https://www.thomasnet.com'
  ];
  
  /**
   * Search for businesses in a specific industry
   * @param industry The industry to search for
   * @param location Optional location to filter results
   */
  async searchIndustryDirectory(industry: string, location?: string): Promise<any[]> {
    console.log(`📍 IndustryScraper: Searching for ${industry} businesses ${location ? 'in ' + location : ''}`);
    
    // Normalize industry format
    const normalizedIndustry = industry.toLowerCase().replace(/\s+/g, '_');
    
    // Get industry-specific directories
    const directories = this.industryDirectories[normalizedIndustry] || this.defaultDirectories;
    
    // Track all businesses found across directories
    const businesses: any[] = [];
    
    // Try each directory until we find results
    for (const directoryUrl of directories) {
      try {
        console.log(`📍 IndustryScraper: Trying directory ${directoryUrl}`);
        
        // Attempt to get business listings
        const results = await this.scrapeDirectoryWithAxios(directoryUrl, industry, location);
        
        if (results && results.length > 0) {
          console.log(`📍 IndustryScraper: Found ${results.length} businesses from ${directoryUrl}`);
          businesses.push(...results);
          
          // If we found enough businesses, we can stop
          if (businesses.length >= 10) {
            break;
          }
        }
      } catch (error) {
        console.error(`Error scraping directory ${directoryUrl}:`, error);
      }
    }
    
    // If we didn't find enough businesses with Axios, try puppeteer with the first directory
    if (businesses.length < 5 && directories.length > 0) {
      try {
        console.log(`📍 IndustryScraper: Attempting puppeteer scrape for more results`);
        const puppeteerResults = await this.scrapeDirectoryWithPuppeteer(directories[0], industry, location);
        
        if (puppeteerResults && puppeteerResults.length > 0) {
          console.log(`📍 IndustryScraper: Found ${puppeteerResults.length} additional businesses with puppeteer`);
          businesses.push(...puppeteerResults);
        }
      } catch (puppeteerError) {
        console.error('Error with puppeteer directory scraping:', puppeteerError);
      }
    }
    
    return businesses;
  }
  
  /**
   * Scrape a business directory using Axios and Cheerio
   * @param directoryUrl The URL of the directory to scrape
   * @param industry The industry to search for
   * @param location Optional location to filter results
   */
  private async scrapeDirectoryWithAxios(directoryUrl: string, industry: string, location?: string): Promise<any[]> {
    try {
      // Modify URL to include search parameters if possible
      let searchUrl = directoryUrl;
      
      if (directoryUrl.includes('yellowpages.com')) {
        searchUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(industry)}${location ? '&geo_location_terms=' + encodeURIComponent(location) : ''}`;
      } else if (directoryUrl.includes('manta.com')) {
        searchUrl = `https://www.manta.com/search?search=${encodeURIComponent(industry + (location ? ' ' + location : ''))}`;
      } else if (directoryUrl.includes('chamberofcommerce.com')) {
        searchUrl = `https://www.chamberofcommerce.com/business-directory/search?term=${encodeURIComponent(industry)}${location ? '&location=' + encodeURIComponent(location) : ''}`;
      }
      
      console.log(`📍 IndustryScraper: Using Axios to scrape ${searchUrl}`);
      
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
        throw new Error(`Failed to fetch directory results: ${response.status}`);
      }
      
      const html = response.data;
      const $ = cheerio.load(html);
      
      // Try to identify business listings
      const businesses: any[] = [];
      
      // Common selectors for business listings across different directories
      const listingSelectors = [
        '.business-card',
        '.directory-listing',
        '.business-listing',
        '.search-result',
        '.company-card',
        '.listing',
        '.business',
        '.result'
      ];
      
      // Try different selectors to find results
      for (const selector of listingSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} listings with selector: ${selector}`);
          
          elements.each((i, el) => {
            try {
              // Try to extract business name
              const nameElement = $(el).find('h2, h3, .name, .title, .business-name').first();
              const name = nameElement.text().trim();
              
              if (name) {
                // Try to extract address
                const addressElement = $(el).find('.address, .location, [itemprop="address"]');
                const address = addressElement.text().trim();
                
                // Try to extract phone
                const phoneElement = $(el).find('.phone, .telephone, [itemprop="telephone"]');
                const phone = phoneElement.text().trim();
                
                // Try to extract website
                const websiteElement = $(el).find('a.website, a.web, a[href*="http"]').first();
                const website = websiteElement.attr('href');
                
                // Create a unique ID for this business
                const place_id = `dir-${Date.now()}-${i}`;
                
                // Add to business list
                businesses.push({
                  place_id,
                  name,
                  formatted_address: address,
                  vicinity: address,
                  phone,
                  website,
                  types: [industry],
                  business_status: 'OPERATIONAL'
                });
              }
            } catch (itemError) {
              console.error('Error extracting directory business data:', itemError);
            }
          });
          
          // If we found businesses with this selector, stop trying others
          if (businesses.length > 0) {
            break;
          }
        }
      }
      
      // If we couldn't find businesses with known selectors, try a more generic approach
      if (businesses.length === 0) {
        // Look for elements that might contain business info
        $('div, li').each((i, el) => {
          // Only process elements that might be business listings
          const html = $(el).html() || '';
          
          // Skip if the element is too small or too large to be a listing
          if (html.length < 50 || html.length > 5000) return;
          
          // Check if it contains both a business name pattern and contact info
          const hasNamePattern = html.includes('</h') || html.includes('class="name"') || html.includes('class="title"');
          const hasContactPattern = html.includes('address') || html.includes('phone') || html.includes('tel:') || html.includes('map');
          
          if (hasNamePattern && hasContactPattern) {
            try {
              // Look for what might be a business name
              const nameElement = $(el).find('h1, h2, h3, h4, .name, .title, strong').first();
              const name = nameElement.text().trim();
              
              if (name && name.length > 3 && name.length < 100) {
                // Try to find an address
                const addressPattern = /\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}/;
                const htmlText = $(el).text();
                const addressMatch = htmlText.match(addressPattern);
                const address = addressMatch ? addressMatch[0] : '';
                
                // Try to find a phone number
                const phonePattern = /\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/;
                const phoneMatch = htmlText.match(phonePattern);
                const phone = phoneMatch ? phoneMatch[0] : '';
                
                // Add to business list if it has at least a name and another piece of info
                if (address || phone) {
                  const place_id = `dir-gen-${Date.now()}-${i}`;
                  
                  businesses.push({
                    place_id,
                    name,
                    formatted_address: address,
                    vicinity: address,
                    phone,
                    types: [industry],
                    business_status: 'OPERATIONAL'
                  });
                }
              }
            } catch (error) {
              // Skip this element if we encounter an error
            }
          }
        });
      }
      
      return businesses;
    } catch (error) {
      console.error(`Error scraping directory with Axios: ${directoryUrl}`, error);
      return [];
    }
  }
  
  /**
   * Scrape a business directory using Puppeteer for more complex sites
   * @param directoryUrl The URL of the directory to scrape
   * @param industry The industry to search for
   * @param location Optional location to filter results
   */
  private async scrapeDirectoryWithPuppeteer(directoryUrl: string, industry: string, location?: string): Promise<any[]> {
    console.log(`📍 IndustryScraper: Using Puppeteer to scrape ${directoryUrl}`);
    
    let browser: puppeteer.Browser | null = null;
    
    try {
      // Modify URL to include search parameters if possible
      let searchUrl = directoryUrl;
      
      if (directoryUrl.includes('yellowpages.com')) {
        searchUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(industry)}${location ? '&geo_location_terms=' + encodeURIComponent(location) : ''}`;
      } else if (directoryUrl.includes('manta.com')) {
        searchUrl = `https://www.manta.com/search?search=${encodeURIComponent(industry + (location ? ' ' + location : ''))}`;
      } else if (directoryUrl.includes('chamberofcommerce.com')) {
        searchUrl = `https://www.chamberofcommerce.com/business-directory/search?term=${encodeURIComponent(industry)}${location ? '&location=' + encodeURIComponent(location) : ''}`;
      }
      
      // Launch puppeteer browser
      browser = await puppeteerWrapper.launch();
      const page = await puppeteerWrapper.createPage(browser);
      
      // Navigate to the search URL
      await puppeteerWrapper.navigate(page, searchUrl);
      
      // Wait for results to load
      await puppeteerWrapper.randomDelay(page, 3000, 5000);
      
      // Check if we hit a CAPTCHA
      const hasCaptcha = await (page as any).checkForCaptcha();
      if (hasCaptcha) {
        console.error('CAPTCHA detected on directory. Unable to proceed with scraping.');
        await browser.close();
        return [];
      }
      
      // Take a screenshot for debugging
      try {
        await page.screenshot({ path: './directory-screenshot.png' });
        console.log(`📍 IndustryScraper: Captured screenshot of directory search results`);
      } catch (screenshotError) {
        console.error('Error taking screenshot:', screenshotError);
      }
      
      // Wait for any search results to appear
      await puppeteerWrapper.randomDelay(page, 2000, 4000);
      
      // Extract business data from the search results
      const businesses = await page.evaluate((industry) => {
        const results: any[] = [];
        
        // Common selectors for business listings across different directories
        const listingSelectors = [
          '.business-card',
          '.directory-listing',
          '.business-listing',
          '.search-result',
          '.company-card',
          '.listing',
          '.business',
          '.result',
          'div[itemtype*="LocalBusiness"]',
          '[data-testid="search-result"]'
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
        
        // If we found elements, extract data
        if (elements && elements.length > 0) {
          Array.from(elements).forEach((el, index) => {
            try {
              // Try to extract business name using common selectors
              const nameSelectors = [
                'h2', 'h3', '.name', '.title', '.business-name', 
                '[itemprop="name"]', '.company-name', 'a.name'
              ];
              
              let nameEl: Element | null = null;
              for (const selector of nameSelectors) {
                const element = el.querySelector(selector);
                if (element) {
                  nameEl = element;
                  break;
                }
              }
              
              // Only proceed if we found a name
              if (nameEl && nameEl.textContent) {
                const name = nameEl.textContent.trim();
                
                // Extract address if available
                const addressSelectors = [
                  '.address', '.location', '[itemprop="address"]',
                  '.street-address', '.adr', '.contact-info address'
                ];
                
                let address = '';
                for (const selector of addressSelectors) {
                  const addressEl = el.querySelector(selector);
                  if (addressEl && addressEl.textContent) {
                    address = addressEl.textContent.trim();
                    break;
                  }
                }
                
                // Extract phone if available
                const phoneSelectors = [
                  '.phone', '.telephone', '[itemprop="telephone"]',
                  '.contact-info .phone', '[href^="tel:"]', '.phone-number'
                ];
                
                let phone = '';
                for (const selector of phoneSelectors) {
                  const phoneEl = el.querySelector(selector);
                  if (phoneEl && phoneEl.textContent) {
                    phone = phoneEl.textContent.trim();
                    break;
                  }
                }
                
                // Extract website if available
                const linkSelectors = [
                  'a.website', 'a.web', '.website a', 
                  'a[href*="http"]', '[itemprop="url"]'
                ];
                
                let website = '';
                for (const selector of linkSelectors) {
                  const websiteEl = el.querySelector(selector);
                  if (websiteEl && websiteEl instanceof HTMLAnchorElement) {
                    website = websiteEl.href;
                    break;
                  }
                }
                
                // Create a place_id (unique identifier for our purposes)
                const place_id = `dir-pup-${Date.now()}-${index}`;
                
                // Add the business to our results
                results.push({
                  place_id,
                  name,
                  formatted_address: address,
                  vicinity: address,
                  phone,
                  website,
                  types: [industry],
                  business_status: 'OPERATIONAL'
                });
              }
            } catch (e) {
              // Skip this item if we encounter an error
              console.error('Error extracting business data:', e);
            }
          });
        }
        
        return results;
      }, industry);
      
      // Close the browser
      await browser.close();
      
      console.log(`Found ${businesses.length} businesses from directory using Puppeteer`);
      return businesses;
    } catch (error) {
      console.error('Error during directory scraping with Puppeteer:', error);
      if (browser) await browser.close();
      return [];
    }
  }
  
  /**
   * Get detailed information about a specific business
   * @param businessName Business name to search for
   * @param industry Industry for context
   * @param location Optional location for better targeting
   */
  async getBusinessDetails(businessName: string, industry?: string, location?: string): Promise<any> {
    console.log(`📍 IndustryScraper: Getting details for ${businessName} in ${industry || 'unknown industry'}`);
    
    let browser: puppeteer.Browser | null = null;
    
    try {
      // Create search query for business
      const searchQuery = `${businessName} ${industry || ''} ${location || ''}`.trim();
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      // Launch puppeteer browser
      browser = await puppeteerWrapper.launch();
      const page = await puppeteerWrapper.createPage(browser);
      
      // Navigate to search
      await puppeteerWrapper.navigate(page, searchUrl);
      
      // Wait for results to load
      await puppeteerWrapper.randomDelay(page, 2000, 4000);
      
      // Check for CAPTCHA
      const hasCaptcha = await (page as any).checkForCaptcha();
      if (hasCaptcha) {
        console.error('CAPTCHA detected on Google. Unable to proceed with scraping.');
        await browser.close();
        return null;
      }
      
      // Take a screenshot for debugging
      try {
        await page.screenshot({ path: './business-search-screenshot.png' });
        console.log(`📍 IndustryScraper: Captured screenshot of business search results`);
      } catch (screenshotError) {
        console.error('Error taking screenshot:', screenshotError);
      }
      
      // Look for a knowledge panel or top result for the business
      const businessInfo = await page.evaluate((businessName) => {
        // Initialize results
        const info: any = {
          name: businessName,
          address: '',
          phone: '',
          website: '',
          business_hours: [],
          categories: [],
          description: '',
          contacts: []
        };
        
        // First try to extract from Knowledge Panel
        const knowledgePanelSelectors = [
          '.kp-header', 
          '.knowledge-panel',
          '.I6TXqe',
          '.TzHB6b',
          '.ruhjFe'
        ];
        
        for (const selector of knowledgePanelSelectors) {
          const panel = document.querySelector(selector);
          if (panel) {
            // If we found the knowledge panel, try to extract business details
            
            // Get the title (business name)
            const titleEl = panel.querySelector('h2, h3, [data-attrid="title"]');
            if (titleEl && titleEl.textContent) {
              info.name = titleEl.textContent.trim();
            }
            
            // Get address
            const addressEl = panel.querySelector('[data-attrid*="address"] span:last-child, .address');
            if (addressEl && addressEl.textContent) {
              info.address = addressEl.textContent.trim();
            }
            
            // Get phone
            const phoneEl = panel.querySelector('[data-attrid*="phone"] span:last-child, .phone');
            if (phoneEl && phoneEl.textContent) {
              info.phone = phoneEl.textContent.trim();
            }
            
            // Get website
            const websiteEl = panel.querySelector('a[href*="http"]:not([href*="google"])');
            if (websiteEl && websiteEl instanceof HTMLAnchorElement) {
              info.website = websiteEl.href;
            }
            
            // Get hours
            const hoursEls = panel.querySelectorAll('[data-attrid*="hours"] td');
            if (hoursEls.length > 0) {
              Array.from(hoursEls).forEach(el => {
                if (el.textContent) {
                  info.business_hours.push(el.textContent.trim());
                }
              });
            }
            
            // Get category/industry
            const categoryEl = panel.querySelector('[data-attrid*="category"]');
            if (categoryEl && categoryEl.textContent) {
              info.categories.push(categoryEl.textContent.trim());
            }
            
            // Get description
            const descEl = panel.querySelector('.kno-rdesc span');
            if (descEl && descEl.textContent) {
              info.description = descEl.textContent.trim();
            }
            
            break;
          }
        }
        
        // If we didn't find info in knowledge panel, try organic search results
        if (!info.address && !info.phone) {
          const searchResults = document.querySelectorAll('.g');
          
          if (searchResults.length > 0) {
            // Just use the first result that seems to match our business
            for (const result of Array.from(searchResults)) {
              const titleEl = result.querySelector('h3');
              
              if (titleEl && titleEl.textContent && 
                  titleEl.textContent.toLowerCase().includes(businessName.toLowerCase())) {
                
                // Found a matching result
                info.name = titleEl.textContent.trim();
                
                // Extract URL
                const linkEl = result.querySelector('a');
                if (linkEl && linkEl instanceof HTMLAnchorElement) {
                  info.website = linkEl.href;
                }
                
                // Extract snippet
                const snippetEl = result.querySelector('.VwiC3b, .st');
                if (snippetEl && snippetEl.textContent) {
                  info.description = snippetEl.textContent.trim();
                  
                  // Try to extract details from snippet
                  const text = snippetEl.textContent;
                  
                  // Look for address pattern
                  const addressPattern = /\d+[^,]+,[^,]+, [A-Z]{2}( \d{5})?/;
                  const addressMatch = text.match(addressPattern);
                  if (addressMatch) {
                    info.address = addressMatch[0];
                  }
                  
                  // Look for phone pattern
                  const phonePattern = /\(\d{3}\) \d{3}-\d{4}|\d{3}-\d{3}-\d{4}/;
                  const phoneMatch = text.match(phonePattern);
                  if (phoneMatch) {
                    info.phone = phoneMatch[0];
                  }
                }
                
                break;
              }
            }
          }
        }
        
        return info;
      }, businessName);
      
      // If we found a name, create basic contact
      if (businessInfo.name) {
        // Create a basic business contact
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
          notes: 'Contact information from business directory.'
        };
        
        businessInfo.contacts = [mainContact];
      }
      
      // Close the browser
      await browser.close();
      return businessInfo;
    } catch (error) {
      console.error('Error getting business details:', error);
      if (browser) await browser.close();
      return null;
    }
  }
}

// Export singleton instance
export const industryScraper = new IndustryScraper();