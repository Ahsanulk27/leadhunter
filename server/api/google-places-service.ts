import axios from 'axios';
import * as puppeteer from 'puppeteer';

/**
 * Service for fetching real business data from Google Places API
 * This service only accesses publicly available information that businesses 
 * have explicitly shared on Google.
 */
export class GooglePlacesService {
  private apiKey: string;
  
  constructor() {
    // In a real implementation, this would come from environment variables
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  }
  
  /**
   * Search for businesses by industry/category and location
   * Only returns publicly available information
   */
  async searchBusinesses(params: {
    industry?: string;
    location?: string;
    companyName?: string;
  }) {
    try {
      // Build search query
      let query = '';
      
      if (params.companyName) {
        query = params.companyName;
      } else if (params.industry && params.location) {
        query = `${params.industry} businesses in ${params.location}`;
      } else if (params.industry) {
        query = `${params.industry} businesses`;
      } else if (params.location) {
        query = `businesses in ${params.location}`;
      } else {
        query = 'top businesses';
      }
      
      console.log(`Would search Google Places for: "${query}"`);
      
      // Try to use the Places API if we have an API key
      if (this.apiKey) {
        try {
          const response = await axios.get(
            'https://maps.googleapis.com/maps/api/place/textsearch/json',
            {
              params: {
                query,
                key: this.apiKey
              }
            }
          );
          
          if (response.data && response.data.results && response.data.results.length > 0) {
            console.log(`Found ${response.data.results.length} businesses via Google Places API`);
            return response.data.results;
          }
        } catch (apiError) {
          console.error('Error calling Google Places API:', apiError);
        }
      }
      
      // If we don't have an API key or the API call failed, use web scraping
      // Use puppeteer to scrape Google Maps
      try {
        console.log('Attempting to scrape Google Maps for business data...');
        // Launch puppeteer browser
        const browser = await puppeteer.launch({
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
          const page = await browser.newPage();
          
          // Set a desktop user agent
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
          
          // Navigate to Google Maps with the search query
          await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, { waitUntil: 'networkidle2', timeout: 15000 });
          
          // Wait for results to load
          await page.waitForTimeout(3000);
          
          // Extract business data
          const businessResults = await page.evaluate(() => {
            const results = [];
            
            // Look for business listings
            const listings = document.querySelectorAll('div[role="feed"] > div, .section-result');
            
            listings.forEach((listing, index) => {
              try {
                // Get name
                const nameEl = listing.querySelector('h3, .section-result-title');
                let name = nameEl ? nameEl.textContent.trim() : '';
                
                // Get address/vicinity
                const addressEl = listing.querySelector('.section-result-location, div:not([class*="rating"]):not([class*="price"]):not([class*="section-result-title"])');
                let vicinity = addressEl ? addressEl.textContent.trim() : '';
                
                // Create a place_id
                const place_id = `scr-${Date.now()}-${index}`;
                
                // Get types if available
                const typeEl = listing.querySelector('.section-result-details, div:not(:first-child)');
                const types = typeEl ? [typeEl.textContent.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')] : ['business'];
                
                // Check if we have a valid business entry
                if (name) {
                  results.push({
                    place_id,
                    name,
                    formatted_address: vicinity,
                    vicinity,
                    business_status: 'OPERATIONAL',
                    types
                  });
                }
              } catch (e) {
                console.log('Error parsing listing:', e);
              }
            });
            
            return results;
          });
          
          // Close the browser
          await browser.close();
          
          if (businessResults && businessResults.length > 0) {
            console.log(`Found ${businessResults.length} businesses via web scraping`);
            return businessResults;
          }
          
          // If we didn't find any results, try a different approach
          return await this.scrapeBingLocal(query);
        } catch (pageError) {
          console.error('Error during Google Maps scraping:', pageError);
          await browser.close();
          
          // Try an alternative source
          return await this.scrapeBingLocal(query);
        }
      } catch (puppeteerError) {
        console.error('Error launching puppeteer:', puppeteerError);
        
        // Fallback to a different source
        return await this.scrapeBingLocal(query);
      }
    } catch (error) {
      console.error('Error searching businesses:', error);
      return [];
    }
  }
  
  /**
   * Scrape Bing Local for business listings as an alternative source
   */
  private async scrapeBingLocal(query: string) {
    try {
      console.log('Attempting to scrape Bing Local for business data...');
      
      // Use axios to scrape Bing Local search
      const response = await axios.get(`https://www.bing.com/maps?q=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      // Create a regex pattern to extract business data from the script tags
      const scriptPattern = /<script[^>]*>(\s*window\.INITIAL_DATA\s*=\s*)(.*?)(\s*;\s*<\/script>)/i;
      const match = response.data.match(scriptPattern);
      
      if (match && match[2]) {
        try {
          // Try to parse the JSON data
          const jsonData = JSON.parse(match[2]);
          const businesses = [];
          
          // Extract business listings from the JSON
          if (jsonData && jsonData.entities && jsonData.entities.results) {
            const listings = jsonData.entities.results;
            
            listings.forEach((listing: any, index: number) => {
              try {
                if (listing.name) {
                  businesses.push({
                    place_id: `bing-${Date.now()}-${index}`,
                    name: listing.name,
                    formatted_address: listing.address || '',
                    vicinity: listing.address || '',
                    business_status: 'OPERATIONAL',
                    types: [listing.category || 'business'],
                    website: listing.website || ''
                  });
                }
              } catch (e) {
                // Skip this listing
              }
            });
          }
          
          console.log(`Found ${businesses.length} businesses via Bing Local`);
          return businesses;
        } catch (jsonError) {
          console.error('Error parsing Bing data:', jsonError);
        }
      }
      
      // Fallback to a simple extraction
      return this.scrapeYellowPages(query);
    } catch (error) {
      console.error('Error scraping Bing Local:', error);
      return this.scrapeYellowPages(query);
    }
  }
  
  /**
   * Scrape YellowPages for business listings as a last resort
   * This is public to allow direct access from the search controller
   */
  async scrapeYellowPages(query: string) {
    try {
      console.log('Attempting to scrape YellowPages for business data...');
      
      // Extract search terms from query
      const terms = query.split(' ');
      let what = terms[0]; // Assume first term is the search term
      let where = 'US';
      
      // Look for location keywords
      for (const term of terms) {
        if (term.toLowerCase() === 'in') {
          const locationIndex = terms.indexOf(term);
          if (locationIndex !== -1 && locationIndex < terms.length - 1) {
            where = terms.slice(locationIndex + 1).join(' ');
            what = terms.slice(0, locationIndex).join(' ');
            break;
          }
        }
      }
      
      // Make URL safe
      const whatUrl = encodeURIComponent(what);
      const whereUrl = encodeURIComponent(where);
      
      // Search YellowPages
      const response = await axios.get(`https://www.yellowpages.com/search?search_terms=${whatUrl}&geo_location_terms=${whereUrl}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const $ = require('cheerio').load(response.data);
      const businesses = [];
      
      // Extract business listings
      $('.search-results .result').each((index: number, element: any) => {
        try {
          const nameElement = $(element).find('.business-name');
          const name = nameElement.text().trim();
          
          const addressElement = $(element).find('.street-address');
          const streetAddress = addressElement.text().trim();
          
          const localityElement = $(element).find('.locality');
          const locality = localityElement.text().trim();
          
          const address = (streetAddress && locality) ? `${streetAddress}, ${locality}` : (streetAddress || locality || '');
          
          const phoneElement = $(element).find('.phones');
          const phone = phoneElement.text().trim();
          
          const categoryElements = $(element).find('.categories a');
          const categories: string[] = [];
          categoryElements.each((_: number, catElement: any) => {
            categories.push($(catElement).text().trim());
          });
          
          const websiteElement = $(element).find('a.track-visit-website');
          let website = '';
          if (websiteElement.length) {
            const href = websiteElement.attr('href');
            if (href && href.includes('://')) {
              const url = new URL(href);
              website = url.searchParams.get('url') || '';
            }
          }
          
          if (name) {
            businesses.push({
              place_id: `yp-${Date.now()}-${index}`,
              name,
              formatted_address: address,
              vicinity: address,
              business_status: 'OPERATIONAL',
              types: categories.length ? categories.map(c => c.toLowerCase().replace(/[^a-z0-9]/g, '_')) : ['business'],
              website,
              phone
            });
          }
        } catch (e) {
          // Skip this business
        }
      });
      
      console.log(`Found ${businesses.length} businesses via YellowPages`);
      return businesses;
    } catch (error) {
      console.error('Error scraping YellowPages:', error);
      return [];
    }
  }
  
  /**
   * Get detailed information about a specific business
   * Only returns publicly available information
   */
  async getBusinessDetails(placeId: string) {
    try {
      // Try to use the Places API if we have an API key
      if (this.apiKey && placeId.indexOf('placeholder') === -1) {
        try {
          const response = await axios.get(
            'https://maps.googleapis.com/maps/api/place/details/json',
            {
              params: {
                place_id: placeId,
                fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,review,url',
                key: this.apiKey
              }
            }
          );
          
          if (response.data && response.data.result) {
            return response.data.result;
          }
        } catch (apiError) {
          console.error('Error calling Google Places Details API:', apiError);
        }
      }
      
      // If the API call failed or we don't have an API key, try to scrape for details
      // This depends on where the placeId came from
      if (placeId.startsWith('scr-') || placeId.startsWith('gs-') || placeId.startsWith('gl-')) {
        // This was from our Google scraping, so we don't need to re-scrape
        return null;
      } else if (placeId.startsWith('bing-')) {
        // This was from Bing, so we already have most details
        return null;
      } else if (placeId.startsWith('yp-')) {
        // This was from YellowPages, so we already have most details
        return null;
      }
      
      // Return null if we couldn't get details
      return null;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }
}

// Export singleton instance
export const googlePlacesService = new GooglePlacesService();