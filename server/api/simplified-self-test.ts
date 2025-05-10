/**
 * Simplified self-test system for the NexLead scraping engine
 * Runs predefined test cases to verify the system is working correctly
 */

import { v4 as uuidv4 } from 'uuid';
import { searchController } from '../controllers/search-controller';
import { TestCase, TestResult, TestReport } from '../models/business-data';
import * as fs from 'fs';
import * as path from 'path';

export class SimplifiedSelfTest {
  private testCases: TestCase[];
  private logsDir: string;
  private testReportsDir: string;
  
  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.testReportsDir = path.join(this.logsDir, 'test-reports');
    
    // Create logs directories
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    if (!fs.existsSync(this.testReportsDir)) {
      fs.mkdirSync(this.testReportsDir, { recursive: true });
    }
    
    // Define standard test cases
    this.testCases = [
      {
        name: 'Property Management Test',
        query: 'Property Management',
        location: 'Los Angeles',
        expected_min_results: 1,
        sources: ['google', 'yelp', 'yellowpages'],
        must_include_contacts: false
      },
      {
        name: 'Plumbers Test',
        query: 'Plumbers',
        location: 'New York',
        expected_min_results: 1,
        sources: ['google', 'yelp', 'yellowpages'],
        must_include_contacts: false
      }
    ];
  }
  
  /**
   * Run all predefined test cases
   */
  async runAllTests(): Promise<TestReport> {
    console.log('🧪 SimplifiedSelfTest: Running all test cases...');
    
    const results: TestResult[] = [];
    const reportId = uuidv4();
    const timestamp = new Date().toISOString();
    
    for (const testCase of this.testCases) {
      console.log(`🧪 Running test: ${testCase.name}`);
      
      try {
        const startTime = Date.now();
        const executionId = uuidv4();
        
        // Run the test
        const searchResult = await searchController.searchBusinessData({
          query: testCase.query,
          location: testCase.location,
          page: 1,
          limit: 10
        });
        
        // Check if the test passed
        let passed = false;
        let error = null;
        let businessesFound = 0;
        
        if ('businesses' in searchResult) {
          businessesFound = searchResult.businesses.length;
          passed = businessesFound >= testCase.expected_min_results;
          
          if (!passed) {
            error = `Expected at least ${testCase.expected_min_results} results, but found ${businessesFound}`;
          }
        } else {
          error = searchResult.error;
        }
        
        const executionTime = Date.now() - startTime;
        
        // Save test result
        const testResult: TestResult = {
          test_name: testCase.name,
          query: testCase.query,
          location: testCase.location,
          status: passed ? 'passed' : 'failed',
          execution_id: executionId,
          timestamp,
          businesses_found: businessesFound,
          execution_time_ms: executionTime,
          error,
          passed
        };
        
        results.push(testResult);
        
        // Log the result
        if (passed) {
          console.log(`✅ Test passed: ${testCase.name}`);
        } else {
          console.log(`❌ Test failed: ${error}`);
        }
      } catch (error) {
        // Handle any unexpected errors
        console.error(`❌ Error running test ${testCase.name}:`, error);
        
        results.push({
          test_name: testCase.name,
          query: testCase.query,
          location: testCase.location,
          status: 'failed',
          execution_id: uuidv4(),
          timestamp,
          businesses_found: 0,
          execution_time_ms: 0,
          error: (error as Error).message,
          passed: false
        });
      }
    }
    
    // Create the test report
    const passedTests = results.filter(r => r.passed).length;
    const report: TestReport = {
      timestamp,
      total_tests: this.testCases.length,
      passed_tests: passedTests,
      failed_tests: this.testCases.length - passedTests,
      tests: results
    };
    
    // Save the report
    this.saveTestReport(reportId, report);
    
    console.log(`🧪 Self-test complete: ${passedTests}/${this.testCases.length} tests passed`);
    
    return report;
  }
  
  /**
   * Save test report to file
   */
  private saveTestReport(reportId: string, report: TestReport): string {
    try {
      const filename = `${reportId}.json`;
      const filepath = path.join(this.testReportsDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
      return filepath;
    } catch (error) {
      console.error(`❌ Error saving test report:`, error);
      return '';
    }
  }
  
  /**
   * Get the most recent test report
   */
  async getLatestTestReport(): Promise<TestReport | null> {
    try {
      const files = fs.readdirSync(this.testReportsDir)
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(this.testReportsDir, a));
          const statB = fs.statSync(path.join(this.testReportsDir, b));
          return statB.mtime.getTime() - statA.mtime.getTime();
        });
      
      if (files.length === 0) {
        return null;
      }
      
      const latestFile = files[0];
      const data = fs.readFileSync(path.join(this.testReportsDir, latestFile), 'utf8');
      return JSON.parse(data) as TestReport;
    } catch (error) {
      console.error(`❌ Error getting latest test report:`, error);
      return null;
    }
  }
  
  /**
   * Get a test report by ID
   */
  async getTestReport(reportId: string): Promise<TestReport | null> {
    try {
      const filepath = path.join(this.testReportsDir, `${reportId}.json`);
      
      if (fs.existsSync(filepath)) {
        const data = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(data) as TestReport;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error getting test report:`, error);
      return null;
    }
  }
}

export const simplifiedSelfTest = new SimplifiedSelfTest();