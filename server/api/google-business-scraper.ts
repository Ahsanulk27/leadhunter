import axios from 'axios';
import * as cheerio from 'cheerio';

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
    try {
      // In a real implementation, this would use proper search API
      // or carefully follow Google's Terms of Service for scraping
      console.log(`Would search for: ${query} on Google Maps/Business`);
      
      // For testing purposes, return placeholder data
      const words = query.split(' ');
      const industry = words.find(word => 
        ['restaurant', 'cafe', 'clinic', 'hospital', 'tech', 'software', 
         'consulting', 'law', 'cleaning', 'construction', 'manufacturing', 
         'education', 'retail', 'real', 'estate'].includes(word.toLowerCase())
      ) || 'business';
      
      // Return some basic business data
      return [
        {
          name: `Premier ${industry.charAt(0).toUpperCase() + industry.slice(1)} Services`,
          place_id: `placeholder-${industry}-1`,
          formatted_address: `123 ${industry.charAt(0).toUpperCase() + industry.slice(1)} Ave, Business District`,
          vicinity: `Business District`,
          business_status: "OPERATIONAL",
          types: [industry.toLowerCase()],
          website: `https://www.${industry.toLowerCase()}example.com`
        },
        {
          name: `${industry.charAt(0).toUpperCase() + industry.slice(1)} Solutions Group`,
          place_id: `placeholder-${industry}-2`,
          formatted_address: `456 Industry Blvd, Commercial Center`,
          vicinity: `Commercial Center`,
          business_status: "OPERATIONAL",
          types: [industry.toLowerCase()],
          website: `https://www.${industry.toLowerCase()}solutions.com`
        }
      ];
    } catch (error) {
      console.error('Error searching businesses:', error);
      return [];
    }
  }
  
  /**
   * Extract business contact information from Google Business profile
   * Only extracts publicly available information
   * @param businessName The name of the business to look up
   * @param location Optional location to narrow search
   */
  async getBusinessContacts(businessName: string, location?: string) {
    try {
      // In real implementation, this would extract public contact information
      // from the business's public Google business profile
      console.log(`Would extract public contact info for: ${businessName} ${location ? 'in ' + location : ''}`);
      
      // For testing, generate realistic business contacts
      // This includes only business-level information from public sources
      
      // Generate job titles based on the business name
      const words = businessName.toLowerCase().split(' ');
      const industry = words.find(word => 
        ['restaurant', 'cafe', 'clinic', 'hospital', 'tech', 'software', 
         'consulting', 'law', 'cleaning', 'construction', 'manufacturing', 
         'education', 'retail', 'real', 'estate'].includes(word)
      ) || 'business';
      
      // Create titles based on industry
      let titles = ['CEO', 'CFO', 'Operations Manager', 'Sales Director'];
      if (industry === 'tech' || industry === 'software') {
        titles = ['CTO', 'Chief Engineer', 'VP of Product', 'Technical Sales Manager'];
      } else if (industry === 'restaurant' || industry === 'cafe') {
        titles = ['Owner', 'General Manager', 'Head Chef', 'Events Coordinator'];
      } else if (industry === 'clinic' || industry === 'hospital') {
        titles = ['Medical Director', 'Chief of Staff', 'Operations Manager', 'Admin Director'];
      } else if (industry === 'law') {
        titles = ['Managing Partner', 'Senior Counsel', 'Partner', 'Associate'];
      } else if (industry === 'cleaning') {
        titles = ['Owner', 'Operations Manager', 'Service Director', 'Account Manager'];
      }
      
      // Create business domain from business name
      const domain = businessName.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '') + '.com';
      
      // Structure for business contact information
      return {
        name: businessName,
        address: location ? `123 Main St, ${location}` : '123 Main St, Business District',
        phone: '(555) 123-4567',
        website: `https://www.${domain}`,
        contacts: [
          {
            name: 'John Smith',
            position: titles[0],
            email: `john@${domain}`,
            phone: '(555) 123-4567',
            isDecisionMaker: true
          },
          {
            name: 'Sarah Johnson',
            position: titles[1],
            email: `sarah@${domain}`,
            phone: '(555) 123-4568',
            isDecisionMaker: true
          },
          {
            name: 'David Wilson',
            position: titles[2],
            email: `david@${domain}`,
            phone: '(555) 123-4569',
            isDecisionMaker: titles[2].includes('Director') || titles[2].includes('VP')
          }
        ]
      };
    } catch (error) {
      console.error('Error getting business contacts:', error);
      return null;
    }
  }
  
  /**
   * Extract publicly available contact information from a business website
   * Only extracts information the business has voluntarily published
   * @param website Business website URL
   */
  async extractContactsFromWebsite(website: string) {
    try {
      // In production this would follow a careful approach to only extract
      // contact information that's meant to be public, like:
      // - "Contact Us" pages
      // - "Meet the Team" pages
      // - Staff directories
      
      console.log(`Would extract public contact information from: ${website}`);
      
      const response = await axios.get(website, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000
      });
      
      const $ = cheerio.load(response.data);
      
      // Find contact page links
      const contactLinks = $('a').filter(function() {
        const text = $(this).text().toLowerCase();
        return text.includes('contact') || text.includes('about us') || text.includes('team');
      }).map(function() {
        return $(this).attr('href');
      }).get();
      
      console.log('Found potential contact page links:', contactLinks);
      
      // For testing, generate realistic website contacts
      // These would normally be extracted from the actual website
      const domainParts = website.replace('https://', '').replace('http://', '').split('.');
      const company = domainParts[1] || domainParts[0];
      
      return [
        {
          name: 'Michael Brown',
          position: 'Marketing Director',
          email: `michael@${website.replace('https://', '').replace('http://', '').replace('www.', '')}`,
          phone: '(555) 987-6543',
          isDecisionMaker: true
        },
        {
          name: 'Elizabeth Taylor',
          position: 'Customer Relations Manager',
          email: `elizabeth@${website.replace('https://', '').replace('http://', '').replace('www.', '')}`,
          phone: '(555) 987-6544',
          isDecisionMaker: false
        }
      ];
    } catch (error) {
      console.error('Error extracting contacts from website:', error);
      return [];
    }
  }
  
  /**
   * Extract emails from publicly available content
   * Only looks for business contact emails, not personal information
   * @param html HTML content to analyze
   */
  private extractBusinessEmails(html: string): string[] {
    try {
      // Only extract emails that appear to be business contact addresses
      // like info@, contact@, sales@, etc. - not personal emails
      const businessEmailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      const matches = html.match(businessEmailRegex) || [];
      
      // Filter to only include likely business emails
      const businessEmails = matches.filter(email => {
        const prefix = email.split('@')[0].toLowerCase();
        return prefix.includes('info') ||
               prefix.includes('contact') ||
               prefix.includes('sales') ||
               prefix.includes('support') ||
               prefix.includes('hello') ||
               prefix.includes('admin') ||
               prefix.includes('office');
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
}

// Export singleton instance
export const googleBusinessScraper = new GoogleBusinessScraper();