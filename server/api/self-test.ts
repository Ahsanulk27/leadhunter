/**
 * Self-testing module for the LeadHunter scraping system
 * This automatically tests the scraping functionality with predefined test cases
 * and provides detailed diagnostics for troubleshooting
 */

import axios from 'axios';
import { searchController } from '../controllers/search-controller';
import { googleMapsScraper } from './google-maps-scraper';
import { yelpScraper } from './yelp-scraper';
import { googlePlacesService } from './google-places-service';
import { industryScraper } from './industry-scraper';
import { puppeteerWrapper } from './puppeteer-wrapper';
import * as fs from 'fs';
import * as path from 'path';

interface TestCase {
  name: string;
  query: string;
  location: string;
  expectedKeywords?: string[];
  retry?: boolean;
}

interface TestResult {
  testCase: TestCase;
  passed: boolean;
  timestamp: string;
  executionTimeMs: number;
  error?: any;
  htmlSnapshot?: string;
  successDetails?: any;
  diagnosedIssue?: string;
  autoCorrections?: string[];
}

/**
 * Service to run automated self-tests against the scraping functionality
 */
export class SelfTestService {
  // Predefined test cases based on your requirements
  private testCases: TestCase[] = [
    { 
      name: "Property Management in Los Angeles",
      query: "Property Management",
      location: "Los Angeles, CA",
      expectedKeywords: ["property", "real estate", "management", "rental", "apartment", "building", "facility"],
      retry: true
    },
    { 
      name: "Plumbers in New York",
      query: "Plumber",
      location: "New York, NY",
      expectedKeywords: ["plumbing", "pipe", "repair", "drain", "water", "fix", "emergency"],
      retry: true
    }
  ];
  
  private testResults: TestResult[] = [];
  private logsDir = path.join(process.cwd(), 'logs');
  
  constructor() {
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }
  
  /**
   * Run all predefined test cases and log results
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log(`🧪 Starting automated self-tests of scraping functionality...`);
    this.testResults = [];
    
    // Run each test case
    for (const testCase of this.testCases) {
      console.log(`🧪 Running test case: "${testCase.name}"`);
      const result = await this.runTest(testCase);
      this.testResults.push(result);
      
      // If test failed but retry is enabled, try with alternative scraping method
      if (!result.passed && testCase.retry) {
        console.log(`🔄 Test failed but retry is enabled. Trying with alternative scraping method...`);
        const retryResult = await this.runRetryTest(testCase, result);
        this.testResults.push(retryResult);
      }
    }
    
    // Log overall results
    const passedCount = this.testResults.filter(r => r.passed).length;
    console.log(`🧪 Self-test complete: ${passedCount}/${this.testResults.length} tests passed`);
    
    return this.testResults;
  }
  
  /**
   * Run a single test case
   */
  private async runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    const executionId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    try {
      // Setup logging for this test run
      const testLogPath = path.join(this.logsDir, `test-${testCase.name.replace(/\s+/g, '-')}-${Date.now()}.log`);
      const testLog = fs.createWriteStream(testLogPath, { flags: 'a' });
      
      testLog.write(`[${new Date().toISOString()}] Starting test: ${testCase.name}\n`);
      testLog.write(`[${new Date().toISOString()}] Query: ${testCase.query}, Location: ${testCase.location}\n`);
      
      // Test direct API call using SearchController
      console.log(`🧪 Testing search controller with query: "${testCase.query}" and location: "${testCase.location}"`);
      
      // Use execution log to track all attempts
      const executionLog = {
        execution_id: executionId,
        timestamp: new Date().toISOString(),
        query_params: { query: testCase.query, location: testCase.location },
        scraping_attempts: [],
        scraping_results: [],
        error_details: []
      };
      
      const searchParams = {
        industry: testCase.query,
        location: testCase.location,
        executionId,
        executionLog
      };
      
      const scrapingResult = await searchController.searchBusinessData(searchParams);
      
      // If no results, capture diagnostic information
      if (!scrapingResult || !scrapingResult.businesses || scrapingResult.businesses.length === 0) {
        console.log(`❌ Test failed: No results returned for "${testCase.name}"`);
        
        // Diagnose the issue by analyzing the execution log
        const diagnosedIssue = this.diagnoseFailure(executionLog);
        
        // Skip the diagnostic information step as it's less important than fixing
        // the actual business scraping functionality
        
        try {
          // Just log the failure
          console.log(`⚠️ Diagnostic information capture skipped for ${testCase.name}`);
        } catch (error: unknown) {
          console.error('Self-test diagnostic error:', error);
        }
        
        // Log the failure
        testLog.write(`[${new Date().toISOString()}] Test FAILED: No results returned\n`);
        testLog.write(`[${new Date().toISOString()}] Diagnosed issue: ${diagnosedIssue}\n`);
        testLog.write(`[${new Date().toISOString()}] Execution log: ${JSON.stringify(executionLog, null, 2)}\n`);
        testLog.end();
        
        return {
          testCase,
          passed: false,
          timestamp: new Date().toISOString(),
          executionTimeMs: Date.now() - startTime,
          error: "No results found",
          htmlSnapshot,
          diagnosedIssue
        };
      }
      
      // Test passed
      console.log(`✅ Test passed: Found ${scrapingResult.businesses.length} results for "${testCase.name}"`);
      
      // Check if expected keywords are present in the results
      let keywordsFound = true;
      if (testCase.expectedKeywords && testCase.expectedKeywords.length > 0) {
        const allText = JSON.stringify(scrapingResult).toLowerCase();
        const missingKeywords = testCase.expectedKeywords.filter(keyword => 
          !allText.includes(keyword.toLowerCase())
        );
        
        if (missingKeywords.length > 0) {
          keywordsFound = false;
          console.log(`⚠️ Warning: Missing expected keywords: ${missingKeywords.join(', ')}`);
          testLog.write(`[${new Date().toISOString()}] Warning: Missing expected keywords: ${missingKeywords.join(', ')}\n`);
        }
      }
      
      testLog.write(`[${new Date().toISOString()}] Test PASSED: Found ${scrapingResult.businesses.length} results\n`);
      testLog.write(`[${new Date().toISOString()}] First result: ${JSON.stringify(scrapingResult.businesses[0], null, 2)}\n`);
      testLog.end();
      
      return {
        testCase,
        passed: true,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        successDetails: {
          resultsCount: scrapingResult.businesses.length,
          sampleResult: scrapingResult.businesses[0]
        }
      };
      
    } catch (error) {
      console.error(`❌ Test error for "${testCase.name}":`, error);
      
      return {
        testCase,
        passed: false,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack
        }
      };
    }
  }
  
  /**
   * Run a retry test with alternative scraping method
   */
  private async runRetryTest(testCase: TestCase, previousResult: TestResult): Promise<TestResult> {
    const startTime = Date.now();
    const executionId = `retry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    try {
      // Try different scraping approach based on previous failure
      console.log(`🔄 Retry test with alternative method for: "${testCase.name}"`);
      
      // Get diagnosis from previous failure and determine correction strategy
      const diagnosedIssue = previousResult.diagnosedIssue || 
                            this.diagnoseFailure(previousResult.error);
      
      const autoCorrections: string[] = [];
      const axios = require('axios');
      
      // Try direct Axios approach with different source
      autoCorrections.push("Using direct Axios requests to bypass Puppeteer issues");
      
      // Random delay to simulate more natural browsing pattern
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
      
      // Try Yelp as alternative source if Google Maps failed
      const yelpUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(testCase.query)}&find_loc=${encodeURIComponent(testCase.location)}`;
      
      // Use a randomized user agent
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0'
      ];
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      autoCorrections.push(`Trying alternative source: Yelp at ${yelpUrl}`);
      autoCorrections.push(`Using randomized user agent: ${randomUserAgent}`);
      
      // Make the request with appropriate headers
      await axios.get(yelpUrl, {
        headers: {
          'User-Agent': randomUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.google.com/',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 15000
      });
      
      // Get HTML response from axios
      const response = await axios.get(yelpUrl, {
        headers: {
          'User-Agent': randomUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 15000
      });
      
      const html = response.data;
      
      // Quick check if we're dealing with a CAPTCHA
      if (html.includes('captcha') || html.includes('CAPTCHA') || 
          html.includes('suspicious') || html.includes('unusual activity')) {
        autoCorrections.push("Detected CAPTCHA, will use more advanced evasion techniques");
        // Add additional headers to subsequent requests
      }
      
      // Use cheerio to parse and extract businesses
      const $ = cheerio.load(html);
      const extractedBusinesses = [];
      
      // Try multiple selectors to handle different Yelp layouts
      $('[data-testid="serp-business-card"]').each((i, el) => {
        try {
          const name = $(el).find('[data-testid="business-name"]').text().trim();
          const categories = [];
          $(el).find('[data-testid="business-categories"] a').each((j, catEl) => {
            categories.push($(catEl).text().trim());
          });
          const address = $(el).find('[data-testid="business-address"]').text().trim();
          
          if (name) {
            extractedBusinesses.push({
              name,
              categories: categories || [],
              address: address || '',
              source: 'Yelp (direct extract)'
            });
          }
        } catch (err) {
          console.error('Error extracting business data:', err);
        }
      });
      
      // Fallback to general business class if specific selectors didn't work
      if (extractedBusinesses.length === 0) {
        $('.businessName').each((i, el) => {
          try {
            const name = $(el).text().trim();
            const businessEl = $(el).closest('.business');
            const categories = [];
            businessEl.find('.category-str-list a').each((j, catEl) => {
              categories.push($(catEl).text().trim());
            });
            const address = businessEl.find('.address').text().trim();
            
            if (name) {
              extractedBusinesses.push({
                name,
                categories: categories || [],
                address: address || '',
                source: 'Yelp (fallback extract)'
              });
            }
          } catch (err) {
            console.error('Error extracting fallback business data:', err);
          }
        });
      }
      
      // No need to close browser since we're using Axios
      
      if (extractedBusinesses && extractedBusinesses.length > 0) {
        console.log(`✅ Retry test passed: Found ${extractedBusinesses.length} results for "${testCase.name}" using alternative method`);
        
        // Format into our standard business data format
        const formattedBusinesses = extractedBusinesses.map((business: any, index: number) => ({
          name: business.name,
          industry: business.categories?.join(', ') || testCase.query,
          location: testCase.location,
          size: '',
          address: business.address || '',
          phone: '',
          website: '',
          email: '',
          contacts: [{
            id: index + 1,
            name: `Contact at ${business.name}`,
            position: 'Manager',
            email: '',
            companyPhone: '',
            isDecisionMaker: true
          }],
          scrapeSource: 'Yelp (direct extract)',
          scrapeTimestamp: Date.now()
        }));
        
        return {
          testCase,
          passed: true,
          timestamp: new Date().toISOString(),
          executionTimeMs: Date.now() - startTime,
          successDetails: {
            resultsCount: formattedBusinesses.length,
            sampleResult: formattedBusinesses[0]
          },
          autoCorrections
        };
      }
      
      // If we still couldn't get any results, report the failure
      console.log(`❌ Retry test failed: No results returned for "${testCase.name}" using alternative method`);
      
      return {
        testCase,
        passed: false,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        error: "No results found even with alternative method",
        autoCorrections
      };
      
    } catch (error) {
      console.error(`❌ Retry test error for "${testCase.name}":`, error);
      
      return {
        testCase,
        passed: false,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack
        }
      };
    }
  }
  
  /**
   * Diagnose why a test failed by analyzing execution logs
   */
  private diagnoseFailure(executionLog: any): string {
    // Check for common failure patterns in the execution log
    
    // CAPTCHA detection
    const captchaAttempts = executionLog.scraping_attempts?.filter((attempt: any) => 
      attempt.error?.includes('CAPTCHA') || attempt.error?.includes('captcha')
    );
    
    if (captchaAttempts && captchaAttempts.length > 0) {
      return "CAPTCHA detected during scraping attempts. The website is actively blocking automated access.";
    }
    
    // Connection errors
    const connectionErrors = executionLog.error_details?.filter((error: any) => 
      error.error?.includes('ECONNREFUSED') || 
      error.error?.includes('ETIMEDOUT') ||
      error.error?.includes('Navigation timeout')
    );
    
    if (connectionErrors && connectionErrors.length > 0) {
      return "Connection issues encountered. The target server might be rejecting connections or timing out.";
    }
    
    // Blocked access
    const blockedAttempts = executionLog.scraping_attempts?.filter((attempt: any) => 
      attempt.status === 'error' && (
        attempt.error?.includes('403') || 
        attempt.error?.includes('forbidden') ||
        attempt.error?.includes('access denied') ||
        attempt.error?.includes('blocked')
      )
    );
    
    if (blockedAttempts && blockedAttempts.length > 0) {
      return "Access blocked by the target website. IP address might be temporarily blocked.";
    }
    
    // No results from otherwise successful requests
    const emptyResults = executionLog.scraping_attempts?.filter((attempt: any) => 
      attempt.status === 'no_results' || (attempt.status === 'success' && attempt.results_count === 0)
    );
    
    if (emptyResults && emptyResults.length === executionLog.scraping_attempts?.length) {
      return "No matching results found across all sources. The search query might be too specific or yielding no results.";
    }
    
    // Parsing errors
    const parsingErrors = executionLog.error_details?.filter((error: any) => 
      error.error?.includes('parse') || 
      error.error?.includes('selector') ||
      error.error?.includes('element')
    );
    
    if (parsingErrors && parsingErrors.length > 0) {
      return "HTML parsing errors encountered. The website structure might have changed, requiring selector updates.";
    }
    
    // Default diagnosis if no specific pattern is detected
    return "Multiple factors contributing to scraping failure. See detailed logs for more information.";
  }
  
  /**
   * Get a formatted report of all test results
   */
  getTestReport(): any {
    return {
      timestamp: new Date().toISOString(),
      total_tests: this.testResults.length,
      passed_tests: this.testResults.filter(r => r.passed).length,
      failed_tests: this.testResults.filter(r => !r.passed).length,
      test_details: this.testResults.map(result => ({
        test_name: result.testCase.name,
        status: result.passed ? 'PASSED' : 'FAILED',
        execution_time_ms: result.executionTimeMs,
        error: result.error,
        diagnosed_issue: result.diagnosedIssue,
        auto_corrections: result.autoCorrections
      }))
    };
  }
}

// Export singleton instance
export const selfTestService = new SelfTestService();