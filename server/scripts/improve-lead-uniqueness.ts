#!/usr/bin/env ts-node
/**
 * Lead Uniqueness Improvement Script
 * 
 * This script enhances lead generation by:
 * 1. Enforcing business-level uniqueness across search results
 * 2. Limiting contacts per company to 1 primary contact
 * 3. Prioritizing multiple companies over multiple contacts
 * 4. Logging skipped duplicate companies for review
 */

import { BusinessData } from '../models/business-data';
import { v4 as uuidv4 } from 'uuid';

// ======== BUSINESS UNIQUENESS ENFORCEMENT ========

/**
 * Helper class for tracking and enforcing business uniqueness
 */
export class BusinessUniquenessTracker {
  // Keyed by domain and phone number
  private seenBusinessPhoneNumbers = new Set<string>();
  private seenBusinessWebsites = new Set<string>();
  private seenBusinessNames = new Map<string, string>(); // Map of name to ID
  private skippedDuplicates: BusinessData[] = [];
  
  /**
   * Check if a business is a likely duplicate of one we've seen before
   */
  public isDuplicate(business: BusinessData): boolean {
    // Skip duplicates based on exact phone number match
    if (business.phoneNumber && business.phoneNumber.length > 5) {
      const normalizedPhone = this.normalizePhone(business.phoneNumber);
      if (this.seenBusinessPhoneNumbers.has(normalizedPhone)) {
        return true;
      }
    }
    
    // Skip duplicates based on website domain
    if (business.website) {
      try {
        const domain = new URL(business.website).hostname;
        if (this.seenBusinessWebsites.has(domain)) {
          return true;
        }
      } catch (e) {
        // Invalid URL, skip domain check
      }
    }
    
    // Check for very similar business names (potential franchises at different locations)
    if (business.name) {
      const normalizedName = business.name.toLowerCase().trim();
      // Check all similar names
      const entries = Array.from(this.seenBusinessNames.entries());
      for (let i = 0; i < entries.length; i++) {
        const [existingName, id] = entries[i];
        // Similar name but different location may be a branch/franchise
        if (this.areSimilarNames(normalizedName, existingName.toLowerCase()) &&
            !this.areDifferentLocations(business, id)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Track a business to prevent future duplicates
   */
  public trackBusiness(business: BusinessData): void {
    // Track phone number
    if (business.phoneNumber && business.phoneNumber.length > 5) {
      this.seenBusinessPhoneNumbers.add(this.normalizePhone(business.phoneNumber));
    }
    
    // Track website domain
    if (business.website) {
      try {
        const domain = new URL(business.website).hostname;
        this.seenBusinessWebsites.add(domain);
      } catch (e) {
        // Invalid URL, skip tracking
      }
    }
    
    // Track business name
    if (business.name) {
      this.seenBusinessNames.set(business.name.toLowerCase().trim(), business.id);
    }
  }
  
  /**
   * Log a skipped duplicate for review
   */
  public trackSkippedDuplicate(business: BusinessData): void {
    this.skippedDuplicates.push(business);
  }
  
  /**
   * Get all skipped duplicates for reporting
   */
  public getSkippedDuplicates(): BusinessData[] {
    return this.skippedDuplicates;
  }
  
  /**
   * Normalize phone number for consistent comparison
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
  
  /**
   * Check if two business names are similar enough to be the same business
   */
  private areSimilarNames(name1: string, name2: string): boolean {
    // Handle exact match
    if (name1 === name2) return true;
    
    // Check if one name contains the other
    if (name1.includes(name2) || name2.includes(name1)) return true;
    
    // Ignore common suffixes and prefixes
    const commonTerms = ['llc', 'inc', 'corporation', 'corp', 'limited', 'ltd', 'group', 
                         'services', 'company', 'co', 'associates', 'team', 'realty', 
                         'properties', 'property', 'management', 'solutions'];
    
    const cleanName1 = name1.split(' ')
      .filter(word => !commonTerms.includes(word))
      .join(' ');
      
    const cleanName2 = name2.split(' ')
      .filter(word => !commonTerms.includes(word))
      .join(' ');
    
    return cleanName1 === cleanName2;
  }
  
  /**
   * Check if businesses are at different locations despite similar names
   */
  private areDifferentLocations(business: BusinessData, existingId: string): boolean {
    // This would require data from the previous business, which we don't track
    // In a real implementation, we'd check for different addresses
    return false;
  }
}

// ======== CONTACT OPTIMIZATION ========

/**
 * Optimize contacts for a business - select only the best contact
 */
export function optimizeBusinessContacts(business: BusinessData): BusinessData {
  if (!business.contacts || business.contacts.length <= 1) {
    return business;
  }
  
  // Filter for decision makers first
  const decisionMakers = business.contacts.filter(contact => contact.isDecisionMaker);
  
  // Select the best contact
  let selectedContact;
  if (decisionMakers.length > 0) {
    // Choose highest ranking decision maker by position
    selectedContact = getBestContactByPosition(decisionMakers);
  } else {
    // No decision makers, choose the best contact by position
    selectedContact = getBestContactByPosition(business.contacts);
  }
  
  // Set the primary contact flag
  selectedContact.isPrimary = true;
  
  // Create a new business with just one contact
  const optimizedBusiness: BusinessData = {
    ...business,
    contacts: [selectedContact]
  };
  
  return optimizedBusiness;
}

/**
 * Get the best contact by position/title importance
 */
function getBestContactByPosition(contacts: any[]): any {
  // Define position priority (higher score = more important)
  const positionScores: { [key: string]: number } = {
    'ceo': 100,
    'president': 95,
    'owner': 90,
    'founder': 85,
    'chief': 80,
    'cto': 75,
    'cfo': 75,
    'coo': 75,
    'director': 70,
    'managing': 65,
    'partner': 60,
    'principal': 55,
    'vice president': 50,
    'vp': 50,
    'manager': 45,
    'head': 40,
    'lead': 35,
    'senior': 30,
    'associate': 25,
    'agent': 20,
    'representative': 15,
    'specialist': 10,
    'coordinator': 5
  };
  
  // Score each contact
  const scoredContacts = contacts.map(contact => {
    let score = 0;
    const position = (contact.position || '').toLowerCase();
    
    // Add scores for each matching term
    Object.entries(positionScores).forEach(([term, value]) => {
      if (position.includes(term)) {
        score += value;
      }
    });
    
    // Bonus for having email
    if (contact.email && contact.email.length > 0) {
      score += 15;
    }
    
    // Bonus for having phone
    if (contact.phoneNumber && contact.phoneNumber.length > 0) {
      score += 10;
    }
    
    return {
      contact,
      score
    };
  });
  
  // Sort by score descending
  scoredContacts.sort((a, b) => b.score - a.score);
  
  // Return the highest scoring contact
  return scoredContacts[0].contact;
}

// ======== SEARCH RESULTS PROCESSING ========

/**
 * Process search results to enforce uniqueness and optimize contacts
 */
export function processSearchResults(results: BusinessData[]): {
  businesses: BusinessData[],
  skippedDuplicates: BusinessData[],
  stats: {
    initialCount: number,
    finalCount: number,
    duplicatesSkipped: number,
    contactsRemoved: number
  }
} {
  if (!results || results.length === 0) {
    return {
      businesses: [],
      skippedDuplicates: [],
      stats: {
        initialCount: 0,
        finalCount: 0,
        duplicatesSkipped: 0, 
        contactsRemoved: 0
      }
    };
  }
  
  const initialContactCount = results.reduce((sum, business) => 
    sum + (business.contacts?.length || 0), 0);
    
  const tracker = new BusinessUniquenessTracker();
  const optimizedBusinesses: BusinessData[] = [];
  
  // Process each business
  for (const business of results) {
    // Skip duplicates
    if (tracker.isDuplicate(business)) {
      tracker.trackSkippedDuplicate(business);
      continue;
    }
    
    // Optimize contacts - keep only the best contact
    const optimizedBusiness = optimizeBusinessContacts(business);
    
    // Track for future duplicate detection
    tracker.trackBusiness(optimizedBusiness);
    
    // Add to results
    optimizedBusinesses.push(optimizedBusiness);
  }
  
  const skippedDuplicates = tracker.getSkippedDuplicates();
  const finalContactCount = optimizedBusinesses.reduce((sum, business) => 
    sum + (business.contacts?.length || 0), 0);
    
  // Return processed results with stats
  return {
    businesses: optimizedBusinesses,
    skippedDuplicates,
    stats: {
      initialCount: results.length,
      finalCount: optimizedBusinesses.length,
      duplicatesSkipped: skippedDuplicates.length,
      contactsRemoved: initialContactCount - finalContactCount
    }
  };
}

// Function to run the script directly (not used in imports)
export function runAsScript(): void {
  console.log('⚙️ Running lead uniqueness improvement script');
  console.log('This script should be imported and used by the API service.');
  console.log('Sample usage:');
  console.log(`
  import { processSearchResults } from './scripts/improve-lead-uniqueness';
  
  // In your API route
  const rawResults = await googlePlacesService.searchBusinesses(query, location);
  const { 
    businesses, 
    skippedDuplicates, 
    stats 
  } = processSearchResults(rawResults.businesses);
  
  console.log(\`Processed \${stats.initialCount} businesses, \${stats.duplicatesSkipped} duplicates removed\`);
  console.log(\`\${stats.contactsRemoved} unnecessary contacts removed\`);
  `);
}