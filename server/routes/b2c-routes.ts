/**
 * B2C lead scraping routes for Lead Hunter
 * Handles B2C-specific lead generation requests
 */

import { Router, Request, Response, Express } from 'express';
import { b2cSearchController } from '../controllers/b2c-search-controller';
import { v4 as uuidv4 } from 'uuid';
import { SearchParams } from '../models/business-data';
import { batchScraper } from '../api/batch-scraper';
// @ts-ignore - XLSX module types are not required for functionality
import * as XLSX from 'xlsx';

export async function registerB2CRoutes(app: Express) {
  const router = Router();
  
  // Create a new B2C lead search
  router.post('/search', async (req: Request, res: Response) => {
    try {
      const searchParams: SearchParams = {
        query: req.body.query || '',
        location: req.body.location,
        maxResults: parseInt(req.body.maxResults) || 25,
        minRating: parseFloat(req.body.minRating) || 0,
        onlyDecisionMakers: req.body.onlyDecisionMakers === 'true' || req.body.onlyDecisionMakers === true,
        useProxies: req.body.useProxies !== 'false' && req.body.useProxies !== false,
        saveHtml: req.body.saveHtml === 'true' || req.body.saveHtml === true,
        delayMin: parseInt(req.body.delayMin) || 2000,
        delayMax: parseInt(req.body.delayMax) || 5000
      };
      
      // Generate a unique session ID for this search if not provided
      const sessionId = req.body.sessionId || uuidv4();
      
      console.log(`🔍 B2C Search Request: '${searchParams.query}' in ${searchParams.location || 'all locations'}`);
      
      // Execute the search
      const result = await b2cSearchController.search(searchParams, sessionId);
      
      // Return the result with the session ID
      res.json({
        ...result,
        sessionId,
        type: 'b2c'
      });
    } catch (error) {
      console.error('Error in B2C search:', error);
      res.status(500).json({ 
        error: 'Failed to execute B2C search',
        message: (error as Error).message
      });
    }
  });
  
  // Get proxy statistics for a session
  router.get('/proxy-stats/:sessionId', (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const stats = b2cSearchController.getProxyStats(sessionId);
      res.json(stats);
    } catch (error) {
      console.error('Error getting proxy stats:', error);
      res.status(500).json({ error: 'Failed to get proxy statistics' });
    }
  });
  
  // Check health of all proxies in a session
  router.get('/proxy-health/:sessionId', async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const health = await b2cSearchController.checkProxyHealth(sessionId);
      res.json(health);
    } catch (error) {
      console.error('Error checking proxy health:', error);
      res.status(500).json({ error: 'Failed to check proxy health' });
    }
  });
  
  // Export B2C leads to CSV
  router.post('/export', (req: Request, res: Response) => {
    try {
      const businesses = req.body.businesses || [];
      
      if (businesses.length === 0) {
        return res.status(400).json({ error: 'No businesses to export' });
      }
      
      // Generate CSV headers
      const csvHeaders = [
        'Business Name',
        'Address',
        'Phone',
        'Email',
        'Website',
        'Category',
        'Rating',
        'Contact Name',
        'Contact Position',
        'Contact Email',
        'Contact Phone',
        'Is Decision Maker',
        'Source'
      ].join(',');
      
      // Generate CSV rows
      const csvRows = [csvHeaders];
      
      businesses.forEach((business: any) => {
        // If business has contacts, create a row for each contact
        if (business.contacts && business.contacts.length > 0) {
          business.contacts.forEach((contact: any) => {
            csvRows.push([
              `"${(business.name || '').replace(/"/g, '""')}"`,
              `"${(business.address || '').replace(/"/g, '""')}"`,
              `"${(business.phoneNumber || '').replace(/"/g, '""')}"`,
              `"${(business.email || '').replace(/"/g, '""')}"`,
              `"${(business.website || '').replace(/"/g, '""')}"`,
              `"${(business.category || '').replace(/"/g, '""')}"`,
              `"${business.rating || ''}"`,
              `"${(contact.name || '').replace(/"/g, '""')}"`,
              `"${(contact.position || '').replace(/"/g, '""')}"`,
              `"${(contact.email || '').replace(/"/g, '""')}"`,
              `"${(contact.phoneNumber || '').replace(/"/g, '""')}"`,
              `"${contact.isDecisionMaker ? 'Yes' : 'No'}"`,
              `"${(business.source || '').replace(/"/g, '""')}"` 
            ].join(','));
          });
        } else {
          // Otherwise create a single row for the business
          csvRows.push([
            `"${(business.name || '').replace(/"/g, '""')}"`,
            `"${(business.address || '').replace(/"/g, '""')}"`,
            `"${(business.phoneNumber || '').replace(/"/g, '""')}"`,
            `"${(business.email || '').replace(/"/g, '""')}"`,
            `"${(business.website || '').replace(/"/g, '""')}"`,
            `"${(business.category || '').replace(/"/g, '""')}"`,
            `"${business.rating || ''}"`,
            `""`,
            `""`,
            `""`,
            `""`,
            `""`,
            `"${(business.source || '').replace(/"/g, '""')}"`
          ].join(','));
        }
      });
      
      // Create CSV content
      const csvContent = csvRows.join('\n');
      
      // Send the CSV
      res.send(csvContent);
    } catch (error) {
      console.error('Error in B2C export endpoint:', error);
      res.status(500).json({ error: 'Failed to generate B2C export' });
    }
  });
  
  // Batch scraping endpoint
  router.post('/batch', async (req: Request, res: Response) => {
    try {
      const { services, locations, options } = req.body;
      
      if (!services || !Array.isArray(services) || services.length === 0) {
        return res.status(400).json({ error: 'Services array is required' });
      }
      
      if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ error: 'Locations array is required' });
      }
      
      console.log(`🔍 Batch B2C Search Request: ${services.length} services across ${locations.length} locations`);
      
      // Start batch process asynchronously so we can return immediately
      const batchPromise = batchScraper.runBatch(services, locations, options || {});
      
      // Return immediately with a job ID
      const batchId = uuidv4();
      res.json({
        message: 'Batch search started',
        batchId,
        services,
        locations,
        totalJobs: services.length * locations.length,
        estimatedTime: (services.length * locations.length * 30) + ' seconds' // Rough estimate
      });
      
      // Process batch in the background
      batchPromise
        .then(results => {
          console.log(`✅ Batch B2C Search completed: ${results.length} jobs processed`);
        })
        .catch(error => {
          console.error(`❌ Batch B2C Search error: ${error.message}`);
        });
    } catch (error) {
      console.error('Error in batch B2C search:', error);
      res.status(500).json({ 
        error: 'Failed to execute batch B2C search',
        message: (error as Error).message
      });
    }
  });
  
  // Register the router at /api/b2c path
  app.use('/api/b2c', router);
  
  console.log('✓ B2C lead routes registered');
}