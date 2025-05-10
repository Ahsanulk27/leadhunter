/**
 * Validation Routes for NexLead Hunter
 * Routes for validating lead data
 */

import { Express } from 'express';
import { validationController } from '../controllers/validation-controller';

export function registerValidationRoutes(app: Express) {
  console.log('📚 Registering validation routes');
  
  // Single lead validation
  app.post('/api/validate/lead', validationController.validateLead.bind(validationController));
  
  // Batch lead validation
  app.post('/api/validate/batch', validationController.batchValidateLeads.bind(validationController));
  
  // File validation (CSV)
  app.post('/api/validate/file', validationController.validateFile.bind(validationController));
  
  // Validation settings
  app.get('/api/validate/settings', validationController.getValidationSettings.bind(validationController));
  app.put('/api/validate/settings', validationController.updateValidationSettings.bind(validationController));
  
  // Get cached validation result
  app.get('/api/validate/result/:type/:id', validationController.getCachedValidation.bind(validationController));
}