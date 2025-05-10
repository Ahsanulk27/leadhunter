/**
 * Test harness for the NexLead application
 * Runs periodic tests to verify the system is operational
 * Tracks success/failure rates and sends alerts if needed
 */

import path from 'path';
import fs from 'fs';
import { simplifiedSelfTest } from './simplified-self-test';
import { TestReport } from '../models/business-data';

interface SystemDiagnostics {
  timestamp: string;
  passed_tests: number;
  failed_tests: number;
  pass_rate: number;
  failures_by_type: Record<string, number>;
  test_history: {
    test_id: string;
    timestamp: string;
    passed: boolean;
    error?: string;
  }[];
  uptime_minutes: number;
}

export class TestHarness {
  private logsDir: string;
  private diagnosticsDir: string;
  private startTime: number;
  private testHistory: {
    id: string;
    timestamp: string;
    passed: boolean;
    error?: string;
  }[];
  
  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.diagnosticsDir = path.join(this.logsDir, 'diagnostics');
    this.startTime = Date.now();
    this.testHistory = [];
    
    // Create directories if they don't exist
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.diagnosticsDir)) {
      fs.mkdirSync(this.diagnosticsDir, { recursive: true });
    }
  }
  
  /**
   * Run all tests and update diagnostics
   */
  async runAllTests(): Promise<SystemDiagnostics> {
    const testReportFile = path.join(this.logsDir, `test-harness-run-${new Date().toISOString().replace(/:/g, '-')}.log`);
    console.log(`🔍 Running test harness, logging to ${testReportFile}`);
    
    const startTime = Date.now();
    
    try {
      // Run all self tests
      const testResults = await simplifiedSelfTest.runAllTests();
      
      // Generate and save diagnostics
      const diagnostics = this.analyzeDiagnostics(testResults);
      this.saveDiagnostics(diagnostics);
      
      // Log test completion
      const endTime = Date.now();
      const executionTimeMs = endTime - startTime;
      fs.appendFileSync(testReportFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        test_results: testResults,
        execution_time_ms: executionTimeMs,
        diagnostics
      }, null, 2));
      
      return diagnostics;
    } catch (error) {
      console.error('❌ Error in test harness:', error);
      
      fs.appendFileSync(testReportFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        stack: (error as Error).stack
      }, null, 2));
      
      // Return empty diagnostics if an error occurs
      return {
        timestamp: new Date().toISOString(),
        passed_tests: 0,
        failed_tests: 0,
        pass_rate: 0,
        failures_by_type: {},
        test_history: [],
        uptime_minutes: Math.floor((Date.now() - this.startTime) / 60000)
      };
    }
  }
  
  /**
   * Analyze test results to generate system diagnostics
   */
  private analyzeDiagnostics(testResults: TestReport): SystemDiagnostics {
    // Process test results
    const failuresByType: Record<string, number> = {};
    
    for (const result of testResults.results) {
      if (!result.passed && result.error) {
        const errorType = this.categorizeError(result.error);
        failuresByType[errorType] = (failuresByType[errorType] || 0) + 1;
      }
      
      this.testHistory.push({
        id: result.testCase.id,
        timestamp: result.timestamp,
        passed: result.passed,
        error: result.error
      });
    }
    
    // Keep only the last 20 test results
    if (this.testHistory.length > 20) {
      this.testHistory = this.testHistory.slice(-20);
    }
    
    return {
      timestamp: new Date().toISOString(),
      passed_tests: testResults.passedCount,
      failed_tests: testResults.failedCount,
      pass_rate: testResults.passRate,
      failures_by_type: failuresByType,
      test_history: this.testHistory,
      uptime_minutes: Math.floor((Date.now() - this.startTime) / 60000)
    };
  }
  
  /**
   * Save diagnostics to file
   */
  private saveDiagnostics(diagnostics: SystemDiagnostics): void {
    const filePath = path.join(this.diagnosticsDir, `diagnostics-${new Date().toISOString().replace(/:/g, '-')}.json`);
    fs.writeFileSync(filePath, JSON.stringify(diagnostics, null, 2));
    
    // Also save to latest file
    const latestFilePath = path.join(this.diagnosticsDir, 'latest-diagnostics.json');
    fs.writeFileSync(latestFilePath, JSON.stringify(diagnostics, null, 2));
  }
  
  /**
   * Get the latest diagnostics
   */
  getLatestDiagnostics(): SystemDiagnostics | null {
    try {
      const latestFilePath = path.join(this.diagnosticsDir, 'latest-diagnostics.json');
      if (!fs.existsSync(latestFilePath)) {
        return null;
      }
      
      const content = fs.readFileSync(latestFilePath, 'utf-8');
      return JSON.parse(content) as SystemDiagnostics;
    } catch (error) {
      console.error('❌ Error getting latest diagnostics:', error);
      return null;
    }
  }
  
  /**
   * Check if the system is healthy (pass rate above threshold)
   */
  isHealthy(threshold = 0.5): boolean {
    const diagnostics = this.getLatestDiagnostics();
    if (!diagnostics) {
      return false;
    }
    
    return diagnostics.pass_rate >= threshold;
  }
  
  /**
   * Categorize an error message into a standard type
   */
  private categorizeError(error: string): string {
    if (error.includes('CAPTCHA') || error.includes('captcha') || error.includes('robot')) {
      return 'CAPTCHA_DETECTED';
    } else if (error.includes('timeout') || error.includes('timed out')) {
      return 'TIMEOUT';
    } else if (error.includes('rate limit') || error.includes('too many requests') || error.includes('429')) {
      return 'RATE_LIMITED';
    } else if (error.includes('IP') || error.includes('blocked') || error.includes('banned')) {
      return 'IP_BLOCKED';
    } else if (error.includes('proxy') || error.includes('connection')) {
      return 'CONNECTION_ERROR';
    } else if (error.includes('parse') || error.includes('selector')) {
      return 'PARSING_ERROR';
    } else {
      return 'UNKNOWN_ERROR';
    }
  }
}

export const testHarness = new TestHarness();