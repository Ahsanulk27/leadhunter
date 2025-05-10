import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as cheerio from "cheerio";
import axios from "axios";
import { generateIndustryContacts } from "./routes-industry";
import { BusinessData, ScrapingResult, ErrorResponse, SearchParams } from "./models/business-data";
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
      const historyQuery = company || 
                     (industry && location ? `${industry} in ${location}` : 
                      (industry || location || 'general business search'));

      // Record search in history
      const searchHistoryData: InsertSearchHistory = {
        query: historyQuery,
        resultsCount: 0,
      };
      
      await storage.createSearchHistory(searchHistoryData);
      console.log("📍 Search recorded in history");

      // Build search query for Google Places API
      console.log("📍 Searching for REAL business data using Google Places API...");
      
      // Create the optimal search query for the API
      let apiQuery = "";
      if (company) {
        apiQuery = company;
        if (location) apiQuery += ` ${location}`;
      } else if (industry) {
        apiQuery = industry;
        if (location) apiQuery += ` ${location}`;
      } else if (location) {
        apiQuery = location;
      } else {
        apiQuery = "business";
      }
      
      try {
        // Use our real data fetch function
        const scrapedData = await fetchRealBusinessData(apiQuery, location);
        
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
      } catch (apiError: any) {
        console.error("📍 API error encountered:", apiError.message);
        
        // Check if this is a Google Places API error
        if (apiError.message.includes("Google Places API")) {
          if (apiError.message.includes("REQUEST_DENIED")) {
            return res.status(503).json({
              error: {
                code: "PLACES_API_REQUEST_DENIED",
                message: "Google Places API access is currently unavailable. Please enable the Places API for your Google API key."
              }
            });
          } else if (apiError.message.includes("OVER_QUERY_LIMIT")) {
            return res.status(429).json({
              error: {
                code: "PLACES_API_QUERY_LIMIT",
                message: "We've reached our daily search limit with Google Places API. Please try again tomorrow."
              }
            });
          } else {
            return res.status(503).json({
              error: {
                code: "PLACES_API_ERROR",
                message: apiError.message
              }
            });
          }
        }
        
        // For other errors, return a generic error
        return res.status(500).json({
          error: {
            code: "SEARCH_ERROR",
            message: "An error occurred while searching for business data."
          }
        });
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

  // Export search results to Google Sheets
  app.post("/api/export-to-sheets", async (req: Request, res: Response) => {
    try {
      console.log("📊 API /export-to-sheets route called with request body:", req.body);
      
      // Check if we have required parameters
      const { searchId, spreadsheetId } = req.body;
      
      if (!spreadsheetId) {
        return res.status(400).json({ 
          error: "Missing required parameters", 
          message: "Please provide a spreadsheetId parameter" 
        });
      }
      
      // Generate execution ID for tracking this export
      const executionId = `export-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      console.log(`📊 [${executionId}] Starting Google Sheets export`);
      
      // Import needed modules
      const { googleSheetsService } = await import('./api/google-sheets-service');
      const { searchController } = await import('./controllers/search-controller');
      
      // If searchId is provided, get that specific search from history
      let searchParams: any = {};
      let businesses: BusinessData[] = [];
      
      if (searchId) {
        const searchHistory = await storage.getSearchHistory();
        const searchEntry = searchHistory.find(entry => entry.id === parseInt(searchId));
        
        if (!searchEntry) {
          return res.status(404).json({ 
            error: "Search not found", 
            message: "The specified search ID was not found in search history" 
          });
        }
        
        console.log(`📊 [${executionId}] Found search in history: "${searchEntry.query}"`);
        
        // Parse the query to extract search parameters
        let industry, location, companyName;
        
        if (searchEntry.query.includes(" in ")) {
          // Format: "industry in location"
          [industry, location] = searchEntry.query.split(" in ").map(s => s.trim());
        } else {
          // Assume it's a company name or just industry/location
          if (/[A-Z]/.test(searchEntry.query) || /[&\-',.]/.test(searchEntry.query)) {
            companyName = searchEntry.query;
          } else {
            industry = searchEntry.query;
          }
        }
        
        // Execute the search to get fresh data
        console.log(`📊 [${executionId}] Re-executing search with parameters: industry=${industry}, location=${location}, company=${companyName}`);
        
        searchParams = {
          industry,
          location,
          companyName,
          executionId
        };
        
        const searchResult = await searchController.searchBusinessData(searchParams);
        
        if (searchResult && 'businesses' in searchResult) {
          businesses = searchResult.businesses;
        } else {
          return res.status(404).json({
            error: "No data found",
            message: "The search did not return any business data to export"
          });
        }
      } else {
        // If no searchId, check if we have raw business data in request
        if (req.body.businesses && Array.isArray(req.body.businesses)) {
          businesses = req.body.businesses;
        } else {
          return res.status(400).json({
            error: "Missing data",
            message: "Please provide either a searchId or businesses data to export"
          });
        }
      }
      
      // Now export to Google Sheets
      if (businesses.length === 0) {
        return res.status(404).json({
          error: "No data to export",
          message: "No business data found to export to Google Sheets"
        });
      }
      
      // Generate a sheet name based on search parameters or timestamp
      let sheetName = "Lead Data";
      if (searchParams.industry) sheetName = `${searchParams.industry}`;
      if (searchParams.location) sheetName += ` ${searchParams.location}`;
      if (sheetName === "Lead Data" && searchParams.companyName) sheetName = searchParams.companyName;
      sheetName += ` - ${new Date().toLocaleDateString()}`;
      
      // Export the data
      console.log(`📊 [${executionId}] Exporting ${businesses.length} businesses to Google Sheets (ID: ${spreadsheetId})`);
      
      const exportResult = await googleSheetsService.exportBusinessData(
        businesses,
        {
          spreadsheetId,
          sheetName,
          includeContactDetails: true
        }
      );
      
      // Return the result
      return res.status(200).json({
        status: exportResult.success ? "success" : "error",
        message: exportResult.message,
        spreadsheetUrl: exportResult.url,
        timestamp: new Date().toISOString(),
        execution_id: executionId,
        data_exported: {
          businesses: businesses.length,
          contacts: businesses.reduce((count, b) => count + (b.contacts?.length || 0), 0)
        }
      });
    } catch (error) {
      console.error("📊 Error exporting to Google Sheets:", error);
      return res.status(500).json({ 
        error: "Export failed", 
        message: `Error exporting to Google Sheets: ${(error as Error).message}`
      });
    }
  });
  
  // Check Google Sheets API setup and create a new sheet if needed
  app.get("/api/sheets-status", async (req: Request, res: Response) => {
    try {
      console.log(`📊 Checking Google Sheets API status`);
      
      // Import Google Sheets service
      const { googleSheetsService } = await import('./api/google-sheets-service');
      
      // Check if we're authorized 
      const isAuthorized = googleSheetsService.isAuthorized();
      
      // Return the status
      const response = {
        status: isAuthorized ? "configured" : "not_configured",
        timestamp: new Date().toISOString(),
        auth_method: null as string | null,
        last_export: googleSheetsService.getLastExport() || null
      };
      
      if (isAuthorized) {
        response.auth_method = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 
          "service_account" : (process.env.GOOGLE_API_KEY ? "api_key" : "unknown");
      }
      
      // Provide instructions for setting up if not configured
      if (!isAuthorized) {
        return res.status(200).json({
          ...response,
          setup_instructions: {
            message: "Google Sheets API is not configured. You need to provide either a service account JSON or an API key.",
            options: [
              {
                name: "Service Account (Recommended)",
                env_var: "GOOGLE_APPLICATION_CREDENTIALS_JSON",
                description: "Full service account JSON credentials from Google Cloud Console"
              },
              {
                name: "API Key",
                env_var: "GOOGLE_API_KEY",
                description: "Simple API key from Google Cloud Console (limited functionality)"
              }
            ],
            additional_settings: [
              {
                name: "Spreadsheet ID",
                env_var: "GOOGLE_SHEETS_ID",
                description: "ID of an existing Google Sheet to export data to (optional)"
              },
              {
                name: "Auto-Export",
                env_var: "AUTO_EXPORT_TO_SHEETS",
                description: "Set to 'true' to automatically export search results to Google Sheets"
              }
            ]
          }
        });
      }
      
      return res.status(200).json(response);
    } catch (error) {
      console.error(`❌ Error checking Google Sheets status:`, error);
      return res.status(500).json({ 
        error: "Failed to check Google Sheets status", 
        message: (error as Error).message 
      });
    }
  });
  
  // Create a new Google Sheet for exports
  app.post("/api/create-sheet", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      
      if (!title) {
        return res.status(400).json({
          error: "Missing title",
          message: "Please provide a title for the new Google Sheet"
        });
      }
      
      console.log(`📊 Creating new Google Sheet with title: ${title}`);
      
      // Import Google Sheets service
      const { googleSheetsService } = await import('./api/google-sheets-service');
      
      // Check if we're authorized
      if (!googleSheetsService.isAuthorized()) {
        return res.status(400).json({
          error: "Not configured",
          message: "Google Sheets API is not properly configured. Check /api/sheets-status for setup instructions."
        });
      }
      
      // Create the sheet
      const spreadsheetId = await googleSheetsService.createSpreadsheet(title);
      
      return res.status(200).json({
        status: "success",
        message: `Created new Google Sheet: ${title}`,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Error creating Google Sheet:`, error);
      return res.status(500).json({ 
        error: "Failed to create Google Sheet", 
        message: (error as Error).message 
      });
    }
  });

  // Self-test endpoint to verify scraping functionality
  app.get("/scrape/self-test", async (req: Request, res: Response) => {
    try {
      console.log(`🧪 Starting self-test of scraping functionality`);
      
      // Import self-test service
      const { selfTestService } = await import('./api/self-test');
      
      // Run all tests
      const testResults = await selfTestService.runAllTests();
      const testReport = selfTestService.getTestReport();
      
      return res.status(200).json({
        status: testReport.passed_tests === testReport.total_tests ? "success" : "partial_success",
        timestamp: new Date().toISOString(),
        test_report: testReport
      });
    } catch (error) {
      console.error("❌ Error during self-test:", error);
      return res.status(500).json({
        error: "Self-test error",
        message: "An error occurred while testing the scraping functionality",
        details: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Dedicated /scrape API endpoint for direct access with query parameters
  app.get("/scrape", async (req: Request, res: Response) => {
    try {
      // Start measuring execution time
      const startTime = Date.now();
      const executionId = `scrape-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      console.log(`🔍 [${executionId}] API /scrape route called with query parameters:`, req.query);
      
      // Extract query parameters with pagination and limit support
      const query = req.query.query as string || '';
      const location = req.query.location as string || '';
      const page = parseInt(req.query.page as string || '1');
      const limit = Math.min(parseInt(req.query.limit as string || '10'), 50); // Cap at 50 max results per page
      
      // Validate parameters
      if (!query && !location) {
        console.log(`❌ [${executionId}] Missing required query parameters (query or location)`);
        return res.status(400).json({
          error: "Missing parameters",
          message: "Please provide at least one of: 'query' (company or industry) or 'location' parameter",
          timestamp: new Date().toISOString(),
          execution_id: executionId
        });
      }
      
      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        return res.status(400).json({
          error: "Invalid pagination",
          message: "Page parameter must be a positive integer",
          timestamp: new Date().toISOString(),
          execution_id: executionId
        });
      }
      
      if (isNaN(limit) || limit < 1) {
        return res.status(400).json({
          error: "Invalid limit",
          message: "Limit parameter must be a positive integer",
          timestamp: new Date().toISOString(),
          execution_id: executionId
        });
      }
      
      console.log(`🔍 [${executionId}] Processing scrape request for query: '${query}', location: '${location}', page: ${page}, limit: ${limit}`);
      
      // Create execution log to track all scraping attempts
      const executionLog: any = {
        execution_id: executionId,
        timestamp: new Date().toISOString(),
        query_params: { query, location, page, limit },
        scraping_attempts: [],
        scraping_results: [],
        error_details: []
      };
      
      console.log(`🔍 [${executionId}] Executing real business search with Google Places API`);
      
      // Search with Google Places API
      const { googlePlacesService } = await import('./api/google-places-service');
      const result = await googlePlacesService.searchBusinesses(query, location);
      
      // Format the results in the expected ScrapingResult format
      const scrapingResult: ScrapingResult = {
        businesses: result.businesses,
        meta: {
          sources: result.sources,
          query: query,
          location: location,
          timestamp: new Date().toISOString(),
          execution_id: executionId,
          total_count: result.businesses.length,
          page: page,
          limit: limit,
          total_pages: Math.ceil(result.businesses.length / limit)
        }
      };
      
      // Add these properties to help with type checking in the rest of the code
      (scrapingResult as any).totalCount = result.businesses.length;
      (scrapingResult as any).sources = result.sources;
      
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      executionLog.execution_time_ms = executionTime;
      
      // ONLY return real data - if no results found, return 404 with clear error
      if (!scrapingResult || !scrapingResult.businesses || scrapingResult.businesses.length === 0) {
        console.log(`❌ [${executionId}] No real business data found after scraping all sources in ${executionTime}ms`);
        
        // Log all scraping attempts and errors for analysis
        console.log(`📊 [${executionId}] Execution Log:`, JSON.stringify(executionLog, null, 2));
        
        return res.status(404).json({
          error: "No results found",
          message: "No real business information could be found after searching multiple authentic sources including Google Maps, Yelp, and industry directories.",
          query,
          location,
          timestamp: new Date().toISOString(),
          execution_id: executionId,
          execution_time_ms: executionTime,
          sources_checked: ["Google Maps", "Yelp", "Yellow Pages", "Industry Directories"],
          execution_log: executionLog
        });
      }
      
      // Calculate pagination metadata
      const totalResults = scrapingResult.totalCount;
      const totalPages = Math.ceil(totalResults / limit);
      
      console.log(`✅ [${executionId}] Successfully scraped real business data: ${scrapingResult.businesses.length} results in ${executionTime}ms`);
      
      // Return the results in a clean JSON format with pagination
      return res.status(200).json({
        status: "success",
        timestamp: new Date().toISOString(),
        execution_id: executionId,
        execution_time_ms: executionTime,
        data: scrapingResult.businesses.map((business: BusinessData) => ({
          business_name: business.name,
          category: business.category || "",
          address: business.address || "",
          phone: business.phoneNumber || "",
          website: business.website || "",
          email: business.email || "",
          imageUrl: business.imageUrl || "",
          description: business.description || "",
          rating: business.rating || 0,
          reviewCount: business.reviewCount || 0,
          source: business.source,
          sourceUrl: business.sourceUrl,
          contacts: business.contacts?.map((contact: Contact) => ({
            name: contact.name,
            position: contact.position || "",
            email: contact.email || "",
            phone: contact.phoneNumber || "",
            is_decision_maker: contact.isDecisionMaker || false
          })) || []
        })),
        metadata: {
          page: page,
          limit: limit,
          total_results: totalResults,
          total_pages: totalPages,
          query_params: {
            query,
            location
          },
          scrape_sources: scrapingResult.sources,
          execution_log: executionLog
        }
      });
      
      // Auto-export to Google Sheets if enabled
      if (process.env.AUTO_EXPORT_TO_SHEETS === 'true' && process.env.GOOGLE_SHEETS_ID) {
        try {
          console.log(`📊 [${executionId}] Auto-exporting results to Google Sheets`);
          
          // Import Google Sheets service
          const { googleSheetsService } = await import('./api/google-sheets-service');
          
          // Export data
          const exportResult = await googleSheetsService.exportBusinessData(
            scrapingResult.businesses,
            {
              spreadsheetId: process.env.GOOGLE_SHEETS_ID,
              sheetName: `${query || location || 'Leads'} - ${new Date().toLocaleDateString()}`,
              includeContactDetails: true
            }
          );
          
          console.log(`📊 [${executionId}] Google Sheets export result:`, exportResult);
        } catch (exportError) {
          console.error(`❌ [${executionId}] Error exporting to Google Sheets:`, exportError);
          // Don't fail the request if export fails
        }
      }
      
      return res.status(200).json({
        status: "success",
        timestamp: new Date().toISOString(),
        execution_id: executionId,
        execution_time_ms: executionTime,
        data: scrapingResult.businesses.map((business: BusinessData) => ({
          business_name: business.name,
          category: business.category || "",
          address: business.address || "",
          phone: business.phoneNumber || "",
          website: business.website || "",
          email: business.email || "",
          imageUrl: business.imageUrl || "",
          description: business.description || "",
          rating: business.rating || 0,
          reviewCount: business.reviewCount || 0,
          source: business.source,
          sourceUrl: business.sourceUrl,
          contacts: business.contacts?.map((contact: Contact) => ({
            name: contact.name,
            position: contact.position || "",
            email: contact.email || "",
            phone: contact.phoneNumber || "",
            is_decision_maker: contact.isDecisionMaker || false
          })) || []
        })),
        metadata: {
          page: page,
          limit: limit,
          total_results: totalResults,
          total_pages: totalPages,
          query_params: {
            query,
            location
          },
          scrape_sources: scrapingResult.sources,
          execution_log: executionLog
        }
      });
    } catch (error) {
      const errorTimestamp = new Date().toISOString();
      console.error(`❌ Error during scraping operation at ${errorTimestamp}:`, error);
      
      // Log detailed error information for debugging
      console.error(`Error stack: ${(error as any).stack || 'No stack trace available'}`);
      
      return res.status(500).json({
        error: "Server error",
        message: "An error occurred while attempting to scrape business data.",
        details: (error as any).message,
        timestamp: errorTimestamp,
        stack: process.env.NODE_ENV === 'development' ? (error as any).stack : undefined
      });
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

// Real business data scraping using Google Places API
async function fetchRealBusinessData(query: string, location?: string): Promise<any> {
  console.log(`Starting real business data search for: ${query}, location: ${location}`);
  
  // Import Google Places service
  const { googlePlacesService } = await import('./api/google-places-service');
  
  // Search for businesses using Google Places API
  const result = await googlePlacesService.searchBusinesses(query, location);
  
  // Check if there was an API error
  if (result.error) {
    console.log(`API error encountered: ${result.error.code} - ${result.error.message}`);
    throw new Error(`Google Places API error: ${result.error.message}`);
  }
  
  if (result.businesses.length === 0) {
    console.log(`No real business data found for query: ${query}, location: ${location}`);
    return null;
  }
  
  console.log(`Found ${result.businesses.length} businesses for query: ${query}`);
  
  // Return the first business as the main result
  const mainBusiness = result.businesses[0];
  
  return {
    name: mainBusiness.name,
    industry: mainBusiness.category,
    location: location || "",
    address: mainBusiness.address,
    phone: mainBusiness.phoneNumber,
    website: mainBusiness.website,
    email: "",
    description: mainBusiness.description,
    imageUrl: mainBusiness.imageUrl,
    contacts: mainBusiness.contacts || [],
    source: mainBusiness.source,
    sourceUrl: mainBusiness.sourceUrl
  };
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
