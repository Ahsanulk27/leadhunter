/**
 * Business data models for the NexLead application
 * These models define the data structure for scraped business information
 */

export interface BaseContact {
  name: string;
  title?: string;
  email?: string;
  phoneNumber?: string;
  linkedin?: string;
  relevance_score?: number;
  is_decision_maker?: boolean;
  notes?: string;
}

export interface Contact extends BaseContact {
  contactId: string;
  companyName: string;
  companyId?: string;
  companyWebsite?: string;
  source?: string;
  last_updated?: string;
  exported_to_sheets?: boolean;
}

export interface BusinessData {
  name: string;
  address: string;
  phoneNumber: string;
  website: string;
  industry: string;
  location: string;
  size: string;
  contacts: Contact[];
  data_source: string;
  data_source_url: string;
  extraction_date: string;
  // Optional metadata
  google_url?: string;
  yelp_url?: string;
  yellow_pages_url?: string;
  google_rating?: number;
  review_count?: number;
  types?: string[];
  description?: string;
  social_profiles?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  }
}

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
  };
  diagnostics?: {
    execution_time_ms: number;
    success_rate: number;
    error_rate: number;
    error_details?: any[];
  };
}

export interface ErrorResponse {
  error: string;
  error_code: string;
  timestamp: string;
  request_id: string;
  details?: any;
}

export interface ScrapeExecutionLog {
  execution_id: string;
  query: string;
  location?: string;
  timestamp: string;
  completion_time?: string;
  execution_time_ms?: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
  sources: string[];
  success_count: number;
  error_count: number;
  total_businesses_found: number;
  scraping_attempts: any[];
  error_details: any[];
}

export interface SearchParams {
  query: string;
  location?: string;
  industry?: string;
  page?: number;
  limit?: number;
  sort?: string;
  filter?: string;
  include_contacts?: boolean;
  prioritize_decision_makers?: boolean;
}

export interface ContactEnrichmentResult {
  original_data: BusinessData;
  enriched_data: BusinessData;
  contacts_added: number;
  success: boolean;
  error?: string;
}

export interface SearchControllerOptions {
  maxSourceRetries?: number;
  sourceTimeout?: number;
  logExecutionDetails?: boolean;
  maxContactsPerBusiness?: number;
  preferDecisionMakers?: boolean;
}

// Test related interfaces
export interface TestCase {
  name: string;
  query: string;
  location?: string;
  expected_min_results: number;
  sources?: string[];
  must_include_contacts?: boolean;
}

export interface TestResult {
  test_name: string;
  status: 'passed' | 'failed';
  query: string;
  location?: string;
  execution_id: string;
  timestamp: string;
  businesses_found: number;
  execution_time_ms: number;
  error?: string;
  log_file?: string;
  passed: boolean;
}

export interface TestReport {
  timestamp: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  tests: TestResult[];
}