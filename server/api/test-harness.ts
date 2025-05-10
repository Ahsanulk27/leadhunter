/**
 * Test harness for the NexLead application
 * Runs periodic tests to verify the system is operational
 * Tracks success/failure rates and sends alerts if needed
 */

import { v4 as uuidv4 } from 'uuid';
import { simplifiedSelfTest } from './simplified-self-test';
import { TestReport } from '../models/business-data';
import * as fs from 'fs';
import * as path from 'path';

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
    test_id: string;
    timestamp: string;
    passed: boolean;
    error?: string;
  }[];
  
  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.diagnosticsDir = path.join(this.logsDir, 'diagnostics');
    this.startTime = Date.now();
    this.testHistory = [];
    
    // Create logs directories
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
    console.log('📊 TestHarness: Running all tests...');
    
    try {
      // Run all self-tests
      const testResults = await simplifiedSelfTest.runAllTests();
      
      // Update test history
      testResults.tests.forEach(test => {
        this.testHistory.push({
          test_id: test.execution_id,
          timestamp: test.timestamp,
          passed: test.passed,
          error: test.error || undefined
        });
      });
      
      // Limit history to the latest 100 tests
      if (this.testHistory.length > 100) {
        this.testHistory = this.testHistory.slice(-100);
      }
      
      // Generate diagnostics
      const diagnostics = this.analyzeDiagnostics(testResults);
      
      // Save diagnostics
      this.saveDiagnostics(diagnostics);
      
      return diagnostics;
    } catch (error) {
      console.error('📊 Error in test harness:', error);
      
      return {
        timestamp: new Date().toISOString(),
        passed_tests: 0,
        failed_tests: 0,
        pass_rate: 0,
        failures_by_type: {},
        test_history: this.testHistory,
        uptime_minutes: Math.floor((Date.now() - this.startTime) / (1000 * 60))
      };
    }
  }
  
  /**
   * Analyze test results to generate system diagnostics
   */
  private analyzeDiagnostics(testResults: TestReport): SystemDiagnostics {
    // Count failures by test name
    const failuresByType: Record<string, number> = {};
    
    testResults.tests.forEach(test => {
      if (!test.passed) {
        const testName = test.test_name;
        failuresByType[testName] = (failuresByType[testName] || 0) + 1;
      }
    });
    
    // Calculate pass rate
    const passRate = testResults.total_tests > 0 
      ? testResults.passed_tests / testResults.total_tests 
      : 0;
    
    return {
      timestamp: new Date().toISOString(),
      passed_tests: testResults.passed_tests,
      failed_tests: testResults.failed_tests,
      pass_rate: passRate,
      failures_by_type: failuresByType,
      test_history: this.testHistory,
      uptime_minutes: Math.floor((Date.now() - this.startTime) / (1000 * 60))
    };
  }
  
  /**
   * Save diagnostics to file
   */
  private saveDiagnostics(diagnostics: SystemDiagnostics): void {
    try {
      const filename = `diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const filepath = path.join(this.diagnosticsDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(diagnostics, null, 2));
      
      // Also save to a "latest" file for easy access
      const latestFilepath = path.join(this.diagnosticsDir, 'latest-diagnostics.json');
      fs.writeFileSync(latestFilepath, JSON.stringify(diagnostics, null, 2));
    } catch (error) {
      console.error('📊 Error saving diagnostics:', error);
    }
  }
  
  /**
   * Get the latest diagnostics
   */
  getLatestDiagnostics(): SystemDiagnostics | null {
    try {
      const filepath = path.join(this.diagnosticsDir, 'latest-diagnostics.json');
      
      if (fs.existsSync(filepath)) {
        const data = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(data) as SystemDiagnostics;
      }
      
      return null;
    } catch (error) {
      console.error('📊 Error getting latest diagnostics:', error);
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
}

export const testHarness = new TestHarness();