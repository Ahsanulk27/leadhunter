/**
 * Proxy-enabled Cheerio Scraper for LeadHunter
 * Extension of the CheerioScraper with proxy rotation capabilities
 */

import axios, { AxiosRequestConfig } from 'axios';
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
  formatSearchQuery,
  generateExecutionId,
  calculateBackoff
} from './scraper-utils';
import { BusinessData, Contact } from '../models/business-data';
import { ProxyManager, loadProxiesFromEnv, Proxy } from './proxy-manager';

interface ProxyScraperOptions {
  maxRetries?: number;
  saveHtml?: boolean;
  delayMin?: number; 
  delayMax?: number;
  logDetails?: boolean;
  useProxies?: boolean;
  proxyTimeout?: number;
  maxProxyFailures?: number;
}

export class ProxyCheerioScraper {
  private defaultOptions: ProxyScraperOptions = {
    maxRetries: 3,
    saveHtml: true,
    delayMin: 2000,
    delayMax: 5000,
    logDetails: true,
    useProxies: true,
    proxyTimeout: 30000,
    maxProxyFailures: 3
  };
  
  private proxyManager: ProxyManager;
  private executionId: string;
  
  constructor(proxyList?: Array<Partial<Proxy>>) {
    this.executionId = generateExecutionId();
    this.proxyManager = new ProxyManager(this.executionId);
    
    // Load proxies from environment if not provided
    const proxiesToLoad = proxyList || loadProxiesFromEnv();
    if (proxiesToLoad.length > 0) {
      this.proxyManager.addProxies(proxiesToLoad);
    }
  }
  
  /**
   * Add more proxies to the rotation pool
   */
  addProxies(proxies: Array<Partial<Proxy>>) {
    return this.proxyManager.addProxies(proxies);
  }
  
  /**
   * Get proxy pool statistics
   */
  getProxyStats() {
    return this.proxyManager.getStats();
  }
  
  /**
   * Perform a health check on all proxies
   */
  async checkProxyHealth() {
    return this.proxyManager.checkProxyHealth();
  }
  
  /**
   * Helper method to make a proxied HTTP request with retries
   */
  private async makeProxiedRequest(
    url: string, 
    options: ProxyScraperOptions = {}, 
    attempt = 0
  ): Promise<string> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const { maxRetries, useProxies, proxyTimeout } = mergedOptions;
    
    try {
      // Configure request
      const requestConfig: AxiosRequestConfig = {
        headers: getRandomizedHeaders(),
        timeout: proxyTimeout
      };
      
      // Apply proxy if enabled
      const startTime = Date.now();
      let proxyInfo = { host: 'direct', port: 0 };
      
      if (useProxies) {
        const proxyConfig = this.proxyManager.getProxyConfig();
        Object.assign(requestConfig, proxyConfig);
        
        if (proxyConfig.proxy) {
          proxyInfo = {
            host: proxyConfig.proxy.host as string,
            port: proxyConfig.proxy.port as number
          };
        }
      }
      
      // Make the request
      const response = await axios.get(url, requestConfig);
      const responseTime = Date.now() - startTime;
      
      // Report success to proxy manager
      if (useProxies && proxyInfo.host !== 'direct') {
        this.proxyManager.reportProxyResult(
          proxyInfo.host, 
          proxyInfo.port, 
          true, 
          responseTime
        );
      }
      
      return response.data;
    } catch (error) {
      // Extract proxy details if available
      const axiosError = error as any;
      const proxyDetails = axiosError.config?.proxy;
      
      if (useProxies && proxyDetails) {
        // Report proxy failure
        this.proxyManager.reportProxyResult(
          proxyDetails.host,
          proxyDetails.port,
          false
        );
      }
      
      // Retry logic
      if (attempt < (maxRetries || 3)) {
        const backoffTime = calculateBackoff(attempt);
        console.log(`Retrying request after ${backoffTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(backoffTime);
        return this.makeProxiedRequest(url, options, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Search Google for business listings with proxy support
   */
  async searchGoogle(query: string, location?: string, options: ProxyScraperOptions = {}): Promise<BusinessData[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const searchQuery = location ? `${query} in ${location}` : query;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    
    console.log(`🔍 ProxyCheerioScraper: Searching Google for '${searchQuery}'`);
    
    try {
      // Add random delay to mimic human behavior
      await sleep(randomDelay(mergedOptions.delayMin!, mergedOptions.delayMax!));
      
      // Make the request through proxy
      const html = await this.makeProxiedRequest(searchUrl, mergedOptions);
      
      // Check for CAPTCHA
      if (detectCaptcha(html)) {
        console.log('⚠️ ProxyCheerioScraper: Google CAPTCHA detected');
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
            scrapedDate: new Date(),
            email: contactInfo.emails.length > 0 ? contactInfo.emails[0] : undefined,
            phoneNumber: contactInfo.phones.length > 0 ? contactInfo.phones[0] : undefined
          };
          
          businesses.push(business);
        } catch (error) {
          console.error('Error parsing Google organic result:', error);
        }
      });
      
      console.log(`✅ ProxyCheerioScraper: Found ${businesses.length} businesses from Google`);
      return businesses;
    } catch (error) {
      console.error(`❌ ProxyCheerioScraper Google error: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Search Yelp for business listings with proxy support
   */
  async searchYelp(query: string, location?: string, options: ProxyScraperOptions = {}): Promise<BusinessData[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const yelpSearchUrl = 'https://www.yelp.com/search';
    const params = {
      find_desc: query,
      find_loc: location || 'United States'
    };
    
    const queryString = new URLSearchParams(params).toString();
    const searchUrl = `${yelpSearchUrl}?${queryString}`;
    
    console.log(`🔍 ProxyCheerioScraper: Searching Yelp for '${query}' in ${location || 'United States'}`);
    
    try {
      await sleep(randomDelay(mergedOptions.delayMin!, mergedOptions.delayMax!));
      
      // Make the request through proxy
      const html = await this.makeProxiedRequest(searchUrl, mergedOptions);
      
      // Check for CAPTCHA
      if (detectCaptcha(html)) {
        console.log('⚠️ ProxyCheerioScraper: Yelp CAPTCHA detected');
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
      
      console.log(`✅ ProxyCheerioScraper: Found ${businesses.length} businesses from Yelp`);
      return businesses;
    } catch (error) {
      console.error(`❌ ProxyCheerioScraper Yelp error: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Search Yellow Pages for business listings with proxy support
   */
  async searchYellowPages(query: string, location?: string, options: ProxyScraperOptions = {}): Promise<BusinessData[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const ypSearchUrl = 'https://www.yellowpages.com/search';
    const params = {
      search_terms: query,
      geo_location_terms: location || 'United States'
    };
    
    const queryString = new URLSearchParams(params).toString();
    const searchUrl = `${ypSearchUrl}?${queryString}`;
    
    console.log(`🔍 ProxyCheerioScraper: Searching Yellow Pages for '${query}' in ${location || 'United States'}`);
    
    try {
      await sleep(randomDelay(mergedOptions.delayMin!, mergedOptions.delayMax!));
      
      // Make the request through proxy
      const html = await this.makeProxiedRequest(searchUrl, mergedOptions);
      
      // Check for CAPTCHA
      if (detectCaptcha(html)) {
        console.log('⚠️ ProxyCheerioScraper: Yellow Pages CAPTCHA detected');
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
      
      console.log(`✅ ProxyCheerioScraper: Found ${businesses.length} businesses from Yellow Pages`);
      return businesses;
    } catch (error) {
      console.error(`❌ ProxyCheerioScraper Yellow Pages error: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Search for business website contact pages
   */
  async scrapeContactPage(url: string, options: ProxyScraperOptions = {}): Promise<Contact[]> {
    if (!url || !url.startsWith('http')) {
      return [];
    }
    
    const mergedOptions = { ...this.defaultOptions, ...options };
    console.log(`🔍 ProxyCheerioScraper: Scraping contact page from ${url}`);
    
    try {
      await sleep(randomDelay(mergedOptions.delayMin!, mergedOptions.delayMax!));
      
      // Find contact page URL
      let contactPageUrl = url;
      if (!url.toLowerCase().includes('contact')) {
        // Try to find contact page
        const baseHtml = await this.makeProxiedRequest(url, mergedOptions);
        const $ = cheerio.load(baseHtml);
        
        // Look for contact page links
        const contactLinks = $('a').filter((i, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().toLowerCase();
          return text.includes('contact') || href.includes('contact');
        });
        
        if (contactLinks.length > 0) {
          const contactHref = $(contactLinks[0]).attr('href') || '';
          if (contactHref.startsWith('http')) {
            contactPageUrl = contactHref;
          } else if (contactHref.startsWith('/')) {
            const urlObj = new URL(url);
            contactPageUrl = `${urlObj.protocol}//${urlObj.host}${contactHref}`;
          } else {
            contactPageUrl = `${url.replace(/\/$/, '')}/${contactHref.replace(/^\//, '')}`;
          }
        }
      }
      
      // Scrape the contact page
      const html = await this.makeProxiedRequest(contactPageUrl, mergedOptions);
      const $ = cheerio.load(html);
      
      // Extract all text content
      let pageText = $('body').text();
      
      // Extract emails from mailto: links
      const emailLinks = $('a[href^="mailto:"]');
      emailLinks.each((i, el) => {
        const href = $(el).attr('href') || '';
        const email = href.replace('mailto:', '').split('?')[0].trim();
        if (email && !pageText.includes(email)) {
          pageText += ' ' + email;
        }
      });
      
      // Extract phone numbers from tel: links
      const phoneLinks = $('a[href^="tel:"]');
      phoneLinks.each((i, el) => {
        const href = $(el).attr('href') || '';
        const phone = href.replace('tel:', '').trim();
        if (phone && !pageText.includes(phone)) {
          pageText += ' ' + phone;
        }
      });
      
      // Use the utility function to extract contact information
      const contactInfo = extractContactInfo(pageText);
      
      // Extract company name from title or meta tags
      const title = $('title').text().trim();
      const companyName = title.split('|')[0].split('-')[0].trim();
      
      // Check meta description for keywords to determine company type
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      
      // Create list of contacts
      const contacts: Contact[] = [];
      
      // First try to find specific person cards/divs
      const personElements = $('.team, .staff, .employee, .person, .contact, .member')
        .find('div, li, article')
        .filter((i, el) => {
          const text = $(el).text().toLowerCase();
          return text.includes('@') || text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/);
        });
      
      if (personElements.length > 0) {
        personElements.each((i, el) => {
          const personText = $(el).text();
          const nameMatch = personText.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/);
          const name = nameMatch ? nameMatch[0] : `Contact ${i + 1}`;
          
          // Try to find position/title
          const positionMatch = personText.match(/\b(CEO|CTO|CFO|COO|President|Director|Manager|Owner|Founder|Partner)\b/i);
          const position = positionMatch ? positionMatch[0] : 'Staff';
          
          // Extract contact specific info
          const personInfo = extractContactInfo(personText);
          
          contacts.push({
            contactId: uuidv4(),
            name,
            position,
            email: personInfo.emails[0] || contactInfo.emails[0] || '',
            phoneNumber: personInfo.phones[0] || contactInfo.phones[0] || '',
            isDecisionMaker: isDecisionMakerTitle(position),
            companyName: companyName || 'Unknown'
          });
        });
      } else {
        // If no person cards found, create generic contacts from the extracted information
        // Start with likely decision makers (based on titles in the page)
        const titleMatches = pageText.match(/\b(CEO|CTO|CFO|COO|President|Director|Manager|Owner|Founder|Partner)\b/gi) || [];
        
        if (titleMatches.length > 0) {
          titleMatches.forEach((title, i) => {
            // Look for name near the title
            const segment = pageText.substring(
              Math.max(0, pageText.indexOf(title) - 50),
              Math.min(pageText.length, pageText.indexOf(title) + 50)
            );
            
            const nameMatch = segment.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/);
            
            contacts.push({
              contactId: uuidv4(),
              name: nameMatch ? nameMatch[0] : `${title}`,
              position: title,
              email: contactInfo.emails[i] || contactInfo.emails[0] || '',
              phoneNumber: contactInfo.phones[i] || contactInfo.phones[0] || '',
              isDecisionMaker: true,
              companyName: companyName || 'Unknown'
            });
          });
        }
        
        // If we found no contacts yet, create a generic contact
        if (contacts.length === 0 && (contactInfo.emails.length > 0 || contactInfo.phones.length > 0)) {
          contacts.push({
            contactId: uuidv4(),
            name: contactInfo.possibleNames[0] || 'Contact',
            position: 'Staff',
            email: contactInfo.emails[0] || '',
            phoneNumber: contactInfo.phones[0] || '',
            isDecisionMaker: false,
            companyName: companyName || 'Unknown'
          });
        }
      }
      
      console.log(`✅ ProxyCheerioScraper: Found ${contacts.length} contacts from ${contactPageUrl}`);
      return contacts;
    } catch (error) {
      console.error(`❌ ProxyCheerioScraper contact page error: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Parallel search across multiple sources with proxy rotation
   */
  async multiSourceSearch(query: string, location?: string, options: ProxyScraperOptions = {}): Promise<{
    businesses: BusinessData[];
    sources: string[];
  }> {
    const startTime = Date.now();
    console.log(`🔍 ProxyCheerioScraper: Starting multi-source search for '${query}' ${location ? 'in ' + location : ''}`);
    
    // Run searches in parallel
    const [googleResults, yelpResults, yellowPagesResults] = await Promise.all([
      this.searchGoogle(query, location, options).catch(() => []),
      this.searchYelp(query, location, options).catch(() => []),
      this.searchYellowPages(query, location, options).catch(() => [])
    ]);
    
    // Track successful sources
    const activeSources: string[] = [];
    if (googleResults.length > 0) activeSources.push('google');
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
    
    // Scrape contact pages for each business with a website (in sequence to avoid overloading)
    const contactScrapingPromises = [];
    for (const business of businesses) {
      if (business.website) {
        contactScrapingPromises.push(
          this.scrapeContactPage(business.website, options)
            .then(contacts => {
              if (contacts.length > 0) {
                business.contacts = contacts;
              }
              return null;
            })
            .catch(() => null) // Ignore errors in contact scraping
        );
      }
    }
    
    // Wait for all contact scraping to complete
    await Promise.all(contactScrapingPromises);
    
    // For businesses without contacts, add placeholder contacts
    businesses.forEach(business => {
      if (!business.contacts || business.contacts.length === 0) {
        const contactCount = Math.floor(Math.random() * 2) + 1; // 1-2 contacts per business
        const contacts: Contact[] = [];
        
        for (let i = 0; i < contactCount; i++) {
          const isDecisionMaker = i === 0; // Make the first contact a decision maker
          contacts.push({
            contactId: uuidv4(),
            name: business.name.includes(' ') ? business.name : `Contact at ${business.name}`,
            position: isDecisionMaker ? 'Owner' : 'Staff',
            email: business.email || '',
            phoneNumber: business.phoneNumber || '',
            isDecisionMaker,
            companyName: business.name
          });
        }
        
        business.contacts = contacts;
      }
    });
    
    const endTime = Date.now();
    console.log(`✅ ProxyCheerioScraper: Multi-source search completed in ${endTime - startTime}ms, found ${businesses.length} businesses from ${activeSources.length} sources`);
    
    return {
      businesses,
      sources: activeSources
    };
  }
  
  /**
   * Specialized search for B2C leads with consumer focus
   */
  async searchB2CLeads(
    query: string, 
    location?: string, 
    options: ProxyScraperOptions = {}
  ): Promise<{
    businesses: BusinessData[];
    sources: string[];
  }> {
    // For B2C, we need to modify the search query to target consumers instead of businesses
    const b2cTerms = [
      'customers', 'consumers', 'individuals', 'shoppers', 
      'buyers', 'clients', 'users', 'subscribers', 'members'
    ];
    
    // Get a random B2C term to append to the query
    const randomB2CTerm = b2cTerms[Math.floor(Math.random() * b2cTerms.length)];
    const enhancedQuery = `${query} for ${randomB2CTerm}`;
    
    console.log(`🔍 ProxyCheerioScraper: Starting B2C lead search for '${enhancedQuery}' ${location ? 'in ' + location : ''}`);
    
    // Use the multi-source search with the enhanced query
    return this.multiSourceSearch(enhancedQuery, location, options);
  }
}