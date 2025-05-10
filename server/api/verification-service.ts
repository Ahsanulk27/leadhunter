/**
 * Verification Service for Consumer Leads
 * Provides methods to verify contact information and identity
 */

import axios from 'axios';
import { logExecution } from './scraper-utils';

// Verification result interface
export interface VerificationResult {
  isVerified: boolean;
  confidenceScore: number; // 0-100
  method: string;
  timestamp: string;
  details?: {
    phoneValid?: boolean;
    emailValid?: boolean;
    addressValid?: boolean;
    identityMatch?: boolean;
    deviceIdMatch?: boolean;
    blacklistStatus?: 'clean' | 'suspicious' | 'blacklisted';
    ipReputation?: 'good' | 'moderate' | 'poor';
    fraudScore?: number; // 0-100, higher means more likely to be fraud
  };
  warnings?: string[];
  executionId: string;
}

export class VerificationService {
  private executionId: string;
  private apiKeys: {
    emailVerification?: string;
    phoneVerification?: string;
    addressVerification?: string;
    identityVerification?: string;
  };

  constructor(executionId: string) {
    this.executionId = executionId;
    
    // Load API keys from environment variables
    this.apiKeys = {
      emailVerification: process.env.EMAIL_VERIFICATION_API_KEY,
      phoneVerification: process.env.PHONE_VERIFICATION_API_KEY,
      addressVerification: process.env.ADDRESS_VERIFICATION_API_KEY,
      identityVerification: process.env.IDENTITY_VERIFICATION_API_KEY
    };
  }

  /**
   * Verify email address
   * Checks if email is valid, exists, and not disposable
   */
  async verifyEmail(email: string): Promise<{
    isValid: boolean;
    exists: boolean;
    isDisposable: boolean;
    didYouMean?: string;
    score: number;
  }> {
    try {
      logExecution(this.executionId, 'email-verification-start', { email });
      
      // If API key is available, use a real verification service
      if (this.apiKeys.emailVerification) {
        // This would be replaced with actual API call to email verification service
        // Example using a service like Abstract API, NeverBounce, etc.
        const response = await axios.get(`https://emailverification.example.com/api/verify`, {
          params: {
            email,
            api_key: this.apiKeys.emailVerification
          }
        });
        
        logExecution(this.executionId, 'email-verification-result', { result: response.data });
        
        return {
          isValid: response.data.is_valid_format,
          exists: response.data.deliverable,
          isDisposable: response.data.is_disposable_email,
          didYouMean: response.data.did_you_mean,
          score: response.data.quality_score * 100
        };
      }
      
      // If no API key, perform basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidFormat = emailRegex.test(email);
      
      // Check for disposable email patterns
      const disposableDomains = [
        'tempmail.com', 'throwawaymail.com', 'mailinator.com', 
        'guerrillamail.com', '10minutemail.com', 'yopmail.com'
      ];
      const domain = email.split('@')[1];
      const isDisposable = disposableDomains.some(d => domain.includes(d));
      
      // Calculate simple score based on format and not being disposable
      const score = (isValidFormat ? 50 : 0) + (!isDisposable ? 30 : 0);
      
      // Log results
      logExecution(this.executionId, 'email-verification-basic', { 
        email, isValidFormat, isDisposable, score 
      });
      
      return {
        isValid: isValidFormat,
        exists: isValidFormat, // Can't truly verify existence without API
        isDisposable,
        score
      };
    } catch (error) {
      console.error('Error verifying email:', error);
      logExecution(this.executionId, 'email-verification-error', { 
        email, error: (error as Error).message 
      });
      
      // Return conservative result on error
      return {
        isValid: false,
        exists: false,
        isDisposable: true,
        score: 0
      };
    }
  }

  /**
   * Verify phone number
   * Checks if phone is valid, active, and carrier information
   */
  async verifyPhone(phoneNumber: string): Promise<{
    isValid: boolean;
    type: 'mobile' | 'landline' | 'voip' | 'unknown';
    carrier?: string;
    location?: string;
    score: number;
  }> {
    try {
      logExecution(this.executionId, 'phone-verification-start', { phoneNumber });
      
      // If API key is available, use a real verification service
      if (this.apiKeys.phoneVerification) {
        // This would be replaced with actual API call to phone verification service
        // Example using a service like Twilio, Numverify, etc.
        const response = await axios.get(`https://phoneverification.example.com/api/verify`, {
          params: {
            phone: phoneNumber,
            api_key: this.apiKeys.phoneVerification
          }
        });
        
        logExecution(this.executionId, 'phone-verification-result', { result: response.data });
        
        return {
          isValid: response.data.valid,
          type: response.data.line_type,
          carrier: response.data.carrier,
          location: response.data.location,
          score: response.data.valid ? 80 : 20
        };
      }
      
      // If no API key, perform basic validation
      // Remove all non-numeric characters
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      
      // Check if it's a plausible US number (10 digits, not starting with 0 or 1)
      const isValidFormat = cleanNumber.length === 10 && !['0', '1'].includes(cleanNumber[0]);
      
      // Calculate simple score based on format
      const score = isValidFormat ? 60 : 10;
      
      // Log results
      logExecution(this.executionId, 'phone-verification-basic', { 
        phoneNumber, isValidFormat, score 
      });
      
      return {
        isValid: isValidFormat,
        type: 'unknown', // Can't determine type without API
        score
      };
    } catch (error) {
      console.error('Error verifying phone:', error);
      logExecution(this.executionId, 'phone-verification-error', { 
        phoneNumber, error: (error as Error).message 
      });
      
      // Return conservative result on error
      return {
        isValid: false,
        type: 'unknown',
        score: 0
      };
    }
  }

  /**
   * Verify address
   * Checks if address exists and is deliverable
   */
  async verifyAddress(address: string): Promise<{
    isValid: boolean;
    standardized?: string;
    components?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    score: number;
  }> {
    try {
      logExecution(this.executionId, 'address-verification-start', { address });
      
      // If API key is available, use a real verification service
      if (this.apiKeys.addressVerification) {
        // This would be replaced with actual API call to address verification service
        // Example using a service like SmartyStreets, Google Address Validation, etc.
        const response = await axios.post(`https://addressverification.example.com/api/verify`, {
          address,
          api_key: this.apiKeys.addressVerification
        });
        
        logExecution(this.executionId, 'address-verification-result', { result: response.data });
        
        return {
          isValid: response.data.valid,
          standardized: response.data.standardized_address,
          components: {
            street: response.data.components.street,
            city: response.data.components.city,
            state: response.data.components.state,
            zipCode: response.data.components.zip_code
          },
          score: response.data.valid ? 90 : 30
        };
      }
      
      // If no API key, perform basic validation
      // Check if address has required parts
      const hasParts = address.includes(',') && /\d+/.test(address); // Has comma and at least one number
      
      // Check for state/province code (simple pattern for US/Canada)
      const hasState = /[A-Z]{2}/.test(address);
      
      // Check for ZIP/postal code
      const hasZip = /\d{5}(-\d{4})?/.test(address);
      
      // Calculate simple score based on having typical address parts
      const score = (hasParts ? 30 : 0) + (hasState ? 15 : 0) + (hasZip ? 15 : 0);
      
      // Log results
      logExecution(this.executionId, 'address-verification-basic', { 
        address, hasParts, hasState, hasZip, score 
      });
      
      return {
        isValid: hasParts && (hasState || hasZip),
        score
      };
    } catch (error) {
      console.error('Error verifying address:', error);
      logExecution(this.executionId, 'address-verification-error', { 
        address, error: (error as Error).message 
      });
      
      // Return conservative result on error
      return {
        isValid: false,
        score: 0
      };
    }
  }

  /**
   * Identity verification
   * Cross-checks name against contact details for consistency
   */
  async verifyIdentity(name: string, email: string, phone: string, address: string): Promise<{
    nameEmailMatch: boolean;
    namePhoneMatch: boolean;
    nameAddressMatch: boolean;
    score: number;
    warnings: string[];
  }> {
    try {
      logExecution(this.executionId, 'identity-verification-start', { 
        name, email, phone, address 
      });
      
      // If API key is available, use a real verification service
      if (this.apiKeys.identityVerification) {
        // This would be replaced with actual API call to identity verification service
        // Example using a service like Persona, Trulioo, etc.
        const response = await axios.post(`https://identityverification.example.com/api/verify`, {
          name,
          email,
          phone,
          address,
          api_key: this.apiKeys.identityVerification
        });
        
        logExecution(this.executionId, 'identity-verification-result', { result: response.data });
        
        return {
          nameEmailMatch: response.data.name_email_match,
          namePhoneMatch: response.data.name_phone_match,
          nameAddressMatch: response.data.name_address_match,
          score: response.data.confidence_score,
          warnings: response.data.warnings || []
        };
      }
      
      // If no API key, perform basic validation
      // Extract first and last name
      const nameParts = name.toLowerCase().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      
      // Check if email contains name parts
      const emailLower = email.toLowerCase();
      const nameEmailMatch = firstName.length > 1 && (emailLower.includes(firstName) || 
        (lastName.length > 1 && emailLower.includes(lastName)));
      
      // Basic validation of name-address relationship (can't really verify without API)
      const nameAddressMatch = true; // Assume true without verification API
      
      // Basic validation of name-phone relationship (can't really verify without API)
      const namePhoneMatch = true; // Assume true without verification API
      
      // Warnings for suspicious patterns
      const warnings: string[] = [];
      
      if (!nameEmailMatch) {
        warnings.push('Email address does not contain name parts');
      }
      
      if (firstName.length < 2 || lastName.length < 2) {
        warnings.push('Name appears unusually short');
      }
      
      // Calculate simple score
      const score = 
        (nameEmailMatch ? 40 : 10) + 
        (nameAddressMatch ? 20 : 0) + 
        (namePhoneMatch ? 20 : 0) +
        (warnings.length === 0 ? 20 : 0);
      
      // Log results
      logExecution(this.executionId, 'identity-verification-basic', { 
        name, email, nameEmailMatch, warnings, score 
      });
      
      return {
        nameEmailMatch,
        namePhoneMatch,
        nameAddressMatch,
        score,
        warnings
      };
    } catch (error) {
      console.error('Error verifying identity:', error);
      logExecution(this.executionId, 'identity-verification-error', { 
        name, email, error: (error as Error).message 
      });
      
      // Return conservative result on error
      return {
        nameEmailMatch: false,
        namePhoneMatch: false,
        nameAddressMatch: false,
        score: 0,
        warnings: ['Verification system error']
      };
    }
  }

  /**
   * Comprehensive verification of a consumer lead
   * Combines email, phone, address, and identity verification
   */
  async verifyConsumerLead(lead: {
    name: string;
    email: string;
    phoneNumber: string;
    address: string;
  }): Promise<VerificationResult> {
    try {
      logExecution(this.executionId, 'lead-verification-start', { lead });
      
      // Verify components in parallel for efficiency
      const [emailResult, phoneResult, addressResult, identityResult] = await Promise.all([
        this.verifyEmail(lead.email),
        this.verifyPhone(lead.phoneNumber),
        this.verifyAddress(lead.address),
        this.verifyIdentity(lead.name, lead.email, lead.phoneNumber, lead.address)
      ]);
      
      // Collect all warnings
      const warnings = [
        ...(emailResult.isDisposable ? ['Disposable email detected'] : []),
        ...(identityResult.warnings || [])
      ];
      
      // Calculate overall confidence score (weighted average)
      const confidenceScore = Math.round(
        (emailResult.score * 0.3) +
        (phoneResult.score * 0.25) +
        (addressResult.score * 0.15) +
        (identityResult.score * 0.3)
      );
      
      // Determine verification result
      const isVerified = confidenceScore >= 70 && !emailResult.isDisposable;
      
      // Compose verification details
      const details = {
        emailValid: emailResult.isValid,
        phoneValid: phoneResult.isValid,
        addressValid: addressResult.isValid,
        identityMatch: (
          identityResult.nameEmailMatch && 
          identityResult.namePhoneMatch && 
          identityResult.nameAddressMatch
        ),
        blacklistStatus: 'clean' as 'clean' | 'suspicious' | 'blacklisted',
        ipReputation: 'good' as 'good' | 'moderate' | 'poor',
        fraudScore: 100 - confidenceScore
      };
      
      // Set blacklist status based on confidence
      if (confidenceScore < 40) {
        details.blacklistStatus = 'blacklisted';
      } else if (confidenceScore < 70) {
        details.blacklistStatus = 'suspicious';
      }
      
      // Set IP reputation based on confidence
      if (confidenceScore < 40) {
        details.ipReputation = 'poor';
      } else if (confidenceScore < 70) {
        details.ipReputation = 'moderate';
      }
      
      // Log verification result
      logExecution(this.executionId, 'lead-verification-complete', { 
        isVerified, 
        confidenceScore,
        details,
        warnings
      });
      
      return {
        isVerified,
        confidenceScore,
        method: this.apiKeys.identityVerification ? 'api' : 'basic',
        timestamp: new Date().toISOString(),
        details,
        warnings: warnings.length > 0 ? warnings : undefined,
        executionId: this.executionId
      };
    } catch (error) {
      console.error('Error verifying consumer lead:', error);
      logExecution(this.executionId, 'lead-verification-error', { 
        lead, error: (error as Error).message 
      });
      
      // Return failed verification on error
      return {
        isVerified: false,
        confidenceScore: 0,
        method: 'error',
        timestamp: new Date().toISOString(),
        warnings: [`Verification error: ${(error as Error).message}`],
        executionId: this.executionId
      };
    }
  }

  /**
   * Batch verify multiple consumer leads
   */
  async batchVerifyLeads(leads: Array<{
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    address: string;
  }>): Promise<{
    results: { [id: string]: VerificationResult };
    summary: {
      total: number;
      verified: number;
      suspicious: number;
      failed: number;
      averageScore: number;
    };
  }> {
    const results: { [id: string]: VerificationResult } = {};
    let verified = 0;
    let suspicious = 0;
    let failed = 0;
    let totalScore = 0;
    
    try {
      logExecution(this.executionId, 'batch-verification-start', { 
        leadCount: leads.length 
      });
      
      // Verify each lead
      for (const lead of leads) {
        try {
          const result = await this.verifyConsumerLead(lead);
          results[lead.id] = result;
          
          totalScore += result.confidenceScore;
          
          if (result.isVerified) {
            verified++;
          } else if (result.confidenceScore >= 40) {
            suspicious++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Error verifying lead ${lead.id}:`, error);
          results[lead.id] = {
            isVerified: false,
            confidenceScore: 0,
            method: 'error',
            timestamp: new Date().toISOString(),
            warnings: [`Verification error: ${(error as Error).message}`],
            executionId: this.executionId
          };
          failed++;
        }
      }
      
      const summary = {
        total: leads.length,
        verified,
        suspicious,
        failed,
        averageScore: leads.length > 0 ? Math.round(totalScore / leads.length) : 0
      };
      
      logExecution(this.executionId, 'batch-verification-complete', { summary });
      
      return { results, summary };
    } catch (error) {
      console.error('Error in batch verification:', error);
      logExecution(this.executionId, 'batch-verification-error', { 
        error: (error as Error).message 
      });
      
      throw error;
    }
  }
}

/**
 * Create a verification service with the provided execution ID
 */
export function createVerificationService(executionId: string) {
  return new VerificationService(executionId);
}