/**
 * Bulk Lead Service
 * Provides methods for generating leads in bulk across multiple locations
 */

import { googlePlacesService } from './google-places-service';
import { BusinessData, ScrapingResult } from '../models/business-data';

export class BulkLeadService {
  /**
   * Generate leads for a specific business type across multiple locations
   * @param businessType The type of business to search for
   * @param locations Array of location names
   * @param maxPerLocation Maximum number of businesses per location
   * @param onlyDecisionMakers Whether to filter for only decision maker contacts
   */
  async generateLeadsAcrossLocations(
    businessType: string,
    locations: string[],
    maxPerLocation: number = 25,
    onlyDecisionMakers: boolean = true
  ): Promise<{
    success: boolean;
    totalLocations: number;
    totalBusinesses: number;
    totalContacts: number;
    locationResults: Array<{
      location: string;
      businessCount: number;
      contactCount: number;
    }>;
    businesses: BusinessData[];
    error?: string;
  }> {
    try {
      console.log(`📊 BulkLeadService: Generating leads for "${businessType}" across ${locations.length} locations`);
      
      // Process each location and collect results
      const locationResults = [];
      const allBusinesses: BusinessData[] = [];
      let totalContacts = 0;
      
      for (const location of locations) {
        console.log(`📍 Processing location: ${location}`);
        
        // Search for businesses in this location using the existing service
        const result = await googlePlacesService.searchBusinesses(businessType, location, maxPerLocation);
        
        // Skip if there was an error
        if (!result.businesses || result.businesses.length === 0) {
          console.log(`⚠️ No businesses found in ${location}`);
          locationResults.push({
            location,
            businessCount: 0,
            contactCount: 0
          });
          continue;
        }
        
        // Filter businesses if needed
        if (onlyDecisionMakers) {
          result.businesses.forEach(business => {
            if (business.contacts && business.contacts.length > 0) {
              // Keep only decision makers or primary contacts
              business.contacts = business.contacts.filter(contact => 
                contact.isDecisionMaker === true || contact.isPrimary === true
              );
            }
          });
        }
        
        // Count contacts
        let locationContactCount = 0;
        result.businesses.forEach(business => {
          if (business.contacts) {
            locationContactCount += business.contacts.length;
            totalContacts += business.contacts.length;
          }
        });
        
        // Store location results
        locationResults.push({
          location,
          businessCount: result.businesses.length,
          contactCount: locationContactCount
        });
        
        // Add businesses to the combined list
        allBusinesses.push(...result.businesses);
      }
      
      return {
        success: true,
        totalLocations: locations.length,
        totalBusinesses: allBusinesses.length,
        totalContacts,
        locationResults,
        businesses: allBusinesses
      };
    } catch (error) {
      console.error('Error generating bulk leads:', error);
      return {
        success: false,
        totalLocations: 0,
        totalBusinesses: 0,
        totalContacts: 0,
        locationResults: [],
        businesses: [],
        error: (error as Error).message
      };
    }
  }
}

export const bulkLeadService = new BulkLeadService();