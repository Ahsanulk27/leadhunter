/**
 * Consumer Lead model for the NexLead application
 * Represents individual consumer leads for cleaning services
 */

export interface ConsumerLead {
  id: string;
  name: string;
  jobTitle: string;
  phoneNumber: string;
  email: string;
  address: string;
  propertyType: string;
  propertySize: string;
  cleaningNeed: string;
  budget: string;
  inquiryDate: string;
  searchKeyword: string;
  leadScore: number;
  isHotLead: boolean;
  notes: string;
}

export interface ConsumerLeadResult {
  success: boolean;
  leads: ConsumerLead[];
  error?: string;
  location?: string;
  totalLeads?: number;
}

export interface BulkConsumerLeadResult {
  success: boolean;
  locations: string[];
  locationResults: {
    location: string;
    leadCount: number;
  }[];
  leads: ConsumerLead[];
  error?: string;
  totalLeads: number;
}