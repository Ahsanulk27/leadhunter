/**
 * Bulk Lead Generation Routes
 * 
 * These routes support generating large quantities of leads for specific industries
 * across multiple geographic areas in a single request.
 */

import { Request, Response } from 'express';
import { Express } from 'express';
import { GooglePlacesService } from '../api/google-places-service';
import { ScrapingResult, BusinessData } from '../models/business-data';

// Define list of major cities/areas to search in
const MAJOR_US_AREAS = [
  'los_angeles',
  'new_york',
  'chicago',
  'houston',
  'phoenix',
  'philadelphia',
  'san_antonio',
  'san_diego',
  'dallas',
  'austin',
  'san_jose',
  'san_francisco',
  'boston',
  'denver',
  'seattle',
  'miami',
  'atlanta',
  'portland',
  'detroit',
  'tampa'
];

// Common business categories/industries for reference
const COMMON_INDUSTRIES = [
  // Real Estate & Property
  'property_management', 'real_estate', 'apartment_complexes', 'rental_agency',
  // Food & Hospitality
  'restaurants', 'cafes', 'bars', 'hotels', 'catering',
  // Health & Medical
  'doctors', 'dentists', 'chiropractors', 'physical_therapy', 'hospitals', 'clinics',
  // Services
  'accounting', 'legal_services', 'marketing_agencies', 'consulting_firms', 'cleaning_services',
  // Retail
  'clothing_stores', 'furniture_stores', 'electronics_stores', 'grocery_stores',
  // Auto
  'car_dealerships', 'auto_repair', 'auto_parts',
  // Construction & Home
  'contractors', 'plumbers', 'electricians', 'hvac', 'landscaping',
  // Technology
  'software_companies', 'it_services', 'web_development', 'tech_startups',
  // Finance
  'banks', 'credit_unions', 'financial_advisors', 'insurance_agencies',
  // Education
  'schools', 'universities', 'tutoring_services', 'training_centers'
];

// Support any industry the user provides
const SUPPORTED_INDUSTRIES = COMMON_INDUSTRIES;

/**
 * Register bulk lead generation routes
 */
export function registerBulkLeadRoutes(app: Express, googlePlacesService: GooglePlacesService) {
  /**
   * Generate leads for a specific industry across multiple locations
   */
  app.post('/api/bulk-leads', async (req: Request, res: Response) => {
    try {
      const { 
        industry = 'property_management',
        locations = [],
        maxPerLocation = 20,
        onlyDecisionMakers = true 
      } = req.body;
      
      // All industries are supported now - just provide suggestions if empty
      const searchIndustry = industry || 'property_management'; // default if not provided
      
      // Use provided locations or default to all major US areas
      const areasToSearch = locations && locations.length > 0 
        ? locations 
        : MAJOR_US_AREAS;
      
      // Limit the number of areas to prevent API overload
      const limitedAreas = areasToSearch.slice(0, 10);
      
      // Log the start of bulk lead generation
      console.log(`📍 Starting bulk lead generation for ${searchIndustry} in ${limitedAreas.length} locations`);
      
      // Track results for all areas
      const allResults: {
        location: string;
        data: ScrapingResult;
      }[] = [];
      
      // Track all businesses to prevent duplicates across locations
      const processedBusinessNames = new Set<string>();
      const processedPhoneNumbers = new Set<string>();
      const processedWebsites = new Set<string>();
      
      // Process each location
      for (const location of limitedAreas) {
        console.log(`📍 Processing ${searchIndustry} businesses in ${location}`);
        
        // Search for businesses in this location
        const results = await googlePlacesService.searchBusinesses(
          searchIndustry, 
          location, 
          maxPerLocation
        );
        
        // Filter out businesses that were already found in other locations
        const uniqueBusinesses = results.businesses.filter(business => {
          // Normalize business name to better identify duplicates
          const normalizedName = business.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Check if we've seen this business before
          if (
            processedBusinessNames.has(normalizedName) ||
            (business.phoneNumber && processedPhoneNumbers.has(business.phoneNumber)) ||
            (business.website && processedWebsites.has(business.website))
          ) {
            return false;
          }
          
          // Track this business to avoid duplicates later
          processedBusinessNames.add(normalizedName);
          if (business.phoneNumber) processedPhoneNumbers.add(business.phoneNumber);
          if (business.website) processedWebsites.add(business.website);
          
          return true;
        });
        
        console.log(`📍 Found ${uniqueBusinesses.length} unique ${industry} businesses in ${location}`);
        
        // Store results for this location
        allResults.push({
          location,
          data: {
            success: true,
            businesses: uniqueBusinesses,
            meta: results.meta
          }
        });
      }
      
      // Combine all businesses from all locations
      const allBusinesses = allResults.flatMap(result => result.data.businesses);
      
      // Count total contacts across all businesses
      const totalContacts = allBusinesses.reduce((sum, business) => 
        sum + (business.contacts?.length || 0), 0);
      
      console.log(`📍 Bulk lead generation complete. Found ${allBusinesses.length} unique businesses with ${totalContacts} contacts`);
      
      // Return the combined results
      return res.json({
        success: true,
        totalLocations: limitedAreas.length,
        totalBusinesses: allBusinesses.length,
        totalContacts,
        requestedIndustry: searchIndustry,
        locationResults: allResults.map(result => ({
          location: result.location,
          businessCount: result.data.businesses.length
        })),
        businesses: allBusinesses
      });
    } catch (error) {
      console.error('❌ Error in bulk lead generation:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error generating bulk leads' 
      });
    }
  });
  
  /**
   * Get available locations for bulk lead generation
   */
  app.get('/api/bulk-leads/locations', (req: Request, res: Response) => {
    return res.json({
      success: true,
      locations: MAJOR_US_AREAS
    });
  });
  
  /**
   * Get suggested industries for bulk lead generation
   */
  app.get('/api/bulk-leads/industries', (req: Request, res: Response) => {
    return res.json({
      success: true,
      message: "These are suggested industries, but you can use any industry or business type",
      industries: COMMON_INDUSTRIES
    });
  });
  
  /**
   * Custom industry search endpoint for more flexibility
   */
  app.post('/api/bulk-leads/custom', async (req: Request, res: Response) => {
    try {
      const { 
        query, // Can be any business type, service, etc.
        locations = [],
        maxPerLocation = 20,
        onlyDecisionMakers = true 
      } = req.body;
      
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Query is required. Specify any business type, service, or industry.' 
        });
      }
      
      // Use provided locations or default to major US areas
      const areasToSearch = locations && locations.length > 0 
        ? locations 
        : MAJOR_US_AREAS.slice(0, 5); // Limit to 5 locations by default for custom search
      
      console.log(`📍 Starting custom bulk lead generation for "${query}" in ${areasToSearch.length} locations`);
      
      // Track results for all areas
      const allResults: {
        location: string;
        data: ScrapingResult;
      }[] = [];
      
      // Track all businesses to prevent duplicates across locations
      const processedBusinessNames = new Set<string>();
      const processedPhoneNumbers = new Set<string>();
      
      // Process each location
      for (const location of areasToSearch) {
        console.log(`📍 Processing "${query}" in ${location}`);
        
        // Search for businesses in this location with the custom query
        const results = await googlePlacesService.searchBusinesses(
          query, 
          location, 
          maxPerLocation
        );
        
        // Filter out businesses that were already found in other locations
        const uniqueBusinesses = results.businesses.filter(business => {
          // Normalize business name to better identify duplicates
          const normalizedName = business.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Check if we've seen this business before
          if (
            processedBusinessNames.has(normalizedName) ||
            (business.phoneNumber && processedPhoneNumbers.has(business.phoneNumber))
          ) {
            return false;
          }
          
          // Track this business to avoid duplicates later
          processedBusinessNames.add(normalizedName);
          if (business.phoneNumber) processedPhoneNumbers.add(business.phoneNumber);
          
          return true;
        });
        
        console.log(`📍 Found ${uniqueBusinesses.length} unique "${query}" businesses in ${location}`);
        
        // Store results for this location
        allResults.push({
          location,
          data: {
            success: true,
            businesses: uniqueBusinesses,
            meta: results.meta
          }
        });
      }
      
      // Combine all businesses from all locations
      const allBusinesses = allResults.flatMap(result => result.data.businesses);
      
      // Count total contacts across all businesses
      const totalContacts = allBusinesses.reduce((sum, business) => 
        sum + (business.contacts?.length || 0), 0);
      
      console.log(`📍 Custom bulk lead generation complete. Found ${allBusinesses.length} unique businesses with ${totalContacts} contacts`);
      
      // Return the combined results
      return res.json({
        success: true,
        totalLocations: areasToSearch.length,
        totalBusinesses: allBusinesses.length,
        totalContacts,
        requestedQuery: query,
        locationResults: allResults.map(result => ({
          location: result.location,
          businessCount: result.data.businesses.length
        })),
        businesses: allBusinesses
      });
    } catch (error) {
      console.error('❌ Error in custom bulk lead generation:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error generating custom bulk leads' 
      });
    }
  });
}