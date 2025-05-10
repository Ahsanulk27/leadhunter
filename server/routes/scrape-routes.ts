/**
 * Scraping routes for the NexLead application
 * Handles business data scraping requests and integrates with the search controller
 */

import { Router, Request, Response } from 'express';
import { searchController } from '../controllers/search-controller';
import { simplifiedSelfTest } from '../api/simplified-self-test';
import { testHarness } from '../api/test-harness';
import { googleSheetsService } from '../api/google-sheets-service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Endpoint to search for business data
 * Supports query parameters:
 * - query: The search query (e.g., "plumbers", "property management")
 * - location: The location to search in (e.g., "New York", "Los Angeles, CA")
 * - page: Page number for pagination (default: 1)
 * - limit: Number of results per page (default: 20)
 */
router.get('/api/scrape', async (req: Request, res: Response) => {
  try {
    const { 
      query, 
      industry, 
      location, 
      page = '1', 
      limit = '20', 
      export_to_sheets = 'false'
    } = req.query;
    
    // If no query or industry is provided, use both parameters
    const searchQuery = query || industry || '';
    
    if (!searchQuery) {
      return res.status(400).json({
        error: 'Missing query parameter',
        error_code: 'MISSING_QUERY',
        timestamp: new Date().toISOString(),
        request_id: uuidv4()
      });
    }
    
    console.log(`🔍 Received scraping request: Query=${searchQuery}, Location=${location}, Page=${page}, Limit=${limit}`);
    
    // Run the search
    const result = await searchController.searchBusinessData({
      query: searchQuery.toString(),
      location: location?.toString(),
      page: parseInt(page.toString(), 10),
      limit: parseInt(limit.toString(), 10)
    }, {
      logExecutionDetails: true
    });
    
    if ('error' in result) {
      return res.status(404).json(result);
    }
    
    // Export to Google Sheets if requested and API key is available
    if (export_to_sheets === 'true' && process.env.GOOGLE_API_KEY) {
      if (result.businesses.length > 0) {
        try {
          const sheetsResult = await googleSheetsService.createSheetWithBusinessData(
            `${searchQuery} ${location || ''}`.trim(),
            result.businesses
          );
          
          if (sheetsResult.success && sheetsResult.spreadsheetUrl) {
            result.meta['google_sheets_url'] = sheetsResult.spreadsheetUrl;
          }
        } catch (error) {
          console.error('❌ Error exporting to Google Sheets:', error);
        }
      }
    }
    
    return res.json(result);
  } catch (error) {
    console.error('❌ Error in /scrape endpoint:', error);
    
    return res.status(500).json({
      error: 'An unexpected error occurred',
      error_code: 'SERVER_ERROR',
      timestamp: new Date().toISOString(),
      request_id: uuidv4(),
      details: {
        message: (error as Error).message
      }
    });
  }
});

/**
 * Endpoint to run self-tests
 */
router.get('/api/self-test', async (req: Request, res: Response) => {
  try {
    const testResults = await simplifiedSelfTest.runAllTests();
    return res.json(testResults);
  } catch (error) {
    console.error('❌ Error in /self-test endpoint:', error);
    
    return res.status(500).json({
      error: 'Failed to run self-tests',
      error_code: 'TEST_ERROR',
      timestamp: new Date().toISOString(),
      request_id: uuidv4(),
      details: {
        message: (error as Error).message
      }
    });
  }
});

/**
 * Endpoint to get system diagnostics
 */
router.get('/api/diagnostics', async (req: Request, res: Response) => {
  try {
    const diagnostics = testHarness.getLatestDiagnostics();
    
    if (!diagnostics) {
      // Run the tests to generate diagnostics
      const newDiagnostics = await testHarness.runAllTests();
      return res.json(newDiagnostics);
    }
    
    return res.json(diagnostics);
  } catch (error) {
    console.error('❌ Error in /diagnostics endpoint:', error);
    
    return res.status(500).json({
      error: 'Failed to get system diagnostics',
      error_code: 'DIAGNOSTICS_ERROR',
      timestamp: new Date().toISOString(),
      request_id: uuidv4(),
      details: {
        message: (error as Error).message
      }
    });
  }
});

/**
 * Endpoint to check Google Sheets API status
 */
router.get('/api/sheets-status', async (req: Request, res: Response) => {
  try {
    const isValid = await googleSheetsService.checkApiKeyValidity();
    
    return res.json({
      status: isValid ? 'valid' : 'invalid',
      has_key: !!process.env.GOOGLE_API_KEY,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in /sheets-status endpoint:', error);
    
    return res.status(500).json({
      error: 'Failed to check Google Sheets API status',
      error_code: 'SHEETS_ERROR',
      timestamp: new Date().toISOString(),
      request_id: uuidv4(),
      details: {
        message: (error as Error).message
      }
    });
  }
});

export default router;