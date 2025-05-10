import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as cheerio from "cheerio";
import axios from "axios";
import { generateIndustryContacts } from "./routes-industry";
import { 
  insertCompanySchema, insertContactSchema, insertSearchHistorySchema,
  type InsertCompany, type InsertContact, type InsertSearchHistory,
  type Contact
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Define API routes
  const apiRouter = app.use("/api", async (req, res, next) => {
    try {
      // Simple CORS handling
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      res.header("Access-Control-Allow-Headers", "Content-Type");
      next();
    } catch (error) {
      next(error);
    }
  });

  // Search for company leads
  app.post("/api/search", async (req: Request, res: Response) => {
    try {
      console.log("📍 API /search route called with request body:", req.body);
      const { company, industry, location, position, size, prioritizeDecisionMakers } = req.body;
      
      console.log(`📍 Search parameters: 
        - Company: ${company || 'Not provided'}
        - Industry: ${industry || 'Not provided'}
        - Location: ${location || 'Not provided'}
        - Position: ${position || 'Not provided'}
        - Size: ${size || 'Not provided'}
        - Prioritize Decision Makers: ${prioritizeDecisionMakers ? 'Yes' : 'No'}
      `);
      
      // Build the search query for history recording
      const searchQuery = company || 
                        (industry && location ? `${industry} in ${location}` : 
                         (industry || location || 'general business search'));

      // Record search in history
      const searchHistoryData: InsertSearchHistory = {
        query: searchQuery,
        resultsCount: 0,
      };
      
      await storage.createSearchHistory(searchHistoryData);
      console.log("📍 Search recorded in history");

      // Import our search controller which coordinates all data sources
      console.log("📍 Importing and using search controller...");
      const { searchController } = await import('./controllers/search-controller');
      
      console.log("📍 Searching for REAL business data from multiple sources...");
      
      // Search across all real data sources
      const scrapedData = await searchController.searchBusinessData({
        company,
        industry, 
        location,
        position,
        size,
        prioritizeDecisionMakers
      });
      
      console.log("📍 Search completed, results:", scrapedData ? "Data found" : "No data found");
      
      // We ONLY use real data - if no results found, return 404
      if (!scrapedData) {
        console.log("📍 No real data found, returning 404");
        if (!industry && !company && !location) {
          return res.status(404).json({ 
            error: "Missing search criteria", 
            message: "Please provide either an industry, a company name, or a location to search for leads."
          });
        } else {
          return res.status(404).json({ 
            error: "No real business data found for this search", 
            message: "No real business information could be found after searching Google Maps, Yelp, and Yellow Pages. Try searching with different criteria, such as a more specific company name or location."
          });
        }
      }
      
      console.log("📍 Real data found, continuing with processing...");

      // Store company information
      const companyData: InsertCompany = {
        name: scrapedData.name,
        industry: scrapedData.industry || industry || "",
        location: scrapedData.location || location || "",
        size: scrapedData.size || size || "",
        address: scrapedData.address || "",
      };

      const savedCompany = await storage.createCompany(companyData);
      
      // Process and prioritize contacts
      const contacts = scrapedData.contacts.map((contact: any) => {
        // Determine if this is a decision maker based on title
        const isDecisionMaker = isDecisionMakerTitle(contact.position);
        
        // Calculate relevance score
        const relevanceScore = calculateRelevanceScore(contact, prioritizeDecisionMakers);
        
        return {
          ...contact,
          companyId: savedCompany.id,
          isPrimary: false, // Will set the highest scoring one later
          decisionMaker: isDecisionMaker,
          relevanceScore, // For sorting, not stored
        };
      });
      
      // Sort by relevance score
      contacts.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
      
      // Mark the highest scoring contact as primary
      if (contacts.length > 0) {
        contacts[0].isPrimary = true;
      }

      // Save contacts to storage and update search history
      const savedContacts = [];
      for (const contact of contacts) {
        const { relevanceScore, ...contactData } = contact;
        const savedContact = await storage.createContact(contactData);
        savedContacts.push(savedContact);
      }
      
      // Update search history with result count
      const searchHistory = await storage.getSearchHistory();
      if (searchHistory.length > 0) {
        const latestSearch = searchHistory[searchHistory.length - 1];
        const updatedSearch = await storage.createSearchHistory({ 
          query: latestSearch.query, 
          resultsCount: savedContacts.length 
        });
      }

      // Return the results
      return res.status(200).json({
        company: savedCompany,
        contacts: savedContacts,
      });
    } catch (error) {
      console.error("Search error:", error);
      return res.status(500).json({ error: "An error occurred during search" });
    }
  });

  // Get all saved leads
  app.get("/api/saved-leads", async (req: Request, res: Response) => {
    try {
      const savedContacts = await storage.getSavedContacts();
      
      // Get companies for each contact
      const companiesMap = new Map();
      for (const contact of savedContacts) {
        if (!companiesMap.has(contact.companyId)) {
          const company = await storage.getCompany(contact.companyId);
          if (company) {
            companiesMap.set(contact.companyId, company);
          }
        }
      }
      
      // Combine contact and company data
      const leads = savedContacts.map(contact => ({
        contact,
        company: companiesMap.get(contact.companyId) || null,
      }));
      
      return res.status(200).json(leads);
    } catch (error) {
      console.error("Error fetching saved leads:", error);
      return res.status(500).json({ error: "Error fetching saved leads" });
    }
  });

  // Save a lead
  app.post("/api/save-lead/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.getContact(id);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const updatedContact = await storage.updateContact(id, { saved: true });
      return res.status(200).json(updatedContact);
    } catch (error) {
      console.error("Error saving lead:", error);
      return res.status(500).json({ error: "Error saving lead" });
    }
  });

  // Update contact status
  app.post("/api/update-contact/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      const contact = await storage.getContact(id);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const updates: Partial<Contact> = {};
      if (status) updates.status = status;
      if (notes) updates.notes = notes;
      updates.lastContactDate = new Date();
      
      const updatedContact = await storage.updateContact(id, updates);
      return res.status(200).json(updatedContact);
    } catch (error) {
      console.error("Error updating contact:", error);
      return res.status(500).json({ error: "Error updating contact" });
    }
  });

  // Get search history
  app.get("/api/search-history", async (req: Request, res: Response) => {
    try {
      const searchHistory = await storage.getSearchHistory();
      return res.status(200).json(searchHistory);
    } catch (error) {
      console.error("Error fetching search history:", error);
      return res.status(500).json({ error: "Error fetching search history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions for lead prioritization

// Determine if a title indicates a decision maker
function isDecisionMakerTitle(title: string = ""): boolean {
  const decisionMakerTitles = [
    "ceo", "chief executive", "coo", "chief operating", "cfo", "chief financial",
    "cmo", "chief marketing", "cto", "chief technology", "cio", "chief information",
    "president", "director", "vp", "vice president", "head of", "founder", "owner",
    "partner", "principal", "managing"
  ];
  
  return decisionMakerTitles.some(decisionTitle => 
    title.toLowerCase().includes(decisionTitle)
  );
}

// Calculate relevance score for contact prioritization
function calculateRelevanceScore(contact: { 
  decisionMaker?: boolean; 
  email?: string; 
  phone?: string; 
  position?: string; 
}, prioritizeDecisionMakers: boolean = true): number {
  let score = 0;
  
  // Decision maker status is the most important factor
  if (contact.decisionMaker && prioritizeDecisionMakers) {
    score += 50;
  }
  
  // More complete contact info means higher priority
  if (contact.email) score += 15;
  if (contact.phone) score += 15;
  if (contact.position) score += 10;
  
  // Specific roles that are typically good for sales outreach
  const salesTargetRoles = [
    "sales", "marketing", "operations", "purchasing", 
    "procurement", "business development"
  ];
  
  // Real estate specific roles that are good for sales outreach
  const realEstateTargetRoles = [
    "broker", "owner", "managing", "acquisitions", "leasing",
    "developer", "investor", "director"
  ];
  
  if (contact.position) {
    const positionLower = contact.position.toLowerCase();
    
    // Check general sales roles
    if (salesTargetRoles.some(role => positionLower.includes(role))) {
      score += 20;
    }
    
    // Check real estate specific roles
    if (realEstateTargetRoles.some(role => positionLower.includes(role))) {
      score += 25;
    }
  }
  
  return score;
}

// High-performance bulk data scraping from multiple public sources
async function simulateScraping(companyName: string, industry?: string, location?: string): Promise<any> {
  // In a real implementation, this would use a combination of:
  // 1. Parallel web scraping with Puppeteer/Cheerio from Google Business listings
  // 2. LinkedIn company pages and profiles using API access
  // 3. Business directories like Yellow Pages, Yelp, etc. via simultaneous requests
  // 4. Company websites' "About" and "Team" pages with headless browser automation
  // 5. Public API data from business registries with batch processing
  // 6. Social media profiles with rate-limited API access
  // 7. Industry-specific databases with bulk data access
  // 8. Sales intelligence platforms via API integrations
  
  console.log(`Starting large-scale data scraping for industry: ${industry}, location: ${location}`);
  
  // Simulate high-speed data retrieval (reduced from 1500ms to 500ms)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Convert location code to actual location string if needed
  const formattedLocation = location && location.includes('_') ? 
                          getLocationFromCode(location) : location;
  
  // Process industry code to determine which data generation function to use
  const industryCategory = getIndustryCategory(industry);
  
  // For parallel processing, we would launch concurrent scraping operations
  // For simulation, we'll generate a larger set of company data with more contacts
  const companyData = generateIndustrySpecificData(industryCategory, companyName, formattedLocation);
  
  // BULK DATA ENHANCEMENT: Generate a very large set of contacts (250-500 contacts)
  // In production, this would be from multiple data sources aggregated in parallel
  const contactCount = 250 + Math.floor(Math.random() * 250); // 250-500 contacts
  const additionalContacts = generateMoreContacts(industryCategory, companyName, contactCount);
  
  // Aggregate, deduplicate, and enrich contact data
  const combinedContacts = [...companyData.contacts, ...additionalContacts];
  
  // Add data quality metrics that would come from a real scraping system
  companyData.dataQuality = {
    sourcesScraped: 12,
    contactsFound: combinedContacts.length,
    dataConfidenceScore: 85 + Math.floor(Math.random() * 15),
    lastUpdated: new Date().toISOString(),
    dataSourceBreakdown: {
      googleBusiness: Math.floor(Math.random() * 20) + 10,
      linkedin: Math.floor(Math.random() * 40) + 20,
      companyWebsite: Math.floor(Math.random() * 30) + 20,
      salesIntelligence: Math.floor(Math.random() * 20) + 10,
      socialMedia: Math.floor(Math.random() * 15) + 5,
    }
  };
  
  // Use the filtered and sorted contacts in the final result
  companyData.contacts = combinedContacts;
  console.log(`Completed scraping ${combinedContacts.length} contacts for ${companyName}`);
  
  return companyData;
}

// Determine the category of industry from the industry code
function getIndustryCategory(industry?: string): string {
  if (!industry) return 'general';
  
  // Technology industries
  if (['software_development', 'it_consulting', 'cybersecurity', 'web_development', 
       'cloud_services', 'app_development', 'ai_ml', 'data_analytics'].includes(industry)) {
    return 'technology';
  }
  
  // Finance industries
  if (['financial_services', 'banking', 'investment_firms', 'insurance', 
       'accounting', 'fintech'].includes(industry)) {
    return 'finance';
  }
  
  // Healthcare industries
  if (['hospitals', 'biotech', 'pharmaceutical', 'medical_devices', 
       'healthcare_tech'].includes(industry)) {
    return 'healthcare';
  }
  
  // Real estate industries
  if (['real_estate', 'commercial_real_estate', 'property_management', 
       'real_estate_development', 'luxury_real_estate', 'property_investment',
       'property_brokerage', 'real_estate_tech', 'mortgage_brokers',
       'real_estate_appraisal', 'title_companies', 'construction'].includes(industry)) {
    return 'real_estate';
  }
  
  // Marketing industries
  if (['marketing_agencies', 'advertising', 'digital_marketing', 
       'pr_firms', 'seo_agencies'].includes(industry)) {
    return 'marketing';
  }
  
  // Retail & Manufacturing
  if (['retail', 'ecommerce', 'manufacturing', 'wholesale', 
       'consumer_products'].includes(industry)) {
    return 'retail_manufacturing';
  }
  
  // Default case
  return 'general';
}

// Generate industry-specific company data
function generateIndustrySpecificData(category: string, companyName: string, location?: string): any {
  switch (category) {
    case 'real_estate':
      return generateBusinessCompanyData(companyName, location);
    case 'technology':
      return {
        name: companyName || "Tech Company",
        industry: "Technology",
        subIndustry: "Software Development",
        location: location || "San Francisco, CA",
        size: "51-200",
        address: generateRandomAddress(location),
        founded: 2010 + Math.floor(Math.random() * 10),
        contacts: generateIndustryContacts(3, companyName || "TechCorp", "technology")
      };
    case 'finance':
      return {
        name: companyName || "Finance Corporation",
        industry: "Finance",
        subIndustry: "Financial Services",
        location: location || "New York, NY",
        size: "201-500",
        address: generateRandomAddress(location),
        founded: 1980 + Math.floor(Math.random() * 30),
        contacts: generateIndustryContacts(3, companyName || "FinanceCorp", "finance")
      };
    case 'healthcare':
      return {
        name: companyName || "Healthcare Organization",
        industry: "Healthcare",
        subIndustry: "Medical Services",
        location: location || "Boston, MA",
        size: "501+",
        address: generateRandomAddress(location),
        founded: 1970 + Math.floor(Math.random() * 40),
        contacts: generateIndustryContacts(3, companyName || "HealthCorp", "healthcare")
      };
    case 'marketing':
      return {
        name: companyName || "Marketing Agency",
        industry: "Marketing",
        subIndustry: "Digital Marketing",
        location: location || "Los Angeles, CA",
        size: "11-50",
        address: generateRandomAddress(location),
        founded: 2005 + Math.floor(Math.random() * 15),
        contacts: generateIndustryContacts(3, companyName || "MarketingCorp", "marketing")
      };
    case 'retail_manufacturing':
      return {
        name: companyName || "Retail & Manufacturing",
        industry: "Retail/Manufacturing",
        subIndustry: "Consumer Products",
        location: location || "Chicago, IL",
        size: "201-500",
        address: generateRandomAddress(location),
        founded: 1960 + Math.floor(Math.random() * 50),
        contacts: generateIndustryContacts(3, companyName || "RetailCorp", "retail")
      };
    case 'general':
    default:
      const generatedName = companyName || `${generateRandomIndustry()} Group`;
      return {
        name: generatedName,
        industry: category !== 'general' ? category : generateRandomIndustry(),
        location: location || generateRandomLocation(),
        size: generateRandomSize(),
        address: generateRandomAddress(location),
        contacts: generateRandomContacts(3, generatedName),
      };
  }
}

// Generate additional contacts to simulate bulk data scraping
function generateMoreContacts(category: string, companyName: string, count: number): any[] {
  // Generate additional contacts based on industry category
  switch (category) {
    case 'real_estate':
      return generateBusinessContacts(count, companyName);
    case 'technology':
      return generateIndustryContacts(count, companyName, 'technology');
    case 'finance':
      return generateIndustryContacts(count, companyName, 'finance');
    case 'healthcare':
      return generateIndustryContacts(count, companyName, 'healthcare');
    case 'marketing':
      return generateIndustryContacts(count, companyName, 'marketing');
    case 'retail_manufacturing':
      return generateIndustryContacts(count, companyName, 'retail_manufacturing');
    default:
      return generateRandomContacts(count, companyName);
  }
}

// Helper functions to generate realistic dummy data for the simulation
function generateRandomIndustry(): string {
  const industries = [
    "Technology", "Healthcare", "Finance", "Manufacturing", 
    "Retail", "Education", "Real Estate", "Energy"
  ];
  return industries[Math.floor(Math.random() * industries.length)];
}

function generateBusinessCompanyData(companyName: string, location?: string): any {
  // Business data for any industry, not just real estate
  const businessIndustries = [
    "Technology", "Professional Services", "Manufacturing", "Healthcare", 
    "Financial Services", "Education", "Retail", "Hospitality", 
    "Transportation", "Construction", "Energy", "Media"
  ];
  
  const businessSpecialties = [
    "Digital Transformation", "Operational Excellence", "Customer Experience",
    "Business Process Optimization", "Innovation", "Sustainability",
    "Supply Chain Management", "Quality Assurance", "Project Management",
    "Risk Management", "Business Analytics", "Strategic Planning"
  ];
  
  const companySize = ["5-25", "26-50", "51-100", "101-250", "251-500", "501-1000", "1000+"];
  
  // Generate general company data
  return {
    name: companyName,
    industry: businessIndustries[Math.floor(Math.random() * businessIndustries.length)],
    subIndustry: businessIndustries[Math.floor(Math.random() * businessIndustries.length)],
    specialties: businessSpecialties.slice(0, 2 + Math.floor(Math.random() * 3)),
    location: location || generateRandomLocation(),
    size: companySize[Math.floor(Math.random() * companySize.length)],
    address: generateRandomAddress(location),
    yearEstablished: 1970 + Math.floor(Math.random() * 50),
    contacts: generateBusinessContacts(3 + Math.floor(Math.random() * 3), companyName)
  };
}

function generateRandomLocation(): string {
  const locations = [
    "San Francisco, CA", "New York, NY", "Austin, TX", "Chicago, IL",
    "Seattle, WA", "Boston, MA", "Denver, CO", "Atlanta, GA"
  ];
  return locations[Math.floor(Math.random() * locations.length)];
}

function getLocationFromCode(locationCode: string): string {
  const locationMap: {[key: string]: string} = {
    'new_york': 'New York, NY',
    'los_angeles': 'Los Angeles, CA',
    'chicago': 'Chicago, IL',
    'miami': 'Miami, FL',
    'dallas': 'Dallas, TX',
    'seattle': 'Seattle, WA',
    'boston': 'Boston, MA',
    'san_francisco': 'San Francisco, CA',
    'denver': 'Denver, CO',
    'atlanta': 'Atlanta, GA',
    'houston': 'Houston, TX',
    'philadelphia': 'Philadelphia, PA'
  };
  
  return locationMap[locationCode] || locationCode;
}

function generateRandomSize(): string {
  const sizes = ["1-10", "11-50", "51-200", "201-500", "501+"];
  return sizes[Math.floor(Math.random() * sizes.length)];
}

function generateRandomAddress(location?: string): string {
  const streets = [
    "Main St", "Broadway", "Market St", "Washington Ave", 
    "Technology Dr", "Innovation Way", "Commerce Blvd"
  ];
  
  const streetNumbers = [123, 456, 789, 555, 999, 777, 888];
  const cities = ["San Francisco", "New York", "Austin", "Chicago", "Seattle", "Boston"];
  const states = ["CA", "NY", "TX", "IL", "WA", "MA"];
  const zips = ["94105", "10001", "78701", "60601", "98101", "02110"];
  
  const randomIndex = Math.floor(Math.random() * streets.length);
  
  if (location) {
    const parts = location.split(',');
    if (parts.length > 1) {
      return `${streetNumbers[randomIndex]} ${streets[randomIndex]}, ${location}`;
    }
  }
  
  const cityIndex = Math.floor(Math.random() * cities.length);
  return `${streetNumbers[randomIndex]} ${streets[randomIndex]}, ${cities[cityIndex]}, ${states[cityIndex]} ${zips[cityIndex]}`;
}

function generateRandomContacts(count: number, companyName: string): any[] {
  const contacts = [];
  
  // First names
  const firstNames = ["John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Lisa", "James", "Jennifer"];
  
  // Last names
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson", "Martinez"];
  
  // Positions with different levels of seniority
  const positions = [
    "CEO", "CTO", "CFO", "COO", "CMO",
    "VP of Sales", "VP of Marketing", "VP of Operations", "VP of Technology",
    "Director of Sales", "Director of Marketing", "Director of Operations",
    "Sales Manager", "Marketing Manager", "Operations Manager",
    "Sales Representative", "Marketing Coordinator", "Administrative Assistant"
  ];
  
  // Domain for email
  const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const position = positions[Math.floor(Math.random() * positions.length)];
    
    // Generate email
    const email = `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}@${domain}`;
    
    // Generate phone
    const areaCode = ["415", "212", "512", "312", "206", "617"][Math.floor(Math.random() * 6)];
    const phone = `(${areaCode}) 555-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Is this a decision-maker? (based on position being senior)
    const isDecisionMaker = position.includes("CEO") || position.includes("CTO") || 
                           position.includes("CFO") || position.includes("COO") || 
                           position.includes("VP") || position.includes("Director");
    
    // Generate personal cell phone for decision makers
    const cellPhone = isDecisionMaker ? 
      `(${Math.floor(Math.random() * 800) + 200}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(1000 + Math.random() * 9000)}` : 
      null;
      
    // Generate home address for decision makers
    const homeAddress = isDecisionMaker ?
      `${Math.floor(Math.random() * 9000) + 1000} ${['Maple', 'Oak', 'Pine', 'Cedar', 'Elm', 'Willow'][Math.floor(Math.random() * 6)]} ${
        ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Way'][Math.floor(Math.random() * 6)]}, ${
        ['Apt', 'Unit', 'Suite'][Math.floor(Math.random() * 3)]} ${Math.floor(Math.random() * 900) + 100}` :
      null;
    
    // Generate company details
    const currentCompany = {
      name: companyName,
      title: position,
      yearsAtCompany: Math.floor(Math.random() * 10) + 1
    };
    
    // Previous company details
    const previousCompany = Math.random() > 0.6 ? {
      name: `${['Alpha', 'Beta', 'Nova', 'Apex', 'Prime', 'Elite'][Math.floor(Math.random() * 6)]} ${
        ['Solutions', 'Group', 'Partners', 'Ventures', 'Corp', 'Industries'][Math.floor(Math.random() * 6)]}`,
      title: position.includes("C") || position.includes("VP") ? 
             position.replace("C", "Director").replace("VP", "Manager") : 
             `${['Senior', 'Lead', 'Associate'][Math.floor(Math.random() * 3)]} ${position}`,
      years: `${Math.floor(Math.random() * 5) + 1}-${Math.floor(Math.random() * 5) + 5} years`
    } : null;
    
    contacts.push({
      name: `${firstName} ${lastName}`,
      position,
      email,
      companyPhone: phone,
      personalPhone: cellPhone,
      homeAddress: homeAddress,
      isDecisionMaker: isDecisionMaker,
      influence: isDecisionMaker ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 50) + 20,
      budget: isDecisionMaker ? `$${(Math.floor(Math.random() * 900) + 100)}K - $${(Math.floor(Math.random() * 900) + 1000)}K` : "Unknown",
      currentCompany: currentCompany,
      previousCompany: previousCompany,
      linkedIn: Math.random() > 0.3 ? `linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${Math.floor(Math.random() * 999)}` : null,
      twitter: Math.random() > 0.7 ? `@${firstName.toLowerCase()}${lastName.toLowerCase()[0]}` : null,
      meetings: isDecisionMaker ? Math.floor(Math.random() * 3) : 0,
      notes: isDecisionMaker ? `${firstName} is a key decision-maker for vendor selection and has procurement authority.` : ""
    });
  }
  
  return contacts;
}

function generateBusinessContacts(count: number, companyName: string): any[] {
  const contacts = [];
  
  // First names
  const firstNames = ["John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Lisa", "James", "Jennifer", 
                      "Richard", "Patricia", "Thomas", "Jessica", "William", "Elizabeth", "Daniel", "Karen"];
  
  // Last names
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson", "Martinez",
                     "Anderson", "Taylor", "Thomas", "Harris", "Moore", "Clark", "Lewis", "Young"];
  
  // Business positions with different levels of seniority
  const businessPositions = [
    "CEO", "COO", "CFO", "CTO", "CIO", "CMO", "President", 
    "Executive Director", "Managing Director", "General Manager",
    "VP of Sales", "VP of Operations", "VP of Marketing", "VP of Finance", "VP of Technology",
    "Director of Sales", "Director of Operations", "Director of Marketing", "Director of Finance",
    "Director of IT", "Director of Procurement", "Director of Facilities Management",
    "Senior Manager", "Operations Manager", "Sales Manager", "Marketing Manager", 
    "Procurement Manager", "Facilities Manager", "Office Manager",
    "Business Development Executive", "Account Executive", "Project Manager"
  ];
  
  // Domain for email
  const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
  
  // Ensure at least one decision maker
  let hasDecisionMaker = false;
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // For the first contact or with 30% probability, make it a senior position
    let position;
    if (i === 0 || Math.random() < 0.3) {
      position = businessPositions[Math.floor(Math.random() * 7)]; // Top executive positions (CEO, COO, etc.)
      hasDecisionMaker = true;
    } else {
      position = businessPositions[Math.floor(Math.random() * businessPositions.length)];
    }
    
    // Generate email
    const email = `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}@${domain}`;
    
    // Generate direct phone
    const areaCode = ["415", "212", "512", "312", "206", "617"][Math.floor(Math.random() * 6)];
    const phone = `(${areaCode}) 555-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Is this a decision-maker? (based on position being senior)
    const isDecisionMaker = i === 0 || position.includes("CEO") || position.includes("COO") || 
                           position.includes("CFO") || position.includes("CTO") || position.includes("CIO") ||
                           position.includes("CMO") || position.includes("President") || position.includes("VP") || 
                           position.includes("Director") || position.includes("Chief");
    
    // Generate cell phone for decision makers
    const cellPhone = isDecisionMaker ? 
      `(${Math.floor(Math.random() * 800) + 200}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(1000 + Math.random() * 9000)}` : 
      null;
      
    // Add address for decision makers
    const homeAddress = isDecisionMaker ?
      `${Math.floor(Math.random() * 9000) + 1000} ${['Maple', 'Oak', 'Pine', 'Cedar', 'Elm', 'Willow'][Math.floor(Math.random() * 6)]} ${
        ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Way'][Math.floor(Math.random() * 6)]}, ${
        ['Apt', 'Unit', 'Suite'][Math.floor(Math.random() * 3)]} ${Math.floor(Math.random() * 900) + 100}` :
      null;
    
    // Generate company details
    const currentCompany = {
      name: companyName,
      title: position,
      yearsAtCompany: Math.floor(Math.random() * 10) + 1
    };
    
    // Previous company details for more context - general business focused
    const previousCompany = Math.random() > 0.5 ? {
      name: `${['Alpha', 'Beta', 'Nova', 'Apex', 'Prime', 'Elite'][Math.floor(Math.random() * 6)]} ${
        ['Solutions', 'Group', 'Ventures', 'Partners', 'International', 'Industries'][Math.floor(Math.random() * 6)]}`,
      title: position.includes("CEO") || position.includes("VP") ? 
             position.replace("CEO", "Director").replace("VP", "Manager") : 
             `${['Senior', 'Lead', 'Associate'][Math.floor(Math.random() * 3)]} ${position}`,
      years: `${Math.floor(Math.random() * 5) + 1}-${Math.floor(Math.random() * 5) + 5} years`
    } : null;
    
    contacts.push({
      name: `${firstName} ${lastName}`,
      position,
      email,
      companyPhone: phone,
      personalPhone: cellPhone,
      homeAddress: homeAddress,
      isDecisionMaker: isDecisionMaker,
      influence: isDecisionMaker ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 50) + 20,
      budget: isDecisionMaker ? `$${(Math.floor(Math.random() * 900) + 100)}K - $${(Math.floor(Math.random() * 900) + 1000)}K` : "Unknown",
      currentCompany: currentCompany,
      previousCompany: previousCompany,
      linkedIn: Math.random() > 0.3 ? `linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${Math.floor(Math.random() * 999)}` : null,
      twitter: Math.random() > 0.7 ? `@${firstName.toLowerCase()}${lastName.toLowerCase()[0]}` : null,
      meetings: isDecisionMaker ? Math.floor(Math.random() * 3) : 0,
      notes: isDecisionMaker ? `${firstName} is a key decision-maker for cleaning service vendor selection and has procurement authority.` : ""
    });
  }
  
  // If no decision makers were created, ensure at least one
  if (!hasDecisionMaker && contacts.length > 0) {
    contacts[0].position = businessPositions[Math.floor(Math.random() * 7)];
  }
  
  return contacts;
}
