/**
 * Simplified self-test system for the NexLead scraping engine
 * Runs predefined test cases to verify the system is working correctly
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SearchParams } from '../models/business-data';
import { searchController } from '../controllers/search-controller';

interface TestCase {
  id: string;
  name: string;
  description: string;
  query: string;
  location?: string;
  minimumExpectedResults: number;
}

interface TestResult {
  id: string;
  test_case_id: string;
  name: string;
  passed: boolean;
  timestamp: string;
  execution_time_ms: number;
  results_count: number;
  error?: string;
}

interface TestReport {
  id: string;
  timestamp: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  results: TestResult[];
}

export class SimplifiedSelfTest {
  private testCases: TestCase[];
  private logsDir: string;
  private testReportsDir: string;

  constructor() {
    // Initialize test cases - these should cover different industry segments
    this.testCases = [
      {
        id: "test-case-1",
        name: "General Business Test",
        description: "Tests scraping of cleaning service businesses in New York",
        query: "Cleaning Service",
        location: "New York",
        minimumExpectedResults: 1
      },
      {
        id: "test-case-2",
        name: "Property Management Test",
        description: "Tests scraping of property management businesses in Los Angeles",
        query: "Property Management",
        location: "Los Angeles",
        minimumExpectedResults: 1
      }
    ];
    
    // Create logs directory if it doesn't exist
    this.logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // Create test reports directory
    this.testReportsDir = path.join(this.logsDir, 'test-reports');
    if (!fs.existsSync(this.testReportsDir)) {
      fs.mkdirSync(this.testReportsDir, { recursive: true });
    }
  }

  /**
   * Run all predefined test cases
   */
  async runAllTests(): Promise<TestReport> {
    console.log(`🧪 Starting self-test with ${this.testCases.length} test cases...`);
    
    const results: TestResult[] = [];
    let passedTests = 0;
    
    const reportId = uuidv4();
    const timestamp = new Date().toISOString();
    
    for (const testCase of this.testCases) {
      console.log(`🔍 Running test: ${testCase.name}`);
      
      try {
        const startTime = Date.now();
        
        // Create search params
        const searchParams: SearchParams = {
          query: testCase.query,
          location: testCase.location,
          page: 1,
          limit: 10,
        };
        
        // Run search
        const searchResult = await searchController.searchBusinessData(searchParams);
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        // Check if test passed (has minimum number of results)
        const businessCount = searchResult.businesses.length;
        const passed = businessCount >= testCase.minimumExpectedResults;
        
        if (passed) {
          console.log(`✅ Test passed: ${testCase.name} - Found ${businessCount} businesses`);
          passedTests++;
        } else {
          console.log(`❌ Test failed: ${testCase.name} - Expected at least ${testCase.minimumExpectedResults} results but got ${businessCount}`);
        }
        
        const testResult: TestResult = {
          id: uuidv4(),
          test_case_id: testCase.id,
          name: testCase.name,
          passed,
          timestamp: new Date().toISOString(),
          execution_time_ms: executionTime,
          results_count: businessCount
        };
        
        results.push(testResult);
      } catch (error) {
        console.error(`❌ Test error in ${testCase.name}:`, error);
        
        const testResult: TestResult = {
          id: uuidv4(),
          test_case_id: testCase.id,
          name: testCase.name,
          passed: false,
          timestamp: new Date().toISOString(),
          execution_time_ms: 0,
          results_count: 0,
          error: (error as Error).message
        };
        
        results.push(testResult);
      }
    }
    
    const report: TestReport = {
      id: reportId,
      timestamp,
      total_tests: this.testCases.length,
      passed_tests: passedTests,
      failed_tests: this.testCases.length - passedTests,
      results
    };
    
    console.log(`🧪 Self-test complete: ${passedTests}/${this.testCases.length} tests passed`);
    
    // Save report
    this.saveTestReport(reportId, report);
    
    return report;
  }

  /**
   * Save test report to file
   */
  private saveTestReport(reportId: string, report: TestReport): string {
    const filename = path.join(this.testReportsDir, `${reportId}.json`);
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    return filename;
  }

  /**
   * Get the most recent test report
   */
  async getLatestTestReport(): Promise<TestReport | null> {
    try {
      const files = fs.readdirSync(this.testReportsDir);
      
      if (files.length === 0) {
        return null;
      }
      
      // Sort files by creation time (newest first)
      const sortedFiles = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.testReportsDir, file);
          const stats = fs.statSync(filePath);
          return { file, stats };
        })
        .sort((a, b) => b.stats.ctime.getTime() - a.stats.ctime.getTime());
      
      if (sortedFiles.length === 0) {
        return null;
      }
      
      // Read the newest file
      const reportPath = path.join(this.testReportsDir, sortedFiles[0].file);
      const reportJson = fs.readFileSync(reportPath, 'utf-8');
      return JSON.parse(reportJson) as TestReport;
    } catch (error) {
      console.error('Error getting latest test report:', error);
      return null;
    }
  }

  /**
   * Get a test report by ID
   */
  async getTestReport(reportId: string): Promise<TestReport | null> {
    try {
      const reportPath = path.join(this.testReportsDir, `${reportId}.json`);
      
      if (!fs.existsSync(reportPath)) {
        return null;
      }
      
      const reportJson = fs.readFileSync(reportPath, 'utf-8');
      return JSON.parse(reportJson) as TestReport;
    } catch (error) {
      console.error(`Error getting test report ${reportId}:`, error);
      return null;
    }
  }
}

export const simplifiedSelfTest = new SimplifiedSelfTest();