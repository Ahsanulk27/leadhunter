/**
 * Validation Controller
 * Handles lead validation requests
 */

import { Request, Response } from 'express';
import { createLeadValidator, ValidationResult, LeadData } from '../utils/lead-validator';
import { generateExecutionId } from '../api/scraper-utils';
import * as fs from 'fs';
import * as path from 'path';

// Directory for validation results
const VALIDATION_DIR = path.join(process.cwd(), 'validation_results');

export class ValidationController {
  constructor() {
    console.log('🔍 ValidationController: Initialized');
    
    // Create validation directory if it doesn't exist
    if (!fs.existsSync(VALIDATION_DIR)) {
      fs.mkdirSync(VALIDATION_DIR, { recursive: true });
    }
  }
  
  /**
   * Validate a single lead
   */
  async validateLead(req: Request, res: Response) {
    try {
      const lead = req.body;
      
      // Validate required fields
      if (!lead.name || !lead.phoneNumber || !lead.email || !lead.address || !lead.jobTitle) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, phoneNumber, email, address, and jobTitle are required'
        });
      }
      
      // Generate execution ID for this validation
      const executionId = generateExecutionId();
      console.log(`🔍 ValidationController: Starting validation ${executionId} for ${lead.name}`);
      
      // Create lead validator
      const validator = createLeadValidator(executionId);
      
      // Validate the lead
      const result = await validator.validateLead(lead);
      
      // Cache the result
      this.cacheValidationResult(result, lead.id, 'single');
      
      // Return the result
      res.json({
        success: true,
        executionId,
        validation: result
      });
    } catch (error: any) {
      console.error('Error validating lead:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Batch validate multiple leads
   */
  async batchValidateLeads(req: Request, res: Response) {
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
        if (!lead.id || !lead.name || !lead.email || !lead.phoneNumber || !lead.address || !lead.jobTitle) {
          return res.status(400).json({
            success: false,
            error: 'Each lead must have id, name, phoneNumber, email, address, and jobTitle fields'
          });
        }
      }
      
      // Generate execution ID for this batch validation
      const executionId = generateExecutionId();
      console.log(`🔍 ValidationController: Starting batch validation ${executionId} for ${leads.length} leads`);
      
      // Create lead validator
      const validator = createLeadValidator(executionId);
      
      // Validate the leads
      const result = await validator.batchValidateLeads(leads);
      
      // Cache the result
      this.cacheValidationResult({
        batchId: executionId,
        timestamp: new Date().toISOString(),
        summary: result.summary,
        results: result.results
      }, executionId, 'batch');
      
      // Return the result
      res.json({
        success: true,
        executionId,
        batchSize: leads.length,
        summary: result.summary,
        results: result.results
      });
    } catch (error: any) {
      console.error('Error batch validating leads:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Upload a file for validation (CSV)
   */
  async validateFile(req: Request, res: Response) {
    try {
      // This would handle file uploads and validation
      // For now, we'll return a not implemented response
      res.status(501).json({
        success: false,
        error: 'File validation not implemented yet'
      });
    } catch (error: any) {
      console.error('Error validating file:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get validation settings
   */
  getValidationSettings(req: Request, res: Response) {
    try {
      // Return current validation settings
      res.json({
        success: true,
        settings: {
          publicRecordsEnabled: !!process.env.PUBLIC_RECORDS_API_KEY,
          phoneVerificationEnabled: !!process.env.PHONE_VERIFICATION_API_KEY,
          emailVerificationEnabled: !!process.env.EMAIL_VERIFICATION_API_KEY,
          addressVerificationEnabled: !!process.env.ADDRESS_VERIFICATION_API_KEY,
          jobTitleVerificationEnabled: !!process.env.JOB_TITLE_VERIFICATION_API_KEY,
          minimumConfidenceScore: 70,
          autoRejectDisposableEmails: true
        }
      });
    } catch (error: any) {
      console.error('Error getting validation settings:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Update validation settings
   */
  updateValidationSettings(req: Request, res: Response) {
    try {
      // This would update validation settings
      // For now, we'll return a not implemented response
      res.status(501).json({
        success: false,
        error: 'Updating validation settings not implemented yet'
      });
    } catch (error: any) {
      console.error('Error updating validation settings:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Cache validation result
   */
  private cacheValidationResult(result: any, id: string, type: 'single' | 'batch') {
    try {
      const filename = `${type}-validation-${id}.json`;
      const filepath = path.join(VALIDATION_DIR, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
      console.log(`Cached ${type} validation result to ${filepath}`);
    } catch (error) {
      console.error(`Error caching ${type} validation result:`, error);
    }
  }
  
  /**
   * Get cached validation result
   */
  getCachedValidation(req: Request, res: Response) {
    try {
      const { id, type } = req.params;
      
      if (!id || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters'
        });
      }
      
      const filename = `${type}-validation-${id}.json`;
      const filepath = path.join(VALIDATION_DIR, filename);
      
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({
          success: false,
          error: 'Validation result not found'
        });
      }
      
      const data = fs.readFileSync(filepath, 'utf-8');
      const result = JSON.parse(data);
      
      res.json({
        success: true,
        validation: result
      });
    } catch (error: any) {
      console.error('Error getting cached validation:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

// Export singleton instance
export const validationController = new ValidationController();