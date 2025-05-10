/**
 * Data models for business and contact information
 */
export interface Contact {
  contactId?: string;
  name: string;
  position?: string;
  email?: string;
  phoneNumber?: string;
  isDecisionMaker?: boolean;
  isPrimary?: boolean;
  companyName?: string;
  companyId?: string;
  id?: number;
  searchDate?: Date;
  lastContactDate?: Date | null;
}

export interface BusinessData {
  id: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  description?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  source?: string;
  sourceUrl?: string;
  scrapedDate?: Date;
  contacts?: Contact[];
}

export interface ScrapingResult {
  success: boolean;
  businesses: BusinessData[];
  message?: string;
  errorCode?: string;
  sources?: string[];
  meta?: {
    totalResultsFound: number;
    totalProcessedBusinesses: number;
    totalContactsGenerated: number;
    pagesRetrieved: number;
    totalCount?: number;
    quotaStatus?: string;
  };
}

export interface ErrorResponse {
  code: string;
  message: string;
}

export interface SheetExportResult {
  success: boolean;
  message: string;
  url: string;
}

export interface BusinessLocation {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

export interface SearchParams {
  query?: string;
  industry?: string;
  location?: string;
  position?: string;
}