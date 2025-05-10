import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as cheerio from "cheerio";
import axios from "axios";
import { 
  insertCompanySchema, insertContactSchema, insertSearchHistorySchema,
  type InsertCompany, type InsertContact, type InsertSearchHistory 
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
      const { company, industry, location, position, size, prioritizeDecisionMakers } = req.body;
      
      if (!company) {
        return res.status(400).json({ error: "Company name is required" });
      }

      // Record search in history
      const searchHistoryData: InsertSearchHistory = {
        query: company,
        resultsCount: 0,
      };
      
      await storage.createSearchHistory(searchHistoryData);
      
      // In a real application, we would scrape Google or use an API
      // For this demo, we'll simulate the scraping process with mock data
      const scrapedData = await simulateScraping(company, industry, location);
      
      if (!scrapedData) {
        return res.status(404).json({ error: "No results found for this company" });
      }

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

// Simulate scraping function - in a real app this would make actual web requests
async function simulateScraping(companyName: string, industry?: string, location?: string): Promise<any> {
  // In a real implementation, this would use Puppeteer or Cheerio to scrape Google
  
  // For now, simulate response delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate simulated data based on search parameters
  const companyData = {
    name: companyName,
    industry: industry || generateRandomIndustry(),
    location: location || generateRandomLocation(),
    size: generateRandomSize(),
    address: generateRandomAddress(location),
    contacts: generateRandomContacts(3, companyName),
  };
  
  return companyData;
}

// Helper functions to generate realistic dummy data for the simulation
function generateRandomIndustry(): string {
  const industries = [
    "Technology", "Healthcare", "Finance", "Manufacturing", 
    "Retail", "Education", "Real Estate", "Energy"
  ];
  return industries[Math.floor(Math.random() * industries.length)];
}

function generateRealEstateCompanyData(companyName: string, location?: string): any {
  // Real estate specific data
  const realEstateTypes = [
    "Residential Real Estate", "Commercial Real Estate", "Property Management", 
    "Real Estate Development", "Luxury Real Estate", "Real Estate Investment", 
    "Property Brokerage"
  ];
  
  const propertyTypes = [
    "Single Family Homes", "Condominiums", "Commercial Properties", 
    "Office Buildings", "Retail Spaces", "Industrial Properties", 
    "Multi-Family Units", "Luxury Estates"
  ];
  
  const realEstateCompanySize = ["5-25", "26-50", "51-100", "101-250", "251-500"];
  
  // Generate company data
  return {
    name: companyName,
    industry: "Real Estate",
    subIndustry: realEstateTypes[Math.floor(Math.random() * realEstateTypes.length)],
    specialties: propertyTypes.slice(0, 2 + Math.floor(Math.random() * 3)),
    location: location || generateRandomLocation(),
    size: realEstateCompanySize[Math.floor(Math.random() * realEstateCompanySize.length)],
    address: generateRandomAddress(location),
    yearEstablished: 1970 + Math.floor(Math.random() * 50),
    contacts: generateRealEstateContacts(3 + Math.floor(Math.random() * 3), companyName)
  };
}

function generateRandomLocation(): string {
  const locations = [
    "San Francisco, CA", "New York, NY", "Austin, TX", "Chicago, IL",
    "Seattle, WA", "Boston, MA", "Denver, CO", "Atlanta, GA"
  ];
  return locations[Math.floor(Math.random() * locations.length)];
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
    
    contacts.push({
      name: `${firstName} ${lastName}`,
      position,
      email,
      phone,
    });
  }
  
  return contacts;
}

function generateRealEstateContacts(count: number, companyName: string): any[] {
  const contacts = [];
  
  // First names
  const firstNames = ["John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Lisa", "James", "Jennifer", 
                      "Richard", "Patricia", "Thomas", "Jessica", "William", "Elizabeth", "Daniel", "Karen"];
  
  // Last names
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson", "Martinez",
                     "Anderson", "Taylor", "Thomas", "Harris", "Moore", "Clark", "Lewis", "Young"];
  
  // Real estate specific positions with different levels of seniority
  const realEstatePositions = [
    "Broker/Owner", "Managing Broker", "Principal Broker", "Broker of Record", "CEO",
    "VP of Sales", "VP of Property Management", "Director of Acquisitions", "Director of Leasing",
    "Senior Real Estate Agent", "Real Estate Agent", "Realtor", "Commercial Broker",
    "Property Manager", "Leasing Consultant", "Mortgage Broker", "Transaction Coordinator",
    "Real Estate Developer", "Real Estate Investor", "Chief Investment Officer",
    "Marketing Director", "Business Development Manager"
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
      position = realEstatePositions[Math.floor(Math.random() * 6)]; // Senior positions
      hasDecisionMaker = true;
    } else {
      position = realEstatePositions[Math.floor(Math.random() * realEstatePositions.length)];
    }
    
    // Generate email
    const email = `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}@${domain}`;
    
    // Generate direct phone
    const areaCode = ["415", "212", "512", "312", "206", "617"][Math.floor(Math.random() * 6)];
    const phone = `(${areaCode}) 555-${Math.floor(1000 + Math.random() * 9000)}`;
    
    contacts.push({
      name: `${firstName} ${lastName}`,
      position,
      email,
      phone,
    });
  }
  
  // If no decision makers were created, ensure at least one
  if (!hasDecisionMaker && contacts.length > 0) {
    contacts[0].position = realEstatePositions[Math.floor(Math.random() * 5)];
  }
  
  return contacts;
}
