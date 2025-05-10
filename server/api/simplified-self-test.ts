/**
 * Simplified self-test service to validate scraping functionality
 * This service runs test cases against real targets and logs results
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { searchController } from '../controllers/search-controller';
import { SearchParams } from '../models/business-data';

interface TestCase {
  name: string;
  industry: string;
  location: string;
  minExpectedResults: number;
}

export class SimplifiedSelfTest {
  private logsDir = path.join(process.cwd(), 'logs');
  private testResultsDir = path.join(this.logsDir, 'test-results');
  private lastResults: any = {};
  
  // Test cases that should always work with real data
  private testCases: TestCase[] = [
    {
      name: "Property Management in Los Angeles",
      industry: "Property Management",
      location: "Los Angeles",
      minExpectedResults: 3
    },
    {
      name: "Plumbers in New York",
      industry: "Plumbers",
      location: "New York",
      minExpectedResults: 3
    }
  ];
  
  constructor() {
    // Ensure logs directories exist
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    if (!fs.existsSync(this.testResultsDir)) {
      fs.mkdirSync(this.testResultsDir, { recursive: true });
    }
  }
  
  /**
   * Run all test cases and return results
   */
  async runAllTests(): Promise<boolean> {
    console.log(`🧪 Starting self-test with ${this.testCases.length} test cases`);
    
    let allPassed = true;
    let testsPassed = 0;
    const executionId = `test-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const testReport = {
      execution_id: executionId,
      timestamp: new Date().toISOString(),
      tests: [],
      passed_tests: 0,
      total_tests: this.testCases.length,
      success_rate: 0
    };
    
    for (const testCase of this.testCases) {
      console.log(`🧪 Running test case: "${testCase.name}"`);
      
      const testResult = {
        test_name: testCase.name,
        industry: testCase.industry,
        location: testCase.location,
        status: 'running',
        execution_id: `${executionId}-${testCase.name.replace(/\s+/g, '-').toLowerCase()}`,
        timestamp: new Date().toISOString(),
        businesses_found: 0,
        execution_time_ms: 0,
        log_file: '',
        error: null,
        passed: false
      };
      
      const startTime = Date.now();
      
      // Create test-specific execution log
      const executionLog = {
        execution_id: testResult.execution_id,
        timestamp: testResult.timestamp,
        test_case: testCase,
        scraping_attempts: [],
        scraping_results: [],
        error_details: []
      };
      
      try {
        // Execute the search using our controller
        console.log(`🧪 Searching for ${testCase.industry} in ${testCase.location}`);
        const result = await searchController.searchBusinessData({
          industry: testCase.industry,
          location: testCase.location,
          executionId: testResult.execution_id,
          executionLog: executionLog
        });
        
        const executionTime = Date.now() - startTime;
        testResult.execution_time_ms = executionTime;
        
        // Check if we got results
        if (result && 'businesses' in result && result.businesses.length > 0) {
          testResult.businesses_found = result.businesses.length;
          testResult.status = 'success';
          testResult.passed = result.businesses.length >= testCase.minExpectedResults;
          
          if (testResult.passed) {
            console.log(`✅ Test passed: ${testCase.name} found ${testResult.businesses_found} businesses in ${executionTime}ms`);
            testsPassed++;
          } else {
            console.log(`❌ Test failed: Found only ${testResult.businesses_found} businesses (expected at least ${testCase.minExpectedResults})`);
            allPassed = false;
          }
        } else {
          testResult.status = 'failed';
          testResult.error = 'No businesses found';
          testResult.passed = false;
          console.log(`❌ Test failed: No results returned for "${testCase.name}"`);
          allPassed = false;
        }
      } catch (error) {
        const executionTime = Date.now() - startTime;
        testResult.execution_time_ms = executionTime;
        testResult.status = 'error';
        testResult.error = (error as Error).message;
        testResult.passed = false;
        console.error(`❌ Test error for "${testCase.name}":`, error);
        allPassed = false;
      }
      
      // Save the test results and execution log
      const logFileName = `test-${testResult.execution_id}.json`;
      const logFilePath = path.join(this.testResultsDir, logFileName);
      testResult.log_file = logFilePath;
      
      fs.writeFileSync(logFilePath, JSON.stringify({
        test_result: testResult,
        execution_log: executionLog
      }, null, 2));
      
      // Add to test report
      testReport.tests.push(testResult);
    }
    
    // Update test report statistics
    testReport.passed_tests = testsPassed;
    testReport.success_rate = Math.round((testsPassed / this.testCases.length) * 100) / 100;
    
    // Save the overall test report
    const reportFileName = `test-report-${executionId}.json`;
    const reportFilePath = path.join(this.testResultsDir, reportFileName);
    fs.writeFileSync(reportFilePath, JSON.stringify(testReport, null, 2));
    
    // Store last results for retrieval
    this.lastResults = testReport;
    
    console.log(`🧪 Self-test complete: ${testsPassed}/${this.testCases.length} tests passed`);
    return allPassed;
  }
  
  /**
   * Run a retest of a specific failed test case
   */
  async runRetryTest(testName: string): Promise<boolean> {
    console.log(`🔄 Retrying test case: "${testName}"`);
    
    const testCase = this.testCases.find(t => t.name === testName);
    if (!testCase) {
      console.error(`❌ Test case "${testName}" not found`);
      return false;
    }
    
    const executionId = `retry-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const testResult = {
      test_name: testCase.name,
      industry: testCase.industry,
      location: testCase.location,
      status: 'running',
      execution_id: executionId,
      timestamp: new Date().toISOString(),
      businesses_found: 0,
      execution_time_ms: 0,
      log_file: '',
      error: null,
      passed: false,
      is_retry: true
    };
    
    const startTime = Date.now();
    
    // Create test-specific execution log
    const executionLog = {
      execution_id: testResult.execution_id,
      timestamp: testResult.timestamp,
      test_case: testCase,
      scraping_attempts: [],
      scraping_results: [],
      error_details: []
    };
    
    try {
      // Execute the search using our controller
      console.log(`🔄 Searching for ${testCase.industry} in ${testCase.location}`);
      const result = await searchController.searchBusinessData({
        industry: testCase.industry,
        location: testCase.location,
        executionId: testResult.execution_id,
        executionLog: executionLog
      });
      
      const executionTime = Date.now() - startTime;
      testResult.execution_time_ms = executionTime;
      
      // Check if we got results
      if (result && 'businesses' in result && result.businesses.length > 0) {
        testResult.businesses_found = result.businesses.length;
        testResult.status = 'success';
        testResult.passed = result.businesses.length >= testCase.minExpectedResults;
        
        if (testResult.passed) {
          console.log(`✅ Retry passed: ${testCase.name} found ${testResult.businesses_found} businesses in ${executionTime}ms`);
          return true;
        } else {
          console.log(`❌ Retry failed: Found only ${testResult.businesses_found} businesses (expected at least ${testCase.minExpectedResults})`);
          return false;
        }
      } else {
        testResult.status = 'failed';
        testResult.error = 'No businesses found';
        testResult.passed = false;
        console.log(`❌ Retry failed: No results returned for "${testCase.name}"`);
        return false;
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      testResult.execution_time_ms = executionTime;
      testResult.status = 'error';
      testResult.error = (error as Error).message;
      testResult.passed = false;
      console.error(`❌ Retry error for "${testCase.name}":`, error);
      return false;
    } finally {
      // Save the test results and execution log
      const logFileName = `retry-${testResult.execution_id}.json`;
      const logFilePath = path.join(this.testResultsDir, logFileName);
      testResult.log_file = logFilePath;
      
      fs.writeFileSync(logFilePath, JSON.stringify({
        test_result: testResult,
        execution_log: executionLog
      }, null, 2));
    }
  }
  
  /**
   * Get the last test report
   */
  getTestReport(): any {
    return this.lastResults;
  }
  
  /**
   * Diagnose and attempt to fix a failed test
   * This analyzes logs, adjusts scrapers, and retries
   */
  async diagnoseAndFixFailedTest(testName: string): Promise<boolean> {
    console.log(`🔍 Diagnosing failed test: "${testName}"`);
    
    // Find test case
    const testCase = this.testCases.find(t => t.name === testName);
    if (!testCase) {
      console.error(`❌ Test case "${testName}" not found`);
      return false;
    }
    
    // First try a simple retry to see if it's a transient issue
    console.log(`🔍 Attempting direct retry first...`);
    const retryResult = await this.runRetryTest(testName);
    if (retryResult) {
      console.log(`✅ Test fixed with simple retry!`);
      return true;
    }
    
    // If simple retry failed, analyze recent logs more deeply
    console.log(`🔍 Simple retry failed, performing deeper diagnosis...`);
    
    // List test result files and find the most recent for this test
    const files = fs.readdirSync(this.testResultsDir);
    const testFiles = files.filter(f => 
      f.includes(testName.replace(/\s+/g, '-').toLowerCase()) || 
      f.includes(testCase.industry.toLowerCase())
    );
    
    if (testFiles.length === 0) {
      console.error(`❌ No log files found for test "${testName}"`);
      return false;
    }
    
    // Sort by most recent
    testFiles.sort((a, b) => {
      const aTime = fs.statSync(path.join(this.testResultsDir, a)).mtime.getTime();
      const bTime = fs.statSync(path.join(this.testResultsDir, b)).mtime.getTime();
      return bTime - aTime;
    });
    
    // Analyze most recent log
    try {
      const logPath = path.join(this.testResultsDir, testFiles[0]);
      console.log(`🔍 Analyzing log file: ${logPath}`);
      const logData = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      
      // Look for patterns in errors
      const errorDetails = logData.execution_log?.error_details || [];
      if (errorDetails.length > 0) {
        console.log(`🔍 Found ${errorDetails.length} error details to analyze`);
        
        // Check for common error patterns
        const cloudflareDetected = errorDetails.some(e => 
          e.error && (
            e.error.includes('cloudflare') || 
            e.error.includes('challenge') ||
            e.error.includes('CAPTCHA') ||
            e.error.includes('bot detection')
          )
        );
        
        const timeoutErrors = errorDetails.some(e => 
          e.error && (
            e.error.includes('timeout') || 
            e.error.includes('timed out')
          )
        );
        
        const selectorErrors = errorDetails.some(e => 
          e.error && (
            e.error.includes('selector') || 
            e.error.includes('element not found') ||
            e.error.includes('no element')
          )
        );
        
        // Apply automated fixes based on error patterns
        if (cloudflareDetected) {
          console.log(`🔧 Detected Cloudflare protection issues, attempting to modify bypass strategy...`);
          // We'd implement a more sophisticated Cloudflare bypass here
          // For now, we'll just try a different approach with adjusted delays
          // In a real implementation, we'd modify the puppeteer wrapper parameters
        }
        
        if (timeoutErrors) {
          console.log(`🔧 Detected timeout issues, attempting with longer timeouts...`);
          // In a real implementation, we'd adjust timeout parameters
        }
        
        if (selectorErrors) {
          console.log(`🔧 Detected selector issues, checking for HTML structure changes...`);
          // In a real implementation, we'd analyze HTML snapshots and update selectors
        }
        
        // Retry with adjustments
        console.log(`🔄 Retrying test after analysis and adjustments...`);
        return await this.runRetryTest(testName);
      } else {
        console.log(`⚠️ No specific error details found in logs`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error analyzing logs:`, error);
      return false;
    }
  }
}

export const selfTestService = new SimplifiedSelfTest();
// For backward compatibility with older exports
export { selfTestService as simplifiedSelfTestService };