/**
 * Startup operations for the NexLead application
 * Handles initial health checks and self-testing
 */

import { testHarness } from './api/test-harness';
import { googleSheetsService } from './api/google-sheets-service';

/**
 * Run startup operations asynchronously
 */
export async function runStartupOperations(): Promise<void> {
  console.log('🚀 Running startup operations for NexLead...');
  
  try {
    // Check Google Sheets API status
    if (process.env.GOOGLE_API_KEY) {
      const isValid = await googleSheetsService.checkApiKeyValidity();
      console.log(`📊 Google Sheets API Key: ${isValid ? 'Valid' : 'Invalid'}`);
    } else {
      console.log('⚠️ Google Sheets API Key not found, export functionality will be limited');
    }
    
    // Run all tests to verify system is operational
    setTimeout(async () => {
      try {
        console.log('🧪 Running startup test harness...');
        const diagnostics = await testHarness.runAllTests();
        console.log(`🧪 Startup tests completed: ${diagnostics.passed_tests}/${diagnostics.passed_tests + diagnostics.failed_tests} tests passed`);
      } catch (error) {
        console.error('❌ Error running startup test harness:', error);
      }
    }, 5000);
    
    console.log('✅ Startup operations completed successfully');
  } catch (error) {
    console.error('❌ Error during startup operations:', error);
  }
}

/**
 * Schedule periodic health checks
 */
export function schedulePeriodicHealthChecks(): void {
  // Run health checks every hour
  setInterval(async () => {
    try {
      console.log('🔍 Running periodic health check...');
      await testHarness.runAllTests();
    } catch (error) {
      console.error('❌ Error during periodic health check:', error);
    }
  }, 60 * 60 * 1000); // Every hour
}