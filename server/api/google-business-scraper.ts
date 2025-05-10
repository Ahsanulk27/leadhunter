import axios from 'axios';
import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';

/**
 * Service for scraping publicly available business information from Google Business listings
 * Only extracts information that businesses have explicitly made public
 */
export class GoogleBusinessScraper {
  
  /**
   * Search for businesses on Google and extract publicly available data
   * @param query Search query for finding businesses
   */
  async searchBusinesses(query: string) {
    console.log(`Starting real web scraping for: ${query} on Google Maps/Business`);
    
    try {
      // Launch puppeteer
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        
        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate to Google Maps
        await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle2' });
        
        // Type into the search box
        await page.type('input#searchboxinput', query);
        
        // Click the search button
        await page.click('button#searchbox-searchbutton');
        
        // Wait for results to load
        await page.waitForSelector('div[role="feed"]', { timeout: 5000 }).catch(() => console.log('Feed not found, continuing anyway'));
        
        // Wait a moment for results to populate
        await page.waitForTimeout(2000);
        
        // Extract business data from the search results
        const businesses = await page.evaluate(() => {
          const results = [];
          
          // Get all business listing elements
          const listings = document.querySelectorAll('div[role="feed"] > div');
          
          // Process each listing
          listings.forEach((listing, index) => {
            try {
              // Extract name, may be in different elements depending on Google's current HTML structure
              const nameElement = listing.querySelector('div.fontHeadlineSmall span') || 
                                  listing.querySelector('h3') || 
                                  listing.querySelector('div[role="heading"]') ||
                                  listing.querySelector('a[aria-label]');
              
              const name = nameElement ? nameElement.textContent.trim() : `Business ${index + 1}`;
              
              // Extract address or vicinity information
              const addressElement = listing.querySelector('div.fontBodyMedium:not(:first-child)');
              const vicinity = addressElement ? addressElement.textContent.trim() : '';
              
              // Create a place id (not real, but needed for our interface)
              const place_id = `gl-${Date.now()}-${index}`;
              
              // Extract the business category/type if available
              const typeElement = listing.querySelector('div.fontBodySmall');
              const types = typeElement ? [typeElement.textContent.trim().toLowerCase()] : ['business'];
              
              // Check if business is open (look for "Open" text or hours)
              const statusElement = listing.querySelector('span:contains("Open")') || 
                                   listing.querySelector('span:contains("Closed")');
              const business_status = statusElement ? 
                                     (statusElement.textContent.includes('Open') ? 'OPERATIONAL' : 'CLOSED') : 
                                     'UNKNOWN';
              
              // Add the business to our results
              if (name && name !== 'Business ' + (index + 1)) {
                results.push({
                  place_id,
                  name,
                  formatted_address: vicinity,
                  vicinity,
                  business_status,
                  types
                });
              }
            } catch (e) {
              // Skip this item if we encounter an error
              console.log('Error extracting business data:', e);
            }
          });
          
          return results;
        });
        
        console.log(`Found ${businesses.length} businesses via Google Maps scraping`);
        
        // Close the browser
        await browser.close();
        
        return businesses;
      } catch (error) {
        console.error('Error during puppeteer scraping:', error);
        await browser.close();
        throw error;
      }
    } catch (error) {
      console.error('Error launching puppeteer:', error);
      
      // Try an alternative approach with Axios + Cheerio
      console.log('Attempting alternative scraping approach...');
      
      try {
        // Fallback to using Google Search instead of Maps
        const encodedQuery = encodeURIComponent(query + ' business');
        const response = await axios.get(`https://www.google.com/search?q=${encodedQuery}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        const businesses = [];
        
        // Extract business information from search results
        $('.g .yuRUbf, .g .mNOIFf').each((index, element) => {
          try {
            const titleElement = $(element).find('h3');
            const name = titleElement.text().trim();
            
            // Extract url to use as a unique ID
            const linkElement = $(element).find('a');
            const url = linkElement.attr('href');
            
            // Extract snippet which might contain address information
            const snippetElement = $(element).parent().find('.VwiC3b, .yXK7lf');
            const snippet = snippetElement.text().trim();
            
            // Try to find an address pattern in the snippet
            const addressMatch = snippet.match(/(\d+\s+[\w\s]+,\s+[\w\s]+,\s+\w+\s+\d+)|(\d+\s+[\w\s]+\s+St)|(\d+\s+[\w\s]+\s+Ave)/i);
            const vicinity = addressMatch ? addressMatch[0] : '';
            
            if (name) {
              businesses.push({
                place_id: `gs-${Date.now()}-${index}`,
                name,
                formatted_address: vicinity,
                vicinity: vicinity || 'Unknown location',
                business_status: 'OPERATIONAL',
                types: ['business'],
                website: url
              });
            }
          } catch (e) {
            console.log('Error extracting business from search results:', e);
          }
        });
        
        console.log(`Found ${businesses.length} businesses via Google Search fallback`);
        return businesses;
      } catch (fallbackError) {
        console.error('Fallback scraping failed:', fallbackError);
        return [];
      }
    }
  }
  
  /**
   * Extract business contact information from Google Business profile
   * Only extracts publicly available information
   * @param businessName The name of the business to look up
   * @param location Optional location to narrow search
   */
  async getBusinessContacts(businessName: string, location?: string) {
    console.log(`Scraping real business info for: ${businessName} ${location ? 'in ' + location : ''}`);
    
    try {
      // Create the search query
      const searchQuery = location ? 
        `${businessName} ${location}` : 
        businessName;
      
      // Launch puppeteer
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        
        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate to Google Maps
        await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, { waitUntil: 'networkidle2' });
        
        // Wait for results
        await page.waitForTimeout(2000);
        
        // Click on the first result to open the details panel
        await page.evaluate(() => {
          const firstResult = document.querySelector('div[role="feed"] > div');
          if (firstResult) {
            firstResult.click();
          }
        });
        
        // Wait for details to load
        await page.waitForTimeout(2000);
        
        // Extract business information
        const businessInfo = await page.evaluate(() => {
          // Initialize results
          const info = {
            name: '',
            address: '',
            phone: '',
            website: '',
            contacts: []
          };
          
          // Extract business name
          const nameElement = document.querySelector('h1');
          if (nameElement) {
            info.name = nameElement.textContent.trim();
          }
          
          // Extract address
          const addressElement = document.querySelector('button[data-item-id="address"]');
          if (addressElement) {
            info.address = addressElement.textContent.replace('Address:', '').trim();
          }
          
          // Extract phone number
          const phoneElement = document.querySelector('button[data-item-id="phone"]');
          if (phoneElement) {
            info.phone = phoneElement.textContent.replace('Phone:', '').trim();
          }
          
          // Extract website
          const websiteElement = document.querySelector('a[data-item-id="authority"]');
          if (websiteElement) {
            info.website = websiteElement.getAttribute('href');
          }
          
          return info;
        });
        
        // Close the browser
        await browser.close();
        
        // If we have a website, try to extract contacts from it
        if (businessInfo.website) {
          try {
            const websiteContacts = await this.extractContactsFromWebsite(businessInfo.website);
            if (websiteContacts && websiteContacts.length > 0) {
              businessInfo.contacts = websiteContacts;
            }
          } catch (websiteError) {
            console.error('Error extracting contacts from website:', websiteError);
          }
        }
        
        // If we don't have any contacts yet but we have a business name and phone,
        // create a basic contact for the business
        if ((!businessInfo.contacts || businessInfo.contacts.length === 0) && 
            businessInfo.name && businessInfo.phone) {
          businessInfo.contacts = [{
            name: `Contact at ${businessInfo.name}`,
            position: 'Business Representative',
            email: null,
            phone: businessInfo.phone,
            isDecisionMaker: false
          }];
        }
        
        return businessInfo;
      } catch (error) {
        console.error('Error during puppeteer business info scraping:', error);
        await browser.close();
        
        // Try a fallback method
        return await this.fallbackBusinessScraping(businessName, location);
      }
    } catch (error) {
      console.error('Error getting business contacts:', error);
      return await this.fallbackBusinessScraping(businessName, location);
    }
  }
  
  /**
   * Fallback method to get business information using Axios + Cheerio
   */
  private async fallbackBusinessScraping(businessName: string, location?: string) {
    try {
      console.log('Using fallback method to find business info');
      
      // Create search query
      const searchQuery = location ? 
        `${businessName} ${location} contact information` : 
        `${businessName} contact information`;
      
      // Search for business contact info
      const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Initialize business info
      const businessInfo = {
        name: businessName,
        address: '',
        phone: '',
        website: '',
        contacts: []
      };
      
      // Look for "About" panel which often contains contact info
      $('.kp-header').each((_, element) => {
        const title = $(element).find('.wpGTQb').text().trim();
        if (title && title.toLowerCase().includes(businessName.toLowerCase())) {
          businessInfo.name = title;
          
          // Look for address
          $(element).parent().find('.vkLlQe').each((_, infoElement) => {
            const label = $(infoElement).find('.m0uvnb').text().trim();
            const value = $(infoElement).find('.ATanAe').text().trim();
            
            if (label.includes('Address')) {
              businessInfo.address = value;
            } else if (label.includes('Phone')) {
              businessInfo.phone = value;
            }
          });
          
          // Look for website
          const websiteLink = $(element).parent().find('a.uEOwHb');
          if (websiteLink.length) {
            businessInfo.website = websiteLink.attr('href');
          }
        }
      });
      
      // If we have a website, try to extract contacts
      if (businessInfo.website) {
        try {
          const websiteContacts = await this.extractContactsFromWebsite(businessInfo.website);
          if (websiteContacts && websiteContacts.length > 0) {
            businessInfo.contacts = websiteContacts;
          }
        } catch (websiteError) {
          console.error('Error extracting contacts from website:', websiteError);
        }
      }
      
      // If we still don't have contacts but have a phone number, create a basic contact
      if ((!businessInfo.contacts || businessInfo.contacts.length === 0) && businessInfo.phone) {
        businessInfo.contacts = [{
          name: `Contact at ${businessInfo.name}`,
          position: 'Business Representative',
          email: null,
          phone: businessInfo.phone,
          isDecisionMaker: false
        }];
      }
      
      return businessInfo;
    } catch (error) {
      console.error('Fallback business scraping failed:', error);
      return null;
    }
  }
  
  /**
   * Extract publicly available contact information from a business website
   * Only extracts information the business has voluntarily published
   * @param website Business website URL
   */
  async extractContactsFromWebsite(website: string) {
    console.log(`Extracting real contact information from: ${website}`);
    
    try {
      // First try using Axios + Cheerio for better performance
      const response = await axios.get(website, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      // Find contact page links
      const contactPageLinks = this.findContactPageLinks($, website);
      console.log('Found potential contact page links:', contactPageLinks);
      
      // Extract emails and phones from main page
      const emails = this.extractBusinessEmails(response.data);
      const phones = this.extractBusinessPhones(response.data);
      
      // If we found contact page links, visit them to find more information
      const contacts = [];
      let teamMembers = [];
      
      // Visit contact pages to extract more information
      if (contactPageLinks.length > 0) {
        // Only visit up to 3 contact pages to avoid excessive scraping
        const pagesToVisit = contactPageLinks.slice(0, 3);
        
        for (const link of pagesToVisit) {
          try {
            const contactPageResponse = await axios.get(link, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              },
              timeout: 10000
            });
            
            const contactPage$ = cheerio.load(contactPageResponse.data);
            
            // Extract emails and phones from the contact page
            const contactPageEmails = this.extractBusinessEmails(contactPageResponse.data);
            const contactPagePhones = this.extractBusinessPhones(contactPageResponse.data);
            
            // Add any new emails and phones
            emails.push(...contactPageEmails);
            phones.push(...contactPagePhones);
            
            // Look for team member information
            const newTeamMembers = this.extractTeamMembers(contactPage$);
            if (newTeamMembers.length > 0) {
              teamMembers = [...teamMembers, ...newTeamMembers];
            }
          } catch (error) {
            console.error(`Error fetching contact page ${link}:`, error);
          }
        }
      }
      
      // If we found team members, use those as contacts
      if (teamMembers.length > 0) {
        for (const member of teamMembers) {
          contacts.push({
            name: member.name,
            position: member.position,
            email: member.email || (emails.length > 0 ? emails[0] : null),
            phone: member.phone || (phones.length > 0 ? phones[0] : null),
            isDecisionMaker: this.isDecisionMakerTitle(member.position)
          });
        }
      } else {
        // If we didn't find specific team members but have emails,
        // create generic contacts from the emails
        for (let i = 0; i < Math.min(emails.length, 3); i++) {
          const email = emails[i];
          const phone = i < phones.length ? phones[i] : null;
          
          // Try to extract a name from the email
          const nameMatch = email.match(/^([^@]+)@/);
          const name = nameMatch ? this.formatEmailNameToPerson(nameMatch[1]) : `Contact ${i+1}`;
          
          contacts.push({
            name,
            position: this.guessPositionFromEmail(email),
            email,
            phone,
            isDecisionMaker: this.isDecisionMakerEmail(email)
          });
        }
      }
      
      return contacts;
    } catch (error) {
      console.error('Error with Axios extraction, trying Puppeteer:', error);
      
      // Fallback to Puppeteer if Axios fails
      return await this.extractContactsWithPuppeteer(website);
    }
  }
  
  /**
   * Extract team members from a page
   */
  private extractTeamMembers($: cheerio.CheerioAPI) {
    const teamMembers = [];
    
    // Look for common team member containers
    const teamContainers = [
      $('.team-member, .team_member, .staff-member, .staff_member, .member, .employee'),
      $('div:contains("Our Team") + div > div'),
      $('h2:contains("Team") ~ div > div'),
      $('h2:contains("Meet the Team") ~ div > div'),
      $('h2:contains("Our Staff") ~ div > div')
    ];
    
    for (const container of teamContainers) {
      container.each((_, element) => {
        try {
          // Look for name
          const nameElement = $(element).find('h3, h4, strong, .name, .team-name');
          let name = nameElement.first().text().trim();
          
          // Look for position/title
          const positionElement = $(element).find('.position, .title, .role, .job-title, p:not(:contains("@"))');
          let position = positionElement.first().text().trim();
          
          // Look for email
          const emailElement = $(element).find('a[href^="mailto:"]');
          let email = null;
          if (emailElement.length) {
            email = emailElement.attr('href').replace('mailto:', '');
          }
          
          // Look for phone
          const phoneElement = $(element).find('a[href^="tel:"]');
          let phone = null;
          if (phoneElement.length) {
            phone = phoneElement.attr('href').replace('tel:', '');
          }
          
          // Only add if we found a name and position
          if (name && position && name !== position) {
            teamMembers.push({ name, position, email, phone });
          }
        } catch (e) {
          console.error('Error extracting team member:', e);
        }
      });
      
      // If we found team members, stop looking
      if (teamMembers.length > 0) {
        break;
      }
    }
    
    return teamMembers;
  }
  
  /**
   * Find contact page links
   */
  private findContactPageLinks($: cheerio.CheerioAPI, baseUrl: string) {
    const contactLinks = new Set<string>();
    
    // Find links that might lead to contact pages
    $('a').each((_, element) => {
      try {
        const text = $(element).text().toLowerCase();
        const href = $(element).attr('href');
        
        if (href && (
          text.includes('contact') || 
          text.includes('about us') || 
          text.includes('team') || 
          text.includes('staff') || 
          text.includes('meet')
        )) {
          // Resolve relative URLs
          let fullUrl = href;
          if (href.startsWith('/')) {
            const urlObj = new URL(baseUrl);
            fullUrl = `${urlObj.protocol}//${urlObj.host}${href}`;
          } else if (!href.startsWith('http')) {
            if (baseUrl.endsWith('/')) {
              fullUrl = baseUrl + href;
            } else {
              fullUrl = baseUrl + '/' + href;
            }
          }
          
          // Skip links to other domains
          if (fullUrl.includes(new URL(baseUrl).host)) {
            contactLinks.add(fullUrl);
          }
        }
      } catch (e) {
        // Skip this link
      }
    });
    
    return Array.from(contactLinks);
  }
  
  /**
   * Use Puppeteer to extract contacts from a website
   */
  private async extractContactsWithPuppeteer(website: string) {
    try {
      console.log('Using Puppeteer to extract contacts from website');
      
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate to the website
        await page.goto(website, { waitUntil: 'networkidle2', timeout: 15000 });
        
        // Look for contact page links
        const contactLinks = await page.evaluate(() => {
          const links = [];
          document.querySelectorAll('a').forEach(a => {
            const text = a.textContent.toLowerCase();
            if (text.includes('contact') || text.includes('about') || text.includes('team')) {
              links.push(a.href);
            }
          });
          return links;
        });
        
        // Extract emails and phones from the main page
        const mainPageContent = await page.content();
        const emails = this.extractBusinessEmails(mainPageContent);
        const phones = this.extractBusinessPhones(mainPageContent);
        
        let teamMembers = [];
        
        // Visit contact pages (up to 2)
        for (const link of contactLinks.slice(0, 2)) {
          try {
            await page.goto(link, { waitUntil: 'networkidle2', timeout: 10000 });
            
            // Extract page content
            const contactPageContent = await page.content();
            
            // Add any new emails and phones
            emails.push(...this.extractBusinessEmails(contactPageContent));
            phones.push(...this.extractBusinessPhones(contactPageContent));
            
            // Look for team members
            const newTeamMembers = await page.evaluate(() => {
              const members = [];
              
              // Function to get text or null
              const getText = (el) => el ? el.textContent.trim() : null;
              
              // Look for team member elements
              const teamElements = [
                ...document.querySelectorAll('.team-member, .staff-member, .member, .employee'),
                ...document.querySelectorAll('h2:contains("Team"), h2:contains("Staff")'),
                ...document.querySelectorAll('h3, h4')
              ];
              
              for (const el of teamElements) {
                try {
                  // Find name and title elements
                  const headingEl = el.tagName.startsWith('H') ? el : el.querySelector('h3, h4, strong');
                  if (!headingEl) continue;
                  
                  const name = getText(headingEl);
                  if (!name) continue;
                  
                  // Find position element
                  let position = null;
                  let positionEl = el.tagName.startsWith('H') ? 
                                  el.nextElementSibling : 
                                  el.querySelector('.position, .title, em, p:not(:contains("@"))');
                  
                  if (positionEl) {
                    position = getText(positionEl);
                  }
                  
                  // Find email
                  let email = null;
                  const emailEl = el.querySelector('a[href^="mailto:"]');
                  if (emailEl) {
                    email = emailEl.getAttribute('href').replace('mailto:', '');
                  }
                  
                  // Find phone
                  let phone = null;
                  const phoneEl = el.querySelector('a[href^="tel:"]');
                  if (phoneEl) {
                    phone = phoneEl.getAttribute('href').replace('tel:', '');
                  }
                  
                  // Only add if we have a name and it's not generic
                  if (name && !['home', 'about', 'contact'].includes(name.toLowerCase())) {
                    members.push({ name, position, email, phone });
                  }
                } catch (e) {
                  // Skip this element
                }
              }
              
              return members;
            });
            
            if (newTeamMembers.length > 0) {
              teamMembers = [...teamMembers, ...newTeamMembers];
            }
          } catch (error) {
            console.error(`Error visiting contact page ${link}:`, error);
          }
        }
        
        await browser.close();
        
        // Process the contacts similar to the Cheerio version
        const contacts = [];
        
        // Deduplicate emails and phones
        const uniqueEmails = Array.from(new Set(emails));
        const uniquePhones = Array.from(new Set(phones));
        
        // If we found team members, use those as contacts
        if (teamMembers.length > 0) {
          for (const member of teamMembers) {
            contacts.push({
              name: member.name,
              position: member.position || 'Team Member',
              email: member.email || (uniqueEmails.length > 0 ? uniqueEmails[0] : null),
              phone: member.phone || (uniquePhones.length > 0 ? uniquePhones[0] : null),
              isDecisionMaker: this.isDecisionMakerTitle(member.position || '')
            });
          }
        } else {
          // If we didn't find specific team members but have emails,
          // create generic contacts from the emails
          for (let i = 0; i < Math.min(uniqueEmails.length, 3); i++) {
            const email = uniqueEmails[i];
            const phone = i < uniquePhones.length ? uniquePhones[i] : null;
            
            // Try to extract a name from the email
            const nameMatch = email.match(/^([^@]+)@/);
            const name = nameMatch ? this.formatEmailNameToPerson(nameMatch[1]) : `Contact ${i+1}`;
            
            contacts.push({
              name,
              position: this.guessPositionFromEmail(email),
              email,
              phone,
              isDecisionMaker: this.isDecisionMakerEmail(email)
            });
          }
        }
        
        return contacts;
      } catch (error) {
        console.error('Error during Puppeteer contact extraction:', error);
        await browser.close();
        
        // Return whatever emails and phones we could find as a fallback
        return [];
      }
    } catch (error) {
      console.error('Error launching Puppeteer for contact extraction:', error);
      return [];
    }
  }
  
  /**
   * Convert an email username to a person's name
   */
  private formatEmailNameToPerson(emailName: string): string {
    // Remove numbers and special chars
    const cleanName = emailName.replace(/[0-9_\.\-\+]/g, ' ').trim();
    
    // Split into parts
    const parts = cleanName.split(' ').filter(p => p);
    
    // Capitalize each part
    const formattedParts = parts.map(part => {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    });
    
    return formattedParts.join(' ') || emailName;
  }
  
  /**
   * Guess a position based on email address
   */
  private guessPositionFromEmail(email: string): string {
    const username = email.split('@')[0].toLowerCase();
    
    if (username.includes('ceo') || username.includes('founder') || username.includes('owner')) {
      return 'CEO';
    } else if (username.includes('cfo') || username.includes('finance')) {
      return 'CFO';
    } else if (username.includes('cto') || username.includes('tech')) {
      return 'CTO';
    } else if (username.includes('president')) {
      return 'President';
    } else if (username.includes('director')) {
      return 'Director';
    } else if (username.includes('manager')) {
      return 'Manager';
    } else if (username.includes('sales')) {
      return 'Sales Representative';
    } else if (username.includes('support')) {
      return 'Support Staff';
    } else if (username.includes('info')) {
      return 'Information Desk';
    } else if (username.includes('contact') || username.includes('hello')) {
      return 'Contact Representative';
    } else if (username.includes('admin')) {
      return 'Administrator';
    } else if (username.includes('hr')) {
      return 'HR Representative';
    } else if (username.includes('marketing')) {
      return 'Marketing Team Member';
    } else {
      return 'Staff Member';
    }
  }
  
  /**
   * Check if an email address is likely to belong to a decision maker
   */
  private isDecisionMakerEmail(email: string): boolean {
    const username = email.split('@')[0].toLowerCase();
    
    return username.includes('ceo') || 
           username.includes('founder') || 
           username.includes('owner') || 
           username.includes('cfo') || 
           username.includes('cto') || 
           username.includes('president') || 
           username.includes('director') || 
           username.includes('manager');
  }
  
  /**
   * Extract emails from publicly available content
   * Only looks for business contact emails, not personal information
   * @param html HTML content to analyze
   */
  private extractBusinessEmails(html: string): string[] {
    try {
      // Extract all emails
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      const matches = html.match(emailRegex) || [];
      
      // Filter to only include likely business emails
      const businessEmails = matches.filter(email => {
        // Skip emails from common services that wouldn't be business contacts
        if (email.includes('@gmail.com') || 
            email.includes('@yahoo.com') || 
            email.includes('@hotmail.com') || 
            email.includes('@outlook.com') ||
            email.includes('@example.com')) {
          
          // Allow business@gmail.com, info@gmail.com, etc.
          const prefix = email.split('@')[0].toLowerCase();
          return prefix.includes('info') ||
                 prefix.includes('contact') ||
                 prefix.includes('sales') ||
                 prefix.includes('support') ||
                 prefix.includes('hello') ||
                 prefix.includes('admin') ||
                 prefix.includes('office') ||
                 prefix.includes('business');
        }
        
        return true;
      });
      
      const uniqueSet = new Set<string>(businessEmails);
      return Array.from(uniqueSet);
    } catch (error) {
      console.error('Error extracting business emails:', error);
      return [];
    }
  }
  
  /**
   * Extract business phone numbers from publicly available content
   * @param html HTML content to analyze
   */
  private extractBusinessPhones(html: string): string[] {
    try {
      // This regex covers most business phone formats
      const phoneRegex = /(\+?1[-\s.]?)?\(?([0-9]{3})\)?[-\s.]?([0-9]{3})[-\s.]?([0-9]{4})/g;
      const matches = html.match(phoneRegex) || [];
      
      const uniqueSet = new Set<string>(matches);
      return Array.from(uniqueSet);
    } catch (error) {
      console.error('Error extracting business phones:', error);
      return [];
    }
  }
  
  /**
   * Helper function to determine if a title belongs to a decision maker
   */
  private isDecisionMakerTitle(title: string = ""): boolean {
    const title_lower = title.toLowerCase();
    return title_lower.includes('ceo') ||
           title_lower.includes('cto') ||
           title_lower.includes('cfo') ||
           title_lower.includes('coo') ||
           title_lower.includes('chief') ||
           title_lower.includes('president') ||
           title_lower.includes('vp') ||
           title_lower.includes('vice president') ||
           title_lower.includes('director') ||
           title_lower.includes('head of') ||
           title_lower.includes('founder') ||
           title_lower.includes('owner');
  }
}

// Export singleton instance
export const googleBusinessScraper = new GoogleBusinessScraper();