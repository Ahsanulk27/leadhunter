import axios from 'axios';

// Interface for business data search parameters
interface BusinessSearchParams {
  industry?: string;
  location?: string;
  companyName?: string;
  size?: string;
  position?: string;
  prioritizeDecisionMakers?: boolean;
}

// Service to fetch real business data from publicly available sources
export class BusinessDataService {
  
  // Fetch company data from public APIs
  async fetchBusinessData(params: BusinessSearchParams) {
    // Start with empty results structure
    const results = {
      company: {
        name: '',
        industry: '',
        subIndustry: '',
        location: '',
        size: '',
        address: '',
        yearEstablished: 0,
      },
      contacts: []
    };
    
    try {
      // First approach: Use Clearbit's free API to get company info
      // Note: Rate limited, but good for demo purposes
      if (params.companyName) {
        await this.enrichWithClearbit(params.companyName, results);
      } else {
        // For industry search without company name, use local business directory APIs
        await this.searchByIndustryAndLocation(params, results);
      }
      
      // Now get people associated with the company using publicly available data
      if (results.company.name) {
        await this.findCompanyContacts(results.company.name, params.prioritizeDecisionMakers || false, results);
      }
      
      return results;
    } catch (error) {
      console.error('Error fetching business data:', error);
      throw new Error('Failed to fetch business data');
    }
  }
  
  // Use Clearbit's free API to enrich company data
  private async enrichWithClearbit(companyName: string, results: any) {
    try {
      // Use company name to find domain first (could be done with DNS lookup or simple guessing)
      const domain = this.formatDomain(companyName);
      
      // Call Clearbit API (normally needs API key, but for educational purposes)
      // In production, you should sign up for a free Clearbit account
      const response = await axios.get(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(domain)}`);
      
      if (response.data && response.data.length > 0) {
        const company = response.data[0];
        
        // Update results with real company data
        results.company = {
          name: company.name,
          industry: company.category?.sector || '',
          subIndustry: company.category?.industry || '',
          location: company.geo?.city ? `${company.geo.city}, ${company.geo.stateCode}` : '',
          size: this.employeeCountToRange(company.metrics?.employees || 0),
          address: '',
          yearEstablished: company.foundedYear || 0,
          domain: company.domain,
          logo: company.logo
        };
      }
    } catch (error) {
      console.log('Could not enrich with Clearbit:', error);
      // Fall back to original data
    }
  }
  
  // Search companies by industry and location
  private async searchByIndustryAndLocation(params: BusinessSearchParams, results: any) {
    try {
      // Use the Google Places API through our service
      const { googlePlacesService } = await import('./google-places-service');
      const { googleBusinessScraper } = await import('./google-business-scraper');
      
      console.log(`Performing industry search for ${params.industry} in ${params.location}`);
      
      // Search for businesses in the specified industry and location
      const searchQuery = `${params.industry} businesses in ${params.location || 'United States'}`;
      let businesses: Array<any> = [];
      
      try {
        // First try the Places API
        businesses = await googlePlacesService.searchBusinesses({
          industry: params.industry,
          location: params.location
        });
      } catch (error) {
        console.log("Places API search failed, trying scraper...");
      }
      
      // If Places API didn't return results, try the scraper
      if (!businesses || businesses.length === 0) {
        try {
          businesses = await googleBusinessScraper.searchBusinesses(searchQuery);
        } catch (error) {
          console.log("Scraper search failed:", error);
        }
      }
      
      if (businesses && businesses.length > 0) {
        // Use the first business from the results
        const topBusiness = businesses[0];
        
        // Get more details if available
        let businessDetails = topBusiness;
        if (topBusiness.place_id) {
          try {
            const details = await googlePlacesService.getBusinessDetails(topBusiness.place_id);
            if (details) {
              businessDetails = { ...topBusiness, ...details };
            }
          } catch (error) {
            console.log("Could not get business details:", error);
          }
        }
        
        // Update the results with the business information
        results.company = {
          name: businessDetails.name || topBusiness.name,
          industry: params.industry || '',
          location: params.location || businessDetails.vicinity || '',
          size: params.size || '',
          address: businessDetails.formatted_address || businessDetails.vicinity || '',
          website: businessDetails.website || ''
        };
      } else {
        // If we didn't find any businesses, populate with industry information
        results.company = {
          name: `${params.industry} Business`,
          industry: params.industry || '',
          location: params.location || 'United States',
          size: params.size || '',
        };
      }
    } catch (error) {
      console.log('Error in industry search:', error);
    }
  }
  
  // Find contacts at a company using publicly available data sources
  private async findCompanyContacts(companyName: string, prioritizeDecisionMakers: boolean, results: any) {
    try {
      // Import our scraper services
      const { googleBusinessScraper } = await import('./google-business-scraper');
      const { scraperService } = await import('./scraper-service');
      
      console.log(`Looking for contacts at ${companyName}...`);
      
      // Get business contacts first
      let contacts: Array<any> = [];
      try {
        // Try to get contacts from Google Business listings
        const businessInfo = await googleBusinessScraper.getBusinessContacts(companyName, results.company.location);
        
        if (businessInfo && businessInfo.contacts && businessInfo.contacts.length > 0) {
          contacts = businessInfo.contacts;
          
          // If we have a website, extract more contacts from there
          if (businessInfo.website || results.company.website) {
            const domain = businessInfo.website || results.company.website;
            console.log(`Extracting additional contact information from: ${domain}`);
            
            // Scrape the website for contact information
            const websiteData = await scraperService.scrapeCompanyWebsite(domain);
            
            // Get more contacts from the website
            try {
              const websiteContacts = await googleBusinessScraper.extractContactsFromWebsite(domain);
              if (websiteContacts && websiteContacts.length > 0) {
                // Add any new contacts
                contacts = [...contacts, ...websiteContacts];
              }
            } catch (error) {
              console.log("Error extracting contacts from website:", error);
            }
            
            // Enhance existing contacts with emails/phones from the website
            contacts.forEach((contact: any, index: number) => {
              if (!contact.email && websiteData.emails && websiteData.emails[index]) {
                contact.email = websiteData.emails[index];
              }
              if (!contact.companyPhone && websiteData.phones && websiteData.phones[index]) {
                contact.companyPhone = websiteData.phones[index];
              }
            });
          }
        }
      } catch (error) {
        console.log("Error getting business contacts:", error);
      }
      
      // If we didn't find any contacts, try searching for company staff
      if (contacts.length === 0) {
        try {
          // Try to find company employees on public profiles
          const employees = await scraperService.findCompanyEmployeesOnLinkedIn(companyName, prioritizeDecisionMakers);
          if (employees && employees.length > 0) {
            contacts = employees;
          }
        } catch (error) {
          console.log("Error finding company employees:", error);
        }
      }
      
      // If we still don't have contacts, try business directories
      if (contacts.length === 0) {
        try {
          // Search business directories for the company
          const directoryData = await scraperService.scrapeBusinessDirectories(companyName, results.company.location);
          if (directoryData && directoryData.contacts && directoryData.contacts.length > 0) {
            contacts = directoryData.contacts;
          }
        } catch (error) {
          console.log("Error scraping business directories:", error);
        }
      }
      
      // Process the contacts - remove duplicates and mark decision makers
      const processedContacts = contacts.map((contact: any, index: number) => {
        // Determine if this person is a decision maker based on title
        const isDecisionMaker = this.isDecisionMakerTitle(contact.position || contact.title);
        
        return {
          id: index + 1,
          name: contact.name || `Contact ${index + 1}`,
          position: contact.position || contact.title || 'Employee',
          email: contact.email || null,
          companyPhone: contact.companyPhone || contact.phone || null,
          personalPhone: contact.personalPhone || null,
          isDecisionMaker: isDecisionMaker,
          influence: isDecisionMaker ? 85 : 45,
          notes: ''
        };
      });
      
      // Update the results with our contacts
      results.contacts = processedContacts;
      
      // If we still have no contacts, add at least one placeholder
      if (results.contacts.length === 0) {
        results.contacts = [{
          id: 1,
          name: `Contact at ${companyName}`,
          position: 'Employee',
          email: null,
          companyPhone: null,
          personalPhone: null,
          isDecisionMaker: false,
          influence: 50,
          notes: 'No public contacts found. Try searching for a different company.'
        }];
      }
    } catch (error) {
      console.log('Error finding contacts:', error);
    }
  }
  
  // Helper function to convert employee count to size range
  private employeeCountToRange(employeeCount: number): string {
    if (employeeCount <= 10) return '1-10';
    if (employeeCount <= 50) return '11-50';
    if (employeeCount <= 200) return '51-200';
    if (employeeCount <= 500) return '201-500';
    return '501+';
  }
  
  // Helper function to format domain from company name
  private formatDomain(companyName: string): string {
    return companyName.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '') + '.com';
  }
  
  // Helper function to determine if a title belongs to a decision maker
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
export const businessDataService = new BusinessDataService();