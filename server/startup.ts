/**
 * Startup operations for the NexLead application
 * Handles initial health checks and self-testing
 */

import { simplifiedSelfTest } from './api/simplified-self-test';
import { google } from 'googleapis';

/**
 * Run startup operations asynchronously
 */
export async function runStartupOperations(): Promise<void> {
  console.log('🚀 Running startup operations for NexLead...');
  
  // Initialize Google API client
  initializeGoogleClient();
  
  // Run self-tests to verify system functionality
  await runStartupTests();
}

/**
 * Initialize Google API client with API key
 */
function initializeGoogleClient(): void {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ Google API Key not found in environment variables');
      return;
    }
    
    // Initialize Google Sheets API
    const sheets = google.sheets({ version: 'v4', auth: apiKey });
    
    // Quick validation of API key by calling a simple endpoint
    sheets.spreadsheets.get({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'  // Example Sheet ID from Google API docs
    }, (err) => {
      if (err) {
        console.warn(`⚠️ Google API Key validation failed: ${err.message}`);
      } else {
        console.log('✅ Google API Key validated successfully');
      }
    });
    
    console.log('✅ Google Sheets API initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Google client:', error);
  }
}

/**
 * Run startup tests to verify system functionality
 */
async function runStartupTests(): Promise<void> {
  try {
    // Run self-test suite
    const testResults = await simplifiedSelfTest.runAllTests();
    
    console.log(`🧪 Startup tests completed: ${testResults.passed_tests}/${testResults.total_tests} tests passed`);
    
    if (testResults.failed_tests > 0) {
      console.warn('⚠️ Some startup tests failed. The system may not be fully operational.');
    }
  } catch (error) {
    console.error('❌ Startup tests failed:', error);
  }
}

/**
 * Schedule periodic health checks
 */
export function schedulePeriodicHealthChecks(): void {
  console.log('⏰ Scheduling periodic health checks...');
  
  // Run health check every 30 minutes
  setInterval(async () => {
    try {
      // Run a lightweight self-test
      await simplifiedSelfTest.runAllTests();
      
      console.log('🔄 Periodic health check completed');
    } catch (error) {
      console.error('❌ Periodic health check failed:', error);
    }
  }, 30 * 60 * 1000); // 30 minutes
}