/**
 * B2C Search Controller
 * Handles B2C lead generation requests for the NexLead application
 */

import { Request, Response } from 'express';
import { createEnhancedProxyManager } from '../api/enhanced-proxy-manager';
import { createProxyCheerioScraper, SearchParams, ScrapingResult } from '../api/proxy-cheerio-scraper';
import { generateExecutionId } from '../api/scraper-utils';
import { b2cPlacesService } from '../api/b2c-places-service';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

// Cache directory for search results
const CACHE_DIR = path.join(process.cwd(), 'cache', 'b2c-searches');

export class B2CSearchController {
  constructor() {
    console.log('🔍 B2CSearchController: Initialized');
    
    // Create cache directory if it doesn't exist
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }
  
  /**
   * Search for consumer leads for cleaning services
   */
  async search(req: Request, res: Response) {
    try {
      // Validate request parameters
      const { query, location, maxResults, useProxies } = req.body;
      
      if (!query || !location) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: query and location are required'
        });
      }
      
      // Generate execution ID for this search
      const executionId = generateExecutionId();
      console.log(`🔍 B2CSearchController: Starting search ${executionId} for "${query}" in ${location}`);
      
      // Use the B2C Places Service to fetch real consumer leads
      const result = await b2cPlacesService.getConsumerLeads(location, maxResults || 50);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch consumer leads'
        });
      }
      
      // For backward compatibility with the UI, transform the result into the expected format
      const transformedResult = {
        executionId,
        query,
        location,
        timestamp: new Date().toISOString(),
        businessCount: 0,
        contactCount: result.leads.length,
        businesses: [],
        // Convert consumer leads to a format the frontend expects
        consumerLeads: result.leads,
        totalConsumerLeads: result.totalLeads,
        sources: [{ name: 'google-places', count: result.leads.length, success: result.leads.length > 0 }],
        errors: [],
        warnings: []
      };
      
      // Cache the result
      this.cacheConsumerResult(executionId, result);
      
      // Return the result
      res.json({
        success: true,
        ...transformedResult
      });
    } catch (error: any) {
      console.error('B2CSearchController error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Execute a batch search for multiple services across multiple locations
   */
  async batchSearch(req: Request, res: Response) {
    try {
      // Validate request parameters
      const { services, locations, maxResults } = req.body;
      
      if (!services || !services.length || !locations || !locations.length) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: services and locations are required'
        });
      }
      
      // Generate batch ID
      const batchId = uuidv4().slice(0, 8);
      
      // Prepare response with initial status
      res.json({
        success: true,
        batchId,
        status: 'started',
        message: `Starting batch search for ${services.length} services across ${locations.length} locations`,
        totalSearches: services.length * locations.length,
        timestamp: new Date().toISOString(),
        outputFile: `batch_results/${this._generateOutputFilename(services, locations)}`
      });
      
      // Execute searches in background using Google Places API
      this._executeConsumerBatchSearch(batchId, services, locations, maxResults);
    } catch (error: any) {
      console.error('B2CSearchController batch error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Execute batch searches in background
   */
  private async _executeBatchSearch(
    batchId: string,
    services: string[],
    locations: string[],
    maxResults?: number,
    onlyDecisionMakers?: boolean,
    useProxies?: boolean
  ) {
    try {
      console.log(`🔍 B2CSearchController: Starting batch search ${batchId} with ${services.length} services and ${locations.length} locations`);
      
      // Create results directory if it doesn't exist
      const resultsDir = path.join(process.cwd(), 'batch_results');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      const outputFilename = this._generateOutputFilename(services, locations);
      const outputPath = path.join(resultsDir, outputFilename);
      
      // Create workbook
      const wb = xlsx.utils.book_new();
      
      // Create metadata sheet
      const metadata = [
        ['Batch ID', batchId],
        ['Timestamp', new Date().toISOString()],
        ['Services', services.join(', ')],
        ['Locations', locations.join(', ')],
        ['Max Results', maxResults?.toString() || '50'],
        ['Only Decision Makers', onlyDecisionMakers !== false ? 'Yes' : 'No'],
        ['Use Proxies', useProxies !== false ? 'Yes' : 'No']
      ];
      
      const metadataSheet = xlsx.utils.aoa_to_sheet(metadata);
      xlsx.utils.book_append_sheet(wb, metadataSheet, 'Metadata');
      
      // Execute searches sequentially
      let totalBusinesses = 0;
      let totalContacts = 0;
      const allResults: ScrapingResult[] = [];
      
      for (const service of services) {
        for (const location of locations) {
          try {
            // Generate execution ID for this search
            const executionId = generateExecutionId();
            console.log(`🔍 B2CSearchController: Batch ${batchId} - Searching for "${service}" in ${location}`);
            
            // Create proxy manager and scraper for this execution
            const proxyManager = createEnhancedProxyManager(executionId);
            const scraper = createProxyCheerioScraper(executionId, proxyManager);
            
            // Configure search parameters
            const searchParams: SearchParams = {
              query: service,
              location,
              maxResults: maxResults || 50,
              onlyDecisionMakers: onlyDecisionMakers !== false,
              useProxies: useProxies !== false
            };
            
            // Execute the search
            const result = await scraper.search(searchParams);
            allResults.push(result);
            
            // Update totals
            totalBusinesses += result.businessCount;
            totalContacts += result.contactCount;
            
            // Cache the result
            this.cacheResult(result);
            
            // Create sheet for this search
            const sheetName = `${service} - ${location}`.slice(0, 31);
            
            // Create data for the sheet
            const data: any[][] = [
              [
                'Business Name',
                'Category',
                'Address',
                'Phone',
                'Email',
                'Website',
                'Source',
                'Contact Name',
                'Position',
                'Contact Email',
                'Contact Phone',
                'Decision Maker'
              ]
            ];
            
            // Add businesses and contacts to the data
            result.businesses.forEach(business => {
              if (business.contacts && business.contacts.length > 0) {
                business.contacts.forEach(contact => {
                  data.push([
                    business.name,
                    business.category || 'Cleaning Service',
                    business.address || '',
                    business.phoneNumber || '',
                    business.email || '',
                    business.website || '',
                    business.source || '',
                    contact.name || '',
                    contact.position || '',
                    contact.email || '',
                    contact.phoneNumber || '',
                    contact.isDecisionMaker ? 'Yes' : 'No'
                  ]);
                });
              } else {
                data.push([
                  business.name,
                  business.category || 'Cleaning Service',
                  business.address || '',
                  business.phoneNumber || '',
                  business.email || '',
                  business.website || '',
                  business.source || '',
                  '', // No contact
                  '',
                  '',
                  '',
                  ''
                ]);
              }
            });
            
            // Add sheet to workbook
            const sheet = xlsx.utils.aoa_to_sheet(data);
            
            try {
              xlsx.utils.book_append_sheet(wb, sheet, sheetName);
            } catch (error) {
              // If there's an error (e.g., duplicate sheet name), use a unique name
              xlsx.utils.book_append_sheet(wb, sheet, `${sheetName}-${executionId.slice(0, 4)}`);
            }
            
            // Sleep for a random interval (1-5 seconds) to avoid being detected as a bot
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 4000));
          } catch (error) {
            console.error(`Error searching for "${service}" in ${location}:`, error);
          }
        }
      }
      
      // Update metadata with results
      metadata.push(
        ['Total Businesses', totalBusinesses.toString()],
        ['Total Contacts', totalContacts.toString()],
        ['Searches Completed', allResults.length.toString()],
        ['Searches Failed', (services.length * locations.length - allResults.length).toString()],
        ['Completion Time', new Date().toISOString()]
      );
      xlsx.utils.sheet_add_aoa(metadataSheet, metadata.slice(-5), { origin: metadata.length - 5 });
      
      // Write the workbook to file
      xlsx.writeFile(wb, outputPath);
      
      console.log(`✅ B2CSearchController: Batch search ${batchId} completed. Results saved to ${outputPath}`);
    } catch (error) {
      console.error(`Error executing batch search ${batchId}:`, error);
    }
  }
  
  /**
   * Generate output filename for batch search
   */
  private _generateOutputFilename(services: string[], locations: string[]): string {
    const primaryService = services[0].toLowerCase().replace(/\s+/g, '_');
    const primaryLocation = locations[0].toLowerCase().replace(/,?\s+/g, '_');
    
    return `${primaryService}_${primaryLocation}_leads.xlsx`;
  }
  
  /**
   * Cache a search result
   */
  private cacheResult(result: ScrapingResult) {
    try {
      const cacheFile = path.join(CACHE_DIR, `${result.executionId}.json`);
      fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error caching search result:', error);
    }
  }
  
  /**
   * Cache a consumer search result
   */
  private cacheConsumerResult(executionId: string, result: any) {
    try {
      const cacheFile = path.join(CACHE_DIR, `consumer_${executionId}.json`);
      fs.writeFileSync(cacheFile, JSON.stringify({
        executionId,
        timestamp: new Date().toISOString(),
        ...result
      }, null, 2));
    } catch (error) {
      console.error('Error caching consumer search result:', error);
    }
  }
  
  /**
   * Get a cached search result
   */
  getCachedResult(executionId: string): ScrapingResult | null {
    try {
      const cacheFile = path.join(CACHE_DIR, `${executionId}.json`);
      
      if (fs.existsSync(cacheFile)) {
        const data = fs.readFileSync(cacheFile, 'utf-8');
        return JSON.parse(data);
      }
      
      return null;
    } catch (error) {
      console.error('Error reading cached search result:', error);
      return null;
    }
  }
  
  /**
   * Check batch search status
   */
  checkBatchStatus(req: Request, res: Response) {
    try {
      const { batchId } = req.params;
      
      // TODO: Implement batch status checking
      
      res.json({
        success: true,
        batchId,
        status: 'processing',
        message: 'Batch search is still processing'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

// Export singleton instance
export const b2cSearchController = new B2CSearchController();