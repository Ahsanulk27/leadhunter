/**
 * Simplified self-testing module for the LeadHunter scraping system
 * Tests the scraping functionality with predefined test cases
 */

import { searchController } from '../controllers/search-controller';
import * as fs from 'fs';
import * as path from 'path';
import { SearchParams } from '../controllers/search-controller';

interface TestCase {
  name: string;
  query: string;
  location: string;
}

interface TestResult {
  testCase: TestCase;
  passed: boolean;
  timestamp: string;
  executionTimeMs: number;
  error?: any;
  successDetails?: any;
}

/**
 * Service to run automated self-tests against the scraping functionality
 */
export class SimplifiedSelfTestService {
  // Predefined test cases based on your requirements
  private testCases: TestCase[] = [
    { 
      name: "Property Management in Los Angeles",
      query: "Property Management",
      location: "Los Angeles, CA"
    },
    { 
      name: "Plumbers in New York",
      query: "Plumber",
      location: "New York, NY"
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
    console.log(`🧪 Starting simplified self-tests of scraping functionality...`);
    this.testResults = [];
    
    // Run each test case
    for (const testCase of this.testCases) {
      console.log(`🧪 Running test case: "${testCase.name}"`);
      const result = await this.runTest(testCase);
      this.testResults.push(result);
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
    const executionId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    
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
      
      const searchParams: SearchParams = {
        industry: testCase.query,
        location: testCase.location,
        executionId,
        executionLog
      };
      
      const scrapingResult = await searchController.searchBusinessData(searchParams);
      
      // If no results, return failure
      if (!scrapingResult || !scrapingResult.businesses || scrapingResult.businesses.length === 0) {
        console.log(`❌ Test failed: No results returned for "${testCase.name}"`);
        
        testLog.write(`[${new Date().toISOString()}] Test FAILED: No results returned\n`);
        testLog.end();
        
        return {
          testCase,
          passed: false,
          timestamp: new Date().toISOString(),
          executionTimeMs: Date.now() - startTime,
          error: "No results found"
        };
      }
      
      // Test passed
      console.log(`✅ Test passed: Found ${scrapingResult.businesses.length} results for "${testCase.name}"`);
      
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
   * Get a summary report of all test results
   */
  getTestReport(): any {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        total_tests: totalTests,
        passed_tests: passedTests,
        failed_tests: totalTests - passedTests,
        success_rate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0
      },
      test_results: this.testResults.map(result => ({
        name: result.testCase.name,
        passed: result.passed,
        timestamp: result.timestamp,
        execution_time_ms: result.executionTimeMs,
        error: result.error || null,
        details: result.successDetails || null
      }))
    };
  }
}

// Export singleton instance
export const simplifiedSelfTestService = new SimplifiedSelfTestService();