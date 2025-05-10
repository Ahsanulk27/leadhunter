/**
 * Consumer Lead Verification Controller
 * Handles requests to verify consumer leads
 */

import { Request, Response } from 'express';
import { 
  createVerificationService, 
  VerificationResult 
} from '../api/verification-service';
import { generateExecutionId } from '../api/scraper-utils';
import * as fs from 'fs';
import * as path from 'path';

// Directory for verification results
const VERIFICATION_DIR = path.join(process.cwd(), 'verification_results');

export class VerificationController {
  constructor() {
    console.log('🔍 VerificationController: Initialized');
    
    // Create verification directory if it doesn't exist
    if (!fs.existsSync(VERIFICATION_DIR)) {
      fs.mkdirSync(VERIFICATION_DIR, { recursive: true });
    }
  }
  
  /**
   * Verify a single consumer lead
   */
  async verifySingleLead(req: Request, res: Response) {
    try {
      const { name, email, phoneNumber, address } = req.body;
      
      // Validate required fields
      if (!name || !email || !phoneNumber || !address) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }
      
      // Generate execution ID for this verification
      const executionId = generateExecutionId();
      console.log(`🔍 VerificationController: Starting verification ${executionId} for ${name}`);
      
      // Create verification service
      const verificationService = createVerificationService(executionId);
      
      // Verify the lead
      const result = await verificationService.verifyConsumerLead({
        name,
        email,
        phoneNumber,
        address
      });
      
      // Cache the result
      this.cacheVerificationResult(result, 'single');
      
      // Return the result
      res.json({
        success: true,
        executionId,
        verification: result
      });
    } catch (error: any) {
      console.error('Error verifying consumer lead:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Verify a batch of consumer leads
   */
  async verifyBatchLeads(req: Request, res: Response) {
    try {
      const { leads } = req.body;
      
      // Validate leads array
      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid leads array'
        });
      }
      
      // Validate lead objects
      for (const lead of leads) {
        if (!lead.id || !lead.name || !lead.email || !lead.phoneNumber || !lead.address) {
          return res.status(400).json({
            success: false,
            error: 'Each lead must have id, name, email, phoneNumber, and address fields'
          });
        }
      }
      
      // Generate execution ID for this batch verification
      const executionId = generateExecutionId();
      console.log(`🔍 VerificationController: Starting batch verification ${executionId} for ${leads.length} leads`);
      
      // Create verification service
      const verificationService = createVerificationService(executionId);
      
      // Verify the leads
      const result = await verificationService.batchVerifyLeads(leads);
      
      // Cache the result
      this.cacheVerificationResult({
        batchId: executionId,
        timestamp: new Date().toISOString(),
        summary: result.summary,
        results: result.results
      }, 'batch');
      
      // Return the result
      res.json({
        success: true,
        executionId,
        batchSize: leads.length,
        summary: result.summary,
        results: result.results
      });
    } catch (error: any) {
      console.error('Error verifying consumer leads batch:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Upload a file for verification (CSV)
   */
  async verifyFile(req: Request, res: Response) {
    try {
      // This would handle file uploads and verification
      // For now, we'll return a not implemented response
      res.status(501).json({
        success: false,
        error: 'File verification not implemented yet'
      });
    } catch (error: any) {
      console.error('Error verifying file:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get verification settings
   */
  getVerificationSettings(req: Request, res: Response) {
    try {
      // Return current verification settings
      res.json({
        success: true,
        settings: {
          emailVerificationEnabled: !!process.env.EMAIL_VERIFICATION_API_KEY,
          phoneVerificationEnabled: !!process.env.PHONE_VERIFICATION_API_KEY,
          addressVerificationEnabled: !!process.env.ADDRESS_VERIFICATION_API_KEY,
          identityVerificationEnabled: !!process.env.IDENTITY_VERIFICATION_API_KEY,
          minimumConfidenceScore: 70,
          autoRejectDisposableEmails: true,
          verifyBeforeSaving: true
        }
      });
    } catch (error: any) {
      console.error('Error getting verification settings:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Update verification settings
   */
  updateVerificationSettings(req: Request, res: Response) {
    try {
      // This would update verification settings
      // For now, we'll return a not implemented response
      res.status(501).json({
        success: false,
        error: 'Updating verification settings not implemented yet'
      });
    } catch (error: any) {
      console.error('Error updating verification settings:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Cache verification result
   */
  private cacheVerificationResult(result: any, type: 'single' | 'batch') {
    try {
      const id = result.executionId || result.batchId;
      const filename = `${type}-verification-${id}.json`;
      const filepath = path.join(VERIFICATION_DIR, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
      console.log(`Cached ${type} verification result to ${filepath}`);
    } catch (error) {
      console.error(`Error caching ${type} verification result:`, error);
    }
  }
  
  /**
   * Get cached verification result
   */
  getCachedVerification(req: Request, res: Response) {
    try {
      const { id, type } = req.params;
      
      if (!id || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters'
        });
      }
      
      const filename = `${type}-verification-${id}.json`;
      const filepath = path.join(VERIFICATION_DIR, filename);
      
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({
          success: false,
          error: 'Verification result not found'
        });
      }
      
      const data = fs.readFileSync(filepath, 'utf-8');
      const result = JSON.parse(data);
      
      res.json({
        success: true,
        verification: result
      });
    } catch (error: any) {
      console.error('Error getting cached verification:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

// Export singleton instance
export const verificationController = new VerificationController();