/**
 * Models representing business data structures used throughout the application
 */

export interface Contact {
  id?: number;
  name: string;
  position: string;
  email: string;
  phoneNumber: string;
  isDecisionMaker: boolean;
  notes?: string;
  companyId?: number;
  searchDate?: string;
  lastContactDate?: string | null;
  // Additional fields for tracking and enhancing contact data
  linkedinUrl?: string;
  emailConfidence?: number; // 0.0 to 1.0 confidence score for email validity
  source?: string;
  relevanceScore?: number;
}

export interface BusinessData {
  id?: number;
  name: string;
  address: string;
  phoneNumber: string;
  website: string;
  industry: string;
  location: string;
  size: string;
  contacts: Contact[];
  searchDate?: string;
  // Fields for tracking data source and quality
  data_source: string;
  data_source_url: string;
  extraction_date: string;
  // Additional optional fields for specific data sources
  place_id?: string;
  yelp_url?: string;
  yellow_pages_url?: string;
  google_rating?: number;
  review_count?: number;
  verified?: boolean;
  types?: string[];
  vicinity?: string;
  formatted_address?: string;
}

export interface ScrapingResult {
  businesses: BusinessData[];
  // Pagination metadata
  page?: number;
  limit?: number;
  totalResults?: number;
  totalPages?: number;
  // Execution metadata
  executionTimeMs?: number;
  sources?: string[];
  query?: string;
  location?: string;
  executionDate?: string;
  executionId?: string;
}

// Response format for cases where no real data could be found
export interface ErrorResponse {
  error: string;
  details?: string;
  executionId?: string;
  executionDate?: string;
}

// Interfaces for helper functions
export interface SearchParams {
  industry?: string;
  location?: string;
  companyName?: string;
  size?: string;
  position?: string;
  prioritizeDecisionMakers?: boolean;
  page?: number;
  limit?: number;
  executionId?: string;
  executionLog?: any;
}