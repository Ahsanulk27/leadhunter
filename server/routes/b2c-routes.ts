/**
 * B2C Lead Generation Routes for NexLead
 */

import { Express } from 'express';
import { b2cSearchController } from '../controllers/b2c-search-controller';

export function registerB2CRoutes(app: Express) {
  console.log('📚 Registering B2C lead generation routes');
  
  // Single search endpoint
  app.post('/api/b2c/search', b2cSearchController.search.bind(b2cSearchController));
  
  // Batch search endpoint
  app.post('/api/b2c/batch-search', b2cSearchController.batchSearch.bind(b2cSearchController));
  
  // Batch status endpoint
  app.get('/api/b2c/batch-status/:batchId', b2cSearchController.checkBatchStatus.bind(b2cSearchController));
}