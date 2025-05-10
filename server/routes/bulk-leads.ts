import { Router, Request, Response, Express } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertBulkLeadSearchSchema } from '@shared/schema';
import { GooglePlacesService } from '../api/google-places-service';

// Schema for bulk lead search request
const bulkLeadSearchRequestSchema = z.object({
  searchTerm: z.string(),
  locations: z.array(z.string()),
  businesses: z.array(z.any())
});

/**
 * Register bulk lead routes with the Express application
 */
export function registerBulkLeadRoutes(app: Express, googlePlacesService: GooglePlacesService) {
  const router = Router();
  
  // Get available locations - Define this BEFORE the ID route to prevent route conflicts
  router.get('/locations', async (_req: Request, res: Response) => {
    try {
      // Define a list of common locations for bulk lead searches
      const availableLocations = [
        'new_york',
        'los_angeles',
        'chicago',
        'houston',
        'phoenix',
        'philadelphia',
        'san_antonio',
        'san_diego',
        'dallas',
        'san_jose',
        'austin',
        'jacksonville',
        'san_francisco',
        'columbus',
        'fort_worth',
        'indianapolis',
        'charlotte',
        'seattle',
        'denver',
        'washington_dc',
        'boston',
        'detroit',
        'nashville',
        'portland',
        'las_vegas',
        'atlanta',
        'miami',
        'minneapolis'
      ];
      
      res.json({ locations: availableLocations });
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ error: 'Failed to fetch available locations' });
    }
  });
  
  // Get available industries - Define this BEFORE the ID route to prevent route conflicts
  router.get('/industries', async (_req: Request, res: Response) => {
    try {
      // Define industry categories for search filtering
      const availableIndustries = [
        'technology',
        'healthcare',
        'finance',
        'education',
        'real_estate',
        'legal',
        'manufacturing',
        'retail',
        'food_and_beverage',
        'construction',
        'automotive',
        'entertainment',
        'marketing',
        'transportation',
        'hospitality'
      ];
      
      res.json({ industries: availableIndustries });
    } catch (error) {
      console.error('Error fetching industries:', error);
      res.status(500).json({ error: 'Failed to fetch available industries' });
    }
  });
  
  // Get all bulk lead searches
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const bulkSearches = await storage.getBulkLeadSearches();
      res.json(bulkSearches);
    } catch (error) {
      console.error('Error fetching bulk lead searches:', error);
      res.status(500).json({ error: 'Failed to fetch bulk lead searches' });
    }
  });
  
  // Get a specific bulk lead search by ID - This should come AFTER other specific routes
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      
      const bulkSearch = await storage.getBulkLeadSearch(id);
      if (!bulkSearch) {
        return res.status(404).json({ error: 'Bulk lead search not found' });
      }
      
      res.json(bulkSearch);
    } catch (error) {
      console.error('Error fetching bulk lead search:', error);
      res.status(500).json({ error: 'Failed to fetch bulk lead search' });
    }
  });
  
  // Save a new bulk lead search
  router.post('/', async (req: Request, res: Response) => {
    try {
      const validatedData = bulkLeadSearchRequestSchema.parse(req.body);
      
      const bulkLeadSearchData = {
        searchTerm: validatedData.searchTerm,
        locations: validatedData.locations,
        resultsCount: validatedData.businesses.length,
        businessData: validatedData.businesses
      };
      
      // Validate with insertion schema
      const parsedData = insertBulkLeadSearchSchema.parse(bulkLeadSearchData);
      
      // Save to database
      const savedSearch = await storage.saveBulkLeadSearch(parsedData);
      
      res.status(201).json(savedSearch);
    } catch (error) {
      console.error('Error saving bulk lead search:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid data format', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ error: 'Failed to save bulk lead search' });
    }
  });
  
  // Custom bulk lead search endpoint
  router.post('/custom', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const { query, locations, maxPerLocation = 25, onlyDecisionMakers = true } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      // Default locations if none provided
      const searchLocations = locations && locations.length > 0 
        ? locations 
        : ['new_york', 'los_angeles', 'chicago', 'houston', 'dallas'];
      
      // Convert location codes to readable format for search
      const formattedLocations = searchLocations.map((loc: string) => 
        loc.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      );
      
      console.log(`📊 Bulk API Request: Searching for "${query}" in ${formattedLocations.length} locations`);
      
      // Perform searches for each location
      const locationResults = [];
      const allBusinesses = [];
      let totalBusinesses = 0;
      let totalContacts = 0;
      
      // Process each location
      for (const location of formattedLocations) {
        console.log(`🔍 Searching for "${query}" in ${location}`);
        
        try {
          // Use the Google Places service to search
          const results = await googlePlacesService.searchBusinesses({
            query: query,
            location: location,
            limit: maxPerLocation
          });
          
          if (results && results.businesses) {
            // Filter for decision makers if requested
            if (onlyDecisionMakers) {
              results.businesses.forEach((business: any) => {
                if (business.contacts && business.contacts.length > 0) {
                  business.contacts = business.contacts.filter((contact: any) => 
                    contact.isDecisionMaker === true
                  );
                }
              });
            }
            
            // Count results
            const businessCount = results.businesses.length;
            const contactCount = results.businesses.reduce((count: number, business: any) => 
              count + (business.contacts ? business.contacts.length : 0), 0
            );
            
            // Add to totals
            totalBusinesses += businessCount;
            totalContacts += contactCount;
            
            // Add to results array
            locationResults.push({
              location: location.toLowerCase().replace(/\s+/g, '_'),
              businessCount,
              contactCount
            });
            
            // Add businesses to the combined list
            allBusinesses.push(...results.businesses);
          }
        } catch (locationError) {
          console.error(`Error searching in ${location}:`, locationError);
          // Continue with other locations if one fails
          locationResults.push({
            location: location.toLowerCase().replace(/\s+/g, '_'),
            businessCount: 0,
            contactCount: 0,
            error: (locationError as Error).message
          });
        }
      }
      
      // Prepare the combined result
      const combinedResult = {
        searchTerm: query,
        totalLocations: formattedLocations.length,
        totalBusinesses,
        totalContacts,
        locationResults,
        businesses: allBusinesses
      };
      
      // Save the search result to the database
      try {
        await storage.saveBulkLeadSearch({
          searchTerm: query,
          locations: searchLocations,
          resultsCount: totalBusinesses,
          businessData: allBusinesses
        });
      } catch (dbError) {
        console.error('Error saving bulk search results to database:', dbError);
        // Continue with response even if save fails
      }
      
      // Return the results
      res.json(combinedResult);
    } catch (error) {
      console.error('Error performing bulk lead search:', error);
      res.status(500).json({ 
        error: 'Failed to perform bulk lead search',
        message: (error as Error).message
      });
    }
  });
  
  // Download CSV for a specific bulk lead search
  router.get('/:id/download', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      
      const bulkSearch = await storage.getBulkLeadSearch(id);
      if (!bulkSearch) {
        return res.status(404).json({ error: 'Bulk lead search not found' });
      }
      
      // Generate CSV content
      let csvRows = [];
      
      // Add header row
      csvRows.push(['Company Name', 'Industry', 'Address', 'Phone', 'Website', 
                   'Contact Name', 'Contact Position', 'Contact Email', 
                   'Contact Phone', 'Is Decision Maker'].join(','));
      
      // Add data rows
      const businesses = bulkSearch.businessData as any[];
      
      businesses.forEach((business: any) => {
        if (!business.contacts || business.contacts.length === 0) {
          // If no contacts, add one row with just business info
          csvRows.push([
            escapeCsvValue(business.name || ''),
            escapeCsvValue(business.category || ''),
            escapeCsvValue(business.address || ''),
            escapeCsvValue(business.phoneNumber || ''),
            escapeCsvValue(business.website || ''),
            '', '', '', '', ''
          ].join(','));
        } else {
          // Add a row for each contact
          business.contacts.forEach((contact: any) => {
            csvRows.push([
              escapeCsvValue(business.name || ''),
              escapeCsvValue(business.category || ''),
              escapeCsvValue(business.address || ''),
              escapeCsvValue(business.phoneNumber || ''),
              escapeCsvValue(business.website || ''),
              escapeCsvValue(contact.name || ''),
              escapeCsvValue(contact.position || ''),
              escapeCsvValue(contact.email || ''),
              escapeCsvValue(contact.phoneNumber || ''),
              escapeCsvValue(contact.isDecisionMaker ? 'Yes' : 'No')
            ].join(','));
          });
        }
      });
      
      // Join all rows into a single string with newlines
      const csvContent = csvRows.join('\n');
      
      // Set response headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=nexlead_${bulkSearch.searchTerm.replace(/\s+/g, '_')}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
      
      // Send CSV content
      res.send(csvContent);
    } catch (error) {
      console.error('Error generating CSV download:', error);
      res.status(500).json({ error: 'Failed to generate CSV download' });
    }
  });
  
  // Direct CSV download endpoint for mobile devices
  router.post('/export-csv', async (req: Request, res: Response) => {
    try {
      const { searchTerm, locations, businesses } = req.body;
      
      if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
        return res.status(400).json({ error: 'No businesses data provided for export' });
      }
      
      // Generate CSV content
      let csvRows = [];
      
      // Add header row
      csvRows.push(['Company Name', 'Industry', 'Address', 'Phone', 'Website', 
                   'Contact Name', 'Contact Position', 'Contact Email', 
                   'Contact Phone', 'Is Decision Maker'].join(','));
      
      // Add data rows
      businesses.forEach((business: any) => {
        if (!business.contacts || business.contacts.length === 0) {
          // If no contacts, add one row with just business info
          csvRows.push([
            escapeCsvValue(business.name || ''),
            escapeCsvValue(business.category || ''),
            escapeCsvValue(business.address || ''),
            escapeCsvValue(business.phoneNumber || ''),
            escapeCsvValue(business.website || ''),
            '', '', '', '', ''
          ].join(','));
        } else {
          // Add a row for each contact
          business.contacts.forEach((contact: any) => {
            csvRows.push([
              escapeCsvValue(business.name || ''),
              escapeCsvValue(business.category || ''),
              escapeCsvValue(business.address || ''),
              escapeCsvValue(business.phoneNumber || ''),
              escapeCsvValue(business.website || ''),
              escapeCsvValue(contact.name || ''),
              escapeCsvValue(contact.position || ''),
              escapeCsvValue(contact.email || ''),
              escapeCsvValue(contact.phoneNumber || ''),
              escapeCsvValue(contact.isDecisionMaker ? 'Yes' : 'No')
            ].join(','));
          });
        }
      });
      
      // Join all rows into a single string with newlines
      const csvContent = csvRows.join('\n');
      
      // Save this search to database before serving CSV
      try {
        const bulkLeadSearchData = {
          searchTerm: searchTerm || 'Unknown search',
          locations: locations || [],
          resultsCount: businesses.length,
          businessData: businesses
        };
        
        // Try to save to database but don't block CSV response if it fails
        await storage.saveBulkLeadSearch(bulkLeadSearchData);
      } catch (dbError) {
        console.error('Error saving search before CSV download:', dbError);
        // Continue with CSV download even if save fails
      }
      
      // Set response headers for file download - mobile friendly
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=nexlead_${(searchTerm || 'leads').replace(/\s+/g, '_')}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
      
      // Send CSV content
      res.send(csvContent);
    } catch (error) {
      console.error('Error generating direct CSV export:', error);
      res.status(500).json({ error: 'Failed to generate CSV export' });
    }
  });
  
  // Register the router at /api/bulk-leads path
  app.use('/api/bulk-leads', router);
  
  console.log('✓ Bulk lead routes registered');
}

// Helper function to escape CSV values
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return '""';
  
  // Convert to string and escape double quotes by doubling them
  const stringValue = String(value).replace(/"/g, '""');
  
  // Wrap in quotes
  return `"${stringValue}"`;
}