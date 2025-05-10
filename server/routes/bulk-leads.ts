/**
 * Bulk Lead Generation Routes
 * 
 * These routes support generating large quantities of leads for specific industries
 * across multiple geographic areas in a single request.
 */

import { Express, Request, Response } from 'express';
import { GooglePlacesService } from '../api/google-places-service';
import { ScrapingResult, BusinessData } from '../models/business-data';
import { bulkLeadService } from '../api/bulk-lead-service';

// Available locations for bulk lead generation
const AVAILABLE_LOCATIONS = [
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
  'san_francisco',
  'seattle',
  'boston',
  'atlanta',
  'miami',
  'denver',
  'las_vegas'
];

// Suggested industries for bulk lead generation
const SUGGESTED_INDUSTRIES = [
  'restaurants',
  'hotels',
  'retail_stores',
  'healthcare_providers',
  'law_firms',
  'financial_services',
  'real_estate_agencies',
  'construction_companies',
  'technology_companies',
  'marketing_agencies',
  'education_providers',
  'automotive_businesses',
  'manufacturing_companies'
];

// Map location codes to searchable location strings
const LOCATION_MAP: Record<string, string> = {
  'new_york': 'New York, NY',
  'los_angeles': 'Los Angeles, CA',
  'chicago': 'Chicago, IL',
  'houston': 'Houston, TX',
  'phoenix': 'Phoenix, AZ',
  'philadelphia': 'Philadelphia, PA',
  'san_antonio': 'San Antonio, TX',
  'san_diego': 'San Diego, CA',
  'dallas': 'Dallas, TX',
  'san_jose': 'San Jose, CA',
  'austin': 'Austin, TX',
  'san_francisco': 'San Francisco, CA',
  'seattle': 'Seattle, WA',
  'boston': 'Boston, MA',
  'atlanta': 'Atlanta, GA',
  'miami': 'Miami, FL',
  'denver': 'Denver, CO',
  'las_vegas': 'Las Vegas, NV'
};

/**
 * Register bulk lead generation routes
 */
export function registerBulkLeadRoutes(app: Express, googlePlacesService: GooglePlacesService) {
  /**
   * Generate leads for a specific industry across multiple locations
   */
  app.post('/api/bulk-leads', async (req: Request, res: Response) => {
    try {
      const { industry, locations, maxPerLocation = 25 } = req.body;
      
      if (!industry) {
        return res.status(400).json({
          success: false,
          message: 'Industry is required'
        });
      }
      
      // Determine which locations to search
      const locationsToSearch = locations && locations.length > 0
        ? locations.filter((loc: string) => AVAILABLE_LOCATIONS.includes(loc))
        : AVAILABLE_LOCATIONS;
      
      console.log(`📊 Bulk Lead Generation: Searching for "${industry}" in ${locationsToSearch.length} locations`);
      
      // Map location codes to full location names for the search
      const locationNames = locationsToSearch.map(
        (locationCode: string) => LOCATION_MAP[locationCode] || locationCode.replace(/_/g, ' ')
      );
      
      // Always include "businesses" or "companies" in the industry search to improve results
      const searchQuery = industry.toLowerCase().includes('business') || 
                         industry.toLowerCase().includes('compan') ? 
                         industry : `${industry} businesses`;
      
      // Use our bulk lead service to handle the search across all locations
      const result = await bulkLeadService.generateLeadsAcrossLocations(
        searchQuery,
        locationNames,
        maxPerLocation,
        true // Always get decision makers for industry searches
      );
      
      // Format the location results to use the location codes rather than the full names
      const formattedLocationResults = result.locationResults.map((locResult, index) => ({
        location: locationsToSearch[index],
        businessCount: locResult.businessCount,
        contactCount: locResult.contactCount
      }));
      
      // Return the results
      return res.json({
        success: result.success,
        totalLocations: result.totalLocations,
        totalBusinesses: result.totalBusinesses,
        totalContacts: result.totalContacts,
        locationResults: formattedLocationResults,
        businesses: result.businesses,
        error: result.error
      });
    } catch (error) {
      console.error('Error in bulk lead generation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate leads',
        error: (error as Error).message
      });
    }
  });
  
  /**
   * Get available locations for bulk lead generation
   */
  app.get('/api/bulk-leads/locations', (req: Request, res: Response) => {
    res.json({
      success: true,
      locations: AVAILABLE_LOCATIONS
    });
  });
  
  /**
   * Get suggested industries for bulk lead generation
   */
  app.get('/api/bulk-leads/industries', (req: Request, res: Response) => {
    res.json({
      success: true,
      industries: SUGGESTED_INDUSTRIES
    });
  });
  
  /**
   * Custom industry search endpoint for more flexibility
   */
  app.post('/api/bulk-leads/custom', async (req: Request, res: Response) => {
    try {
      const { 
        query, 
        locations, 
        maxPerLocation = 25,
        onlyDecisionMakers = true
      } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }
      
      // Determine which locations to search
      const locationsToSearch = locations && locations.length > 0
        ? locations.filter((loc: string) => AVAILABLE_LOCATIONS.includes(loc))
        : AVAILABLE_LOCATIONS;
      
      console.log(`📊 Bulk Lead Generation: Searching for "${query}" in ${locationsToSearch.length} locations`);
      
      // Map location codes to full location names for the search
      const locationNames = locationsToSearch.map(
        (locationCode: string) => LOCATION_MAP[locationCode] || locationCode.replace(/_/g, ' ')
      );
      
      // Use our new bulk lead service to handle the search across all locations
      const result = await bulkLeadService.generateLeadsAcrossLocations(
        query,
        locationNames,
        maxPerLocation,
        onlyDecisionMakers
      );
      
      // Format the location results to use the location codes rather than the full names
      const formattedLocationResults = result.locationResults.map((locResult, index) => ({
        location: locationsToSearch[index],
        businessCount: locResult.businessCount,
        contactCount: locResult.contactCount
      }));
      
      // Return the results
      return res.json({
        success: result.success,
        totalLocations: result.totalLocations,
        totalBusinesses: result.totalBusinesses,
        totalContacts: result.totalContacts,
        locationResults: formattedLocationResults,
        businesses: result.businesses,
        error: result.error
      });
    } catch (error) {
      console.error('Error in custom bulk lead generation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate leads',
        error: (error as Error).message
      });
    }
  });
}