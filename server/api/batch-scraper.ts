/**
 * Batch Scraper for LeadHunter
 * Handles multiple B2C lead generation queries in sequence
 */

import { ProxyCheerioScraper } from './proxy-cheerio-scraper';
import { generateExecutionId } from './scraper-utils';
import { BusinessData, ScrapingResult } from '../models/business-data';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

interface BatchScraperOptions {
  useProxies?: boolean;
  delayBetweenQueries?: number;
  maxResults?: number;
  onlyDecisionMakers?: boolean;
  saveHtml?: boolean;
  delayMin?: number;
  delayMax?: number;
}

interface BatchResult {
  service: string;
  location: string;
  results?: ScrapingResult;
  error?: string;
  outputFile?: string;
}

export class BatchScraper {
  private scraper: ProxyCheerioScraper;
  private executionId: string;
  private defaultOptions: BatchScraperOptions = {
    useProxies: true,
    delayBetweenQueries: 10000, // 10 seconds between queries
    maxResults: 50,
    onlyDecisionMakers: true,
    saveHtml: false,
    delayMin: 2000,
    delayMax: 5000
  };
  
  constructor() {
    this.executionId = generateExecutionId();
    this.scraper = new ProxyCheerioScraper();
  }
  
  /**
   * Run batch scraper for multiple service/location combinations
   */
  async runBatch(
    services: string[],
    locations: string[],
    options: BatchScraperOptions = {}
  ): Promise<BatchResult[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const results: BatchResult[] = [];
    const outputDir = path.join(process.cwd(), 'batch_results');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`🔍 BatchScraper: Starting batch scraping for ${services.length} services across ${locations.length} locations`);
    
    for (const service of services) {
      for (const location of locations) {
        try {
          console.log(`🔍 BatchScraper: Processing "${service}" in "${location}"`);
          
          const batchResult: BatchResult = { 
            service, 
            location 
          };
          
          const result = await this.scraper.searchB2CLeads(service, location, {
            useProxies: mergedOptions.useProxies,
            saveHtml: mergedOptions.saveHtml,
            delayMin: mergedOptions.delayMin,
            delayMax: mergedOptions.delayMax
          });
          
          // Filter results
          let filteredBusinesses = result.businesses;
          
          // Filter by decision makers if requested
          if (mergedOptions.onlyDecisionMakers) {
            filteredBusinesses = filteredBusinesses.map(business => {
              if (business.contacts) {
                business.contacts = business.contacts.filter(contact => 
                  contact.isDecisionMaker === true
                );
              }
              return business;
            });
            
            // Remove businesses with no contacts
            filteredBusinesses = filteredBusinesses.filter(business => 
              business.contacts && business.contacts.length > 0
            );
          }
          
          // Limit results if specified
          if (mergedOptions.maxResults && mergedOptions.maxResults > 0 && filteredBusinesses.length > mergedOptions.maxResults) {
            filteredBusinesses = filteredBusinesses.slice(0, mergedOptions.maxResults);
          }
          
          const scrapingResult: ScrapingResult = {
            ...result,
            businesses: filteredBusinesses
          };
          
          // Export to Excel
          const safeName = (name: string) => name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const outputFile = `${safeName(service)}_${safeName(location)}_leads.xlsx`;
          const outputPath = path.join(outputDir, outputFile);
          
          await this.exportToExcel(scrapingResult, outputPath);
          
          batchResult.results = scrapingResult;
          batchResult.outputFile = outputPath;
          
          results.push(batchResult);
          
          // Delay between queries to avoid overloading
          if (mergedOptions.delayBetweenQueries) {
            console.log(`⏱️ BatchScraper: Waiting ${mergedOptions.delayBetweenQueries / 1000} seconds before next query...`);
            await new Promise(resolve => setTimeout(resolve, mergedOptions.delayBetweenQueries));
          }
        } catch (error) {
          console.error(`❌ BatchScraper Error for "${service}" in "${location}": ${(error as Error).message}`);
          results.push({
            service,
            location,
            error: (error as Error).message
          });
          
          // Still delay before next query even if there was an error
          if (mergedOptions.delayBetweenQueries) {
            await new Promise(resolve => setTimeout(resolve, mergedOptions.delayBetweenQueries));
          }
        }
      }
    }
    
    console.log(`✅ BatchScraper: Completed batch scraping. Successful: ${results.filter(r => !r.error).length}, Failed: ${results.filter(r => r.error).length}`);
    
    return results;
  }
  
  /**
   * Export results to Excel
   */
  private async exportToExcel(result: ScrapingResult, outputPath: string): Promise<void> {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Create business sheet
      const businessData = result.businesses.map(business => ({
        'Business Name': business.name,
        'Address': business.address || '',
        'Phone': business.phoneNumber || '',
        'Email': business.email || '',
        'Website': business.website || '',
        'Category': business.category || '',
        'Source': business.source
      }));
      
      if (businessData.length > 0) {
        const businessSheet = XLSX.utils.json_to_sheet(businessData);
        XLSX.utils.book_append_sheet(workbook, businessSheet, 'Businesses');
      }
      
      // Create contacts sheet
      const contactsData: any[] = [];
      
      result.businesses.forEach(business => {
        if (business.contacts && business.contacts.length > 0) {
          business.contacts.forEach(contact => {
            contactsData.push({
              'Business Name': business.name,
              'Contact Name': contact.name,
              'Position': contact.position || '',
              'Email': contact.email || '',
              'Phone': contact.phoneNumber || '',
              'Decision Maker': contact.isDecisionMaker ? 'Yes' : 'No',
              'Business Address': business.address || '',
              'Business Website': business.website || ''
            });
          });
        }
      });
      
      if (contactsData.length > 0) {
        const contactsSheet = XLSX.utils.json_to_sheet(contactsData);
        XLSX.utils.book_append_sheet(workbook, contactsSheet, 'Contacts');
      }
      
      // Add metadata sheet
      const metaData = [{
        'Query': result.query,
        'Location': result.location || 'N/A',
        'Sources': result.sources.join(', '),
        'Total Businesses': result.businesses.length,
        'Total Contacts': contactsData.length,
        'Data Quality Score': `${result.dataQualityScore || 0}%`,
        'Execution Time': result.executionTime ? `${(result.executionTime / 1000).toFixed(2)} seconds` : 'N/A',
        'Generated On': new Date().toISOString()
      }];
      
      const metaSheet = XLSX.utils.json_to_sheet(metaData);
      XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadata');
      
      // Write to file
      XLSX.writeFile(workbook, outputPath);
      
      console.log(`✅ BatchScraper: Exported results to ${outputPath}`);
    } catch (error) {
      console.error(`❌ BatchScraper Excel export error: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Get proxy stats
   */
  getProxyStats() {
    return this.scraper.getProxyStats();
  }
  
  /**
   * Check proxy health
   */
  async checkProxyHealth() {
    return await this.scraper.checkProxyHealth();
  }
}

export const batchScraper = new BatchScraper();