/**
 * SearchController coordinates business data scraping from multiple sources
 * Implements retry logic, error handling, and result aggregation
 */

import { v4 as uuidv4 } from 'uuid';
import { BusinessData, ScrapingResult, ErrorResponse, SearchParams, ScrapeExecutionLog, SearchControllerOptions } from '../models/business-data';
import { cheerioScraper } from '../api/cheerio-scraper';
import { googleSheetsService } from '../api/google-sheets-service';
import { waitRandomTime } from '../api/scraper-utils';
import * as fs from 'fs';
import * as path from 'path';

export class SearchController {
  private logsDir: string;
  private executionLogsDir: string;
  
  constructor() {
    // Create logs directory if it doesn't exist
    this.logsDir = path.join(process.cwd(), 'logs');
    this.executionLogsDir = path.join(this.logsDir, 'executions');
    
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    if (!fs.existsSync(this.executionLogsDir)) {
      fs.mkdirSync(this.executionLogsDir, { recursive: true });
    }
  }
  
  /**
   * Search for business data from multiple sources
   */
  async searchBusinessData(
    params: SearchParams,
    options: SearchControllerOptions = {}
  ): Promise<ScrapingResult | ErrorResponse> {
    const executionId = uuidv4();
    const startTime = Date.now();
    const query = params.query || params.industry || '';
    const location = params.location || '';
    const page = params.page || 1;
    const limit = params.limit || 20;
    
    if (!query) {
      return {
        error: 'Query parameter is required',
        error_code: 'MISSING_QUERY',
        timestamp: new Date().toISOString(),
        request_id: executionId
      };
    }
    
    // Initialize execution log
    const executionLog: ScrapeExecutionLog = {
      execution_id: executionId,
      query,
      location,
      timestamp: new Date().toISOString(),
      status: 'running',
      sources: ['google', 'yelp', 'yellowpages'],
      success_count: 0,
      error_count: 0,
      total_businesses_found: 0,
      scraping_attempts: [],
      error_details: []
    };
    
    console.log(`🔍 SearchController: Starting search for "${query}" ${location ? `in ${location}` : ''} (Execution ID: ${executionId})`);
    
    try {
      // Perform scraping from multiple sources in parallel
      const sourceResults = await Promise.allSettled([
        cheerioScraper.searchGoogleBusinesses(query, location, { 
          executionId, 
          executionLog,
          maxRetries: options.maxSourceRetries || 3,
          timeout: options.sourceTimeout || 30000,
          logRequests: options.logExecutionDetails || false
        }),
        cheerioScraper.searchYelpBusinesses(query, location, { 
          executionId, 
          executionLog,
          maxRetries: options.maxSourceRetries || 3,
          timeout: options.sourceTimeout || 30000,
          logRequests: options.logExecutionDetails || false
        }),
        cheerioScraper.searchYellowPagesBusinesses(query, location, { 
          executionId, 
          executionLog,
          maxRetries: options.maxSourceRetries || 3,
          timeout: options.sourceTimeout || 30000,
          logRequests: options.logExecutionDetails || false
        })
      ]);
      
      // Process results
      const allBusinesses: BusinessData[] = [];
      const sources: string[] = [];
      let successCount = 0;
      
      // Google results
      if (sourceResults[0].status === 'fulfilled' && sourceResults[0].value.length > 0) {
        allBusinesses.push(...sourceResults[0].value);
        sources.push('google');
        successCount++;
      } else {
        console.error(`❌ google-maps failed or returned no results`);
        executionLog.error_details.push({
          source: 'google',
          error: sourceResults[0].status === 'rejected' ? sourceResults[0].reason : 'No results found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Yelp results
      if (sourceResults[1].status === 'fulfilled' && sourceResults[1].value.length > 0) {
        allBusinesses.push(...sourceResults[1].value);
        sources.push('yelp');
        successCount++;
      } else {
        console.error(`❌ yelp failed or returned no results`);
        executionLog.error_details.push({
          source: 'yelp',
          error: sourceResults[1].status === 'rejected' ? sourceResults[1].reason : 'No results found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Yellow Pages results
      if (sourceResults[2].status === 'fulfilled' && sourceResults[2].value.length > 0) {
        allBusinesses.push(...sourceResults[2].value);
        sources.push('yellowpages');
        successCount++;
      } else {
        console.error(`❌ yellow-pages failed or returned no results`);
        executionLog.error_details.push({
          source: 'yellowpages',
          error: sourceResults[2].status === 'rejected' ? sourceResults[2].reason : 'No results found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Update execution log
      executionLog.success_count = successCount;
      executionLog.error_count = 3 - successCount;
      executionLog.total_businesses_found = allBusinesses.length;
      
      // Handle case with no results from any source
      if (allBusinesses.length === 0) {
        console.error(`❌ SearchController: No businesses found from any source`);
        
        // Attempt self-recovery by waiting and retrying with different user agents
        if (executionLog.error_count > 0 && !params.hasOwnProperty('_retry')) {
          console.log(`🔄 SearchController: Attempting recovery with retry...`);
          
          // Wait a bit longer between retries
          await waitRandomTime(3000, 5000);
          
          // Use recursion with a retry flag to prevent infinite loops
          return this.searchBusinessData({ 
            ...params, 
            _retry: true 
          }, {
            ...options,
            maxSourceRetries: (options.maxSourceRetries || 3) + 1
          });
        }
        
        executionLog.status = 'failed';
        executionLog.error = 'No businesses found from any source';
        executionLog.completion_time = new Date().toISOString();
        executionLog.execution_time_ms = Date.now() - startTime;
        
        this.saveExecutionLog(executionLog);
        
        return {
          error: 'No businesses found',
          error_code: 'NO_RESULTS',
          timestamp: new Date().toISOString(),
          request_id: executionId,
          details: {
            sources_attempted: sources,
            execution_id: executionId
          }
        };
      }
      
      // Basic deduplication by business name
      const uniqueBusinessMap = new Map<string, BusinessData>();
      allBusinesses.forEach(business => {
        const key = `${business.name.toLowerCase()}-${business.phoneNumber.replace(/\D/g, '')}`;
        
        // If business doesn't exist or this one has more data, use this one
        if (!uniqueBusinessMap.has(key) || 
            (business.website && !uniqueBusinessMap.get(key)!.website) ||
            (business.contacts.length > uniqueBusinessMap.get(key)!.contacts.length)) {
          uniqueBusinessMap.set(key, business);
        }
      });
      
      // Convert map back to array
      const uniqueBusinesses = Array.from(uniqueBusinessMap.values());
      
      // Apply pagination
      const totalResults = uniqueBusinesses.length;
      const totalPages = Math.ceil(totalResults / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(startIndex + limit, totalResults);
      const paginatedBusinesses = uniqueBusinesses.slice(startIndex, endIndex);
      
      // Export to Google Sheets if API key is available
      let sheetsUrl = '';
      try {
        if (process.env.GOOGLE_API_KEY) {
          console.log(`📊 SearchController: Exporting ${uniqueBusinesses.length} businesses to Google Sheets...`);
          const sheetsResult = await googleSheetsService.createSheetWithBusinessData(
            `${query} ${location}`.trim(),
            uniqueBusinesses
          );
          
          if (sheetsResult.success && sheetsResult.spreadsheetUrl) {
            sheetsUrl = sheetsResult.spreadsheetUrl;
            console.log(`📊 SearchController: Successfully exported to Google Sheets: ${sheetsUrl}`);
          }
        }
      } catch (error) {
        console.error('❌ Error exporting to Google Sheets:', error);
      }
      
      // Update execution log with final status
      executionLog.status = 'completed';
      executionLog.completion_time = new Date().toISOString();
      executionLog.execution_time_ms = Date.now() - startTime;
      this.saveExecutionLog(executionLog);
      
      // Return the results
      const result: ScrapingResult = {
        businesses: paginatedBusinesses,
        meta: {
          sources,
          query,
          location,
          timestamp: new Date().toISOString(),
          execution_id: executionId,
          total_count: totalResults,
          page,
          limit,
          total_pages: totalPages
        },
        diagnostics: {
          execution_time_ms: Date.now() - startTime,
          success_rate: successCount / 3,
          error_rate: (3 - successCount) / 3,
          error_details: executionLog.error_details
        }
      };
      
      // Add Google Sheets URL if available
      if (sheetsUrl) {
        result.meta['google_sheets_url'] = sheetsUrl;
      }
      
      return result;
    } catch (error) {
      console.error(`❌ SearchController Error:`, error);
      
      // Update execution log with error
      executionLog.status = 'failed';
      executionLog.error = (error as Error).message;
      executionLog.completion_time = new Date().toISOString();
      executionLog.execution_time_ms = Date.now() - startTime;
      this.saveExecutionLog(executionLog);
      
      return {
        error: 'Failed to search for businesses',
        error_code: 'SEARCH_ERROR',
        timestamp: new Date().toISOString(),
        request_id: executionId,
        details: {
          message: (error as Error).message,
          execution_id: executionId
        }
      };
    }
  }
  
  /**
   * Save execution log to file
   */
  private saveExecutionLog(log: ScrapeExecutionLog): string {
    try {
      const filename = `${log.execution_id}.json`;
      const filepath = path.join(this.executionLogsDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(log, null, 2));
      return filepath;
    } catch (error) {
      console.error(`❌ Error saving execution log:`, error);
      return '';
    }
  }
  
  /**
   * Get execution log by ID
   */
  async getExecutionLog(executionId: string): Promise<ScrapeExecutionLog | null> {
    try {
      const filepath = path.join(this.executionLogsDir, `${executionId}.json`);
      
      if (fs.existsSync(filepath)) {
        const logData = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(logData) as ScrapeExecutionLog;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error reading execution log:`, error);
      return null;
    }
  }
  
  /**
   * Get recent execution logs
   */
  async getRecentExecutionLogs(limit = 10): Promise<ScrapeExecutionLog[]> {
    try {
      const files = fs.readdirSync(this.executionLogsDir)
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(this.executionLogsDir, a));
          const statB = fs.statSync(path.join(this.executionLogsDir, b));
          return statB.mtime.getTime() - statA.mtime.getTime();
        })
        .slice(0, limit);
      
      const logs: ScrapeExecutionLog[] = [];
      
      for (const file of files) {
        try {
          const data = fs.readFileSync(path.join(this.executionLogsDir, file), 'utf8');
          logs.push(JSON.parse(data) as ScrapeExecutionLog);
        } catch (error) {
          console.error(`❌ Error reading log file ${file}:`, error);
        }
      }
      
      return logs;
    } catch (error) {
      console.error(`❌ Error getting recent execution logs:`, error);
      return [];
    }
  }
}

export const searchController = new SearchController();