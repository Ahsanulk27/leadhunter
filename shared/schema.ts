import { pgTable, serial, text, timestamp, integer, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Companies table - for storing business lead data
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phoneNumber: text("phone_number"),
  website: text("website"),
  description: text("description"),
  category: text("category"),
  rating: integer("rating"),
  reviewCount: integer("review_count"),
  imageUrl: text("image_url"),
  source: text("source"),
  sourceUrl: text("source_url"),
  scrapedDate: timestamp("scraped_date").defaultNow(),
  saved: boolean("saved").default(false),
  searchDate: timestamp("search_date").defaultNow(),
  isSaved: boolean("is_saved").default(false)
});

// Contacts table - for storing contact information related to companies
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  position: text("position"),
  email: text("email"),
  phoneNumber: text("phone_number"),
  isDecisionMaker: boolean("is_decision_maker").default(false),
  isPrimary: boolean("is_primary").default(false),
  lastContactDate: timestamp("last_contact_date"),
  searchDate: timestamp("search_date").defaultNow()
});

// Search history table - for tracking user searches
export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  location: text("location"),
  industry: text("industry"),
  position: text("position"),
  resultsCount: integer("results_count"),
  searchDate: timestamp("search_date").defaultNow()
});

// Bulk lead searches
export const bulkLeadSearches = pgTable("bulk_lead_searches", {
  id: serial("id").primaryKey(),
  searchTerm: text("search_term").notNull(),
  locations: text("locations").array(),
  resultsCount: integer("results_count"),
  businessData: json("business_data"),
  searchDate: timestamp("search_date").defaultNow()
});

// Insertion schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  searchDate: true
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  searchDate: true,
  lastContactDate: true
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  searchDate: true
});

export const insertBulkLeadSearchSchema = createInsertSchema(bulkLeadSearches).omit({
  id: true,
  searchDate: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;

export type BulkLeadSearch = typeof bulkLeadSearches.$inferSelect;
export type InsertBulkLeadSearch = z.infer<typeof insertBulkLeadSearchSchema>;