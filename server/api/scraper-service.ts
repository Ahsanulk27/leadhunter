import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapeTarget {
  url: string;
  selectors: {
    title?: string;
    contacts?: string;
    emails?: string;
    phones?: string;
    addresses?: string;
  }
}

// Service to scrape publicly available business data from websites
export class ScraperService {
  
  // Scrape company information from a website
  async scrapeCompanyWebsite(domain: string) {
    try {
      const url = this.formatUrl(domain);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000
      });
      
      const $ = cheerio.load(response.data);
      
      // Common extraction patterns
      const companyInfo = {
        title: $('title').text().trim(),
        contacts: [],
        emails: this.extractEmails($.html()),
        phones: this.extractPhones($.html()),
        addresses: this.extractAddresses($.html()),
        socialProfiles: this.extractSocialProfiles($)
      };
      
      return companyInfo;
    } catch (error) {
      console.error(`Error scraping website for ${domain}:`, error);
      return {
        title: domain,
        contacts: [],
        emails: [],
        phones: [],
        addresses: [],
        socialProfiles: {}
      };
    }
  }
  
  // Scrape standard business directories for a company
  async scrapeBusinessDirectories(companyName: string, location?: string) {
    const results = {
      companyInfo: {},
      contacts: []
    };
    
    // This would scrape data from:
    // - Yelp business pages
    // - Yellow Pages listings
    // - Chamber of Commerce directories
    // - BBB listings
    // - Google Maps/Places
    
    // For demo purposes, we'll just simulate this with a placeholder
    console.log(`Would scrape business directories for ${companyName} in ${location || 'all locations'}`);
    
    return results;
  }
  
  // Find contacts through LinkedIn profile search (would require additional permissions)
  async findCompanyEmployeesOnLinkedIn(companyName: string, seniorOnly: boolean = false) {
    // Note: Direct LinkedIn scraping requires permissions and legal review
    // For actual implementation, you'd want to use their API with proper auth
    
    // Placeholder - this would normally search for people at the company
    console.log(`Would find employees for ${companyName} on LinkedIn, seniorOnly=${seniorOnly}`);
    
    return [];
  }
  
  // Helper function to extract emails from HTML
  private extractEmails(html: string): string[] {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const matches = html.match(emailRegex) || [];
    
    // Filter out common false positives and deduplicate
    const uniqueSet = new Set<string>(matches);
    return Array.from(uniqueSet).filter(email => 
      !email.includes('example.com') && 
      !email.includes('yourdomain') &&
      !email.includes('@email') &&
      !email.includes('@domain')
    );
  }
  
  // Helper function to extract phone numbers from HTML
  private extractPhones(html: string): string[] {
    // This regex covers most US phone formats
    const phoneRegex = /(\+?1[-\s.]?)?\(?([0-9]{3})\)?[-\s.]?([0-9]{3})[-\s.]?([0-9]{4})/g;
    const matches = html.match(phoneRegex) || [];
    
    // Deduplicate phone numbers
    const uniqueSet = new Set<string>(matches);
    return Array.from(uniqueSet);
  }
  
  // Helper function to extract addresses from HTML (simplified)
  private extractAddresses(html: string): string[] {
    // This is a simplified approach - in practice you'd use NER (Named Entity Recognition)
    // or a specialized address extraction library
    const addressIndicators = [
      'street', 'avenue', 'boulevard', 'drive', 'lane', 'road', 'place',
      'suite', 'st.', 'ave.', 'blvd.', 'dr.', 'rd.', 'pl.',
      'floor', 'fl.', 'ste.', 'unit'
    ];
    
    // Basic extraction looking for address patterns in text nodes
    const $ = cheerio.load(html);
    const candidates: string[] = [];
    
    $('p, div, span, address').each(function() {
      const text = $(this).text().trim();
      
      // Skip very long text blocks (unlikely to be just an address)
      if (text.length > 150) return;
      
      // Check if this element contains address indicators
      const hasIndicator = addressIndicators.some(indicator =>
        text.toLowerCase().includes(indicator)
      );
      
      // If we find something that looks like an address, add it
      if (hasIndicator) {
        candidates.push(text);
      }
    });
    
    const uniqueSet = new Set<string>(candidates);
    return Array.from(uniqueSet);
  }
  
  // Extract social media profiles
  private extractSocialProfiles($: cheerio.CheerioAPI) {
    const socialProfiles: Record<string, string> = {};
    
    // Common patterns for social media links
    const socialMatchers = [
      { platform: 'linkedin', patterns: ['linkedin.com'] },
      { platform: 'twitter', patterns: ['twitter.com', 'x.com'] },
      { platform: 'facebook', patterns: ['facebook.com', 'fb.com'] },
      { platform: 'instagram', patterns: ['instagram.com'] },
      { platform: 'youtube', patterns: ['youtube.com'] }
    ];
    
    // Find links containing social media URLs
    $('a[href]').each(function() {
      const href = $(this).attr('href');
      if (!href) return;
      
      for (const { platform, patterns } of socialMatchers) {
        if (patterns.some(pattern => href.includes(pattern))) {
          socialProfiles[platform] = href;
        }
      }
    });
    
    return socialProfiles;
  }
  
  // Helper function to format URL
  private formatUrl(domain: string): string {
    if (!domain.startsWith('http')) {
      return `https://${domain}`;
    }
    return domain;
  }
}

// Export singleton instance
export const scraperService = new ScraperService();