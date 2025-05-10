/**
 * Startup operations for the LeadHunter application
 * Handles initial health checks and self-testing
 */

import { testHarness } from './api/test-harness';

/**
 * Run startup operations asynchronously
 */
export async function runStartupOperations(): Promise<void> {
  console.log('🚀 Running startup operations for LeadHunter...');
  
  // Schedule test harness to run after a delay
  setTimeout(async () => {
    try {
      console.log('🧪 Running initial self-test...');
      const testResults = await testHarness.runAllTests();
      
      // Log test results summary
      console.log(`🧪 Self-test complete: ${
        testResults.test_results.passed_tests
      }/${
        testResults.test_results.total_tests
      } tests passed`);
      
      if (testResults.test_results.failed_tests > 0) {
        console.log(`⚠️ ${testResults.test_results.failed_tests} tests failed`);
        console.log(`📊 Diagnoses: ${JSON.stringify(testResults.diagnostics, null, 2)}`);
        
        if (testResults.fixes_applied && testResults.fixes_applied.length > 0) {
          console.log(`🔧 Applied fixes: ${testResults.fixes_applied.join(', ')}`);
          
          if (testResults.retest_results) {
            console.log(`🧪 Retest results: ${
              testResults.retest_results.passed_tests
            }/${
              testResults.retest_results.total_tests
            } tests passed after fixes`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error running startup test harness:', error);
    }
  }, 5000); // Wait 5 seconds for server to fully initialize
}

/**
 * Schedule periodic health checks
 */
export function schedulePeriodicHealthChecks(): void {
  // Run health check every 4 hours
  setInterval(async () => {
    console.log('🔄 Running periodic scraper health check...');
    
    try {
      const healthCheck = await testHarness.runAllTests();
      console.log(`🔄 Health check complete: ${
        healthCheck.test_results.passed_tests
      }/${
        healthCheck.test_results.total_tests
      } tests passed`);
    } catch (error) {
      console.error('❌ Error running periodic health check:', error);
    }
  }, 4 * 60 * 60 * 1000); // Every 4 hours
}