import { z } from "zod";

// Base types
export interface User {
  id: number;
  username: string;
  password: string;
  email?: string;
  createdAt: Date;
}

export interface Company {
  id: number;
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
  scrapedDate: Date;
  saved: boolean;
  searchDate: Date;
  isSaved: boolean;
}

export interface Contact {
  id: number;
  companyId: number;
  name: string;
  position?: string;
  email?: string;
  phoneNumber?: string;
  isDecisionMaker: boolean;
  isPrimary: boolean;
  lastContactDate?: Date;
  searchDate: Date;
}

export interface SearchHistory {
  id: number;
  query: string;
  location?: string;
  industry?: string;
  position?: string;
  resultsCount?: number;
  searchDate: Date;
}

export interface BulkLeadSearch {
  id: number;
  searchTerm: string;
  locations?: string[];
  resultsCount?: number;
  businessData?: any;
  searchDate: Date;
}

// Insert types (for creating new records)
export type InsertUser = Omit<User, "id" | "createdAt">;
export type InsertCompany = Omit<
  Company,
  "id" | "scrapedDate" | "searchDate" | "saved" | "isSaved"
>;
export type InsertContact = Omit<Contact, "id" | "searchDate">;
export type InsertSearchHistory = Omit<SearchHistory, "id" | "searchDate">;
export type InsertBulkLeadSearch = Omit<BulkLeadSearch, "id" | "searchDate">;

// Zod schemas for validation
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  email: z.string().optional(),
});

export const insertCompanySchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  imageUrl: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export const insertContactSchema = z.object({
  companyId: z.number(),
  name: z.string(),
  position: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  isDecisionMaker: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
  lastContactDate: z.date().optional(),
});

export const insertSearchHistorySchema = z.object({
  query: z.string(),
  location: z.string().optional(),
  industry: z.string().optional(),
  position: z.string().optional(),
  resultsCount: z.number().optional(),
});

export const insertBulkLeadSearchSchema = z.object({
  searchTerm: z.string(),
  locations: z.array(z.string()).optional(),
  resultsCount: z.number().optional(),
  businessData: z.any().optional(),
});
