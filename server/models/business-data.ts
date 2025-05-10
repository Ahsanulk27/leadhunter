/**
 * Business data models for LeadHunter
 * Defines the structure for businesses and contacts
 */

export interface Contact {
  contactId: string;
  name: string;
  position?: string;
  email?: string;
  phoneNumber?: string;
  isDecisionMaker: boolean;
  companyName: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  notes?: string;
  tags?: string[];
  lastContactDate?: Date;
}

export interface BusinessData {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  yearEstablished?: string;
  employeeCount?: number;
  revenue?: string;
  contacts?: Contact[];
  source: string;
  sourceUrl: string;
  scrapedDate: Date;
  tags?: string[];
  notes?: string;
  relevanceScore?: number;
}

export interface ScrapingResult {
  businesses: BusinessData[];
  sources: string[];
  query: string;
  location?: string;
  executionTime?: number;
  dataQualityScore?: number;
}

export interface SearchParams {
  query: string;
  location?: string;
  maxResults?: number;
  minRating?: number;
  includeOrganic?: boolean;
  includeLocal?: boolean;
  includeYelp?: boolean;
  includeYellowPages?: boolean;
  onlyDecisionMakers?: boolean;
  useProxies?: boolean;
  saveHtml?: boolean;
  delayMin?: number;
  delayMax?: number;
}