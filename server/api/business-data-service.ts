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
    // For demo purposes - in production you would use:
    // 1. Google Places API (has free tier)
    // 2. Yelp Fusion API (has free tier)
    // 3. Local business registries with public APIs
    
    try {
      // Example of how you would use the Google Places API:
      // You'd need to sign up for a Google Cloud account and enable Places API
      /*
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
        {
          params: {
            query: `${params.industry} businesses in ${params.location}`,
            key: process.env.GOOGLE_PLACES_API_KEY
          }
        }
      );
      
      if (response.data && response.data.results && response.data.results.length > 0) {
        const place = response.data.results[0];
        results.company = {
          name: place.name,
          address: place.formatted_address,
          location: params.location,
          industry: params.industry,
          // And other fields you can extract
        };
      }
      */
      
      // For this demo, we'll just set the search parameters to show what was searched for
      results.company = {
        name: params.companyName || `Leading ${params.industry} Business`,
        industry: params.industry || 'Business Services',
        location: params.location || 'United States',
        size: params.size || '11-50'
      };
    } catch (error) {
      console.log('Error in industry search:', error);
    }
  }
  
  // Find contacts at a company using publicly available data sources
  private async findCompanyContacts(companyName: string, prioritizeDecisionMakers: boolean, results: any) {
    try {
      // In production, you would:
      // 1. Use LinkedIn's public API or scraper tools (with proper permissions)
      // 2. Use Hunter.io for email discovery (has free tier)
      // 3. Use GitHub API for tech companies
      
      // For educational purposes, we'll demonstrate with hunter.io approach
      // (would need API key in production)
      /*
      const domain = results.company.domain || this.formatDomain(companyName);
      const response = await axios.get(
        `https://api.hunter.io/v2/domain-search?domain=${domain}`,
        {
          params: {
            limit: 10,
            api_key: process.env.HUNTER_API_KEY
          }
        }
      );
      
      if (response.data && response.data.data && response.data.data.emails) {
        results.contacts = response.data.data.emails.map(email => ({
          name: `${email.first_name} ${email.last_name}`,
          position: email.position || 'Employee',
          email: email.value,
          companyPhone: '',
          personalPhone: '',
          isDecisionMaker: this.isDecisionMakerTitle(email.position || ''),
          linkedIn: null,
          twitter: null
        }));
      }
      */
      
      // For the demo - we would want to show that we're looking for real data
      results.contacts = [
        {
          id: 1,
          name: `[Public data will show real names]`,
          position: `[Real title from LinkedIn/public sources]`,
          email: `[Real email address found via Hunter.io]`,
          companyPhone: `[Contact info based on web search]`,
          personalPhone: prioritizeDecisionMakers ? `[Found through data aggregation]` : null,
          isDecisionMaker: true,
          influence: 85,
          notes: `Integration with real data APIs will provide accurate contact details.`
        },
        {
          id: 2,
          name: `[Second contact name]`,
          position: `[Position from company website/LinkedIn]`,
          email: `[Email pattern matches company format]`,
          companyPhone: `[Company main line with extension]`,
          isDecisionMaker: false,
          influence: 45,
          notes: `Complete this integration by adding API keys from public data sources.`
        }
      ];
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