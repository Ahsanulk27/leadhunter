/**
 * Verification Routes for NexLead Hunter
 * Routes for verifying consumer leads
 */

import { Express } from 'express';
import { verificationController } from '../controllers/verification-controller';

export function registerVerificationRoutes(app: Express) {
  console.log('📚 Registering verification routes');
  
  // Single lead verification
  app.post('/api/verify/lead', verificationController.verifySingleLead.bind(verificationController));
  
  // Batch lead verification
  app.post('/api/verify/batch', verificationController.verifyBatchLeads.bind(verificationController));
  
  // File verification (CSV)
  app.post('/api/verify/file', verificationController.verifyFile.bind(verificationController));
  
  // Verification settings
  app.get('/api/verify/settings', verificationController.getVerificationSettings.bind(verificationController));
  app.put('/api/verify/settings', verificationController.updateVerificationSettings.bind(verificationController));
  
  // Get cached verification result
  app.get('/api/verify/result/:type/:id', verificationController.getCachedVerification.bind(verificationController));
}