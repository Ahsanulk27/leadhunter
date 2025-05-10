/**
 * Business data models for the NexLead application
 * Contains all types and interfaces related to business and contact data
 */

/**
 * Contact information associated with a business
 */
export interface Contact {
  contactId: string;
  name: string;
  position?: string;
  email?: string;
  phoneNumber?: string;
  isDecisionMaker?: boolean;
  companyName: string;
  notes?: string;
  lastContactDate?: Date | null;
}

/**
 * Business or company data
 */
export interface BusinessData {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  yearEstablished?: string;
  source: string;
  sourceUrl: string;
  contacts?: Contact[];
  scrapedDate: Date;
  isDecisionMaker?: boolean;
}

/**
 * Search parameters for lead generation
 */
export interface SearchParams {
  query: string;
  location?: string;
  page?: number;
  limit?: number;
}

/**
 * Result of a scraping operation
 */
export interface ScrapingResult {
  businesses: BusinessData[];
  meta: {
    sources: string[];
    query: string;
    location?: string;
    timestamp: string;
    execution_id: string;
    total_count: number;
    page: number;
    limit: number;
    total_pages: number;
    google_sheets_url?: string;
  };
}

/**
 * Error response for a failed scraping operation
 */
export interface ErrorResponse {
  error: string;
  error_code: string;
  timestamp: string;
  request_id: string;
  details?: Record<string, any>;
}