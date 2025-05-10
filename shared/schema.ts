import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Company schema to store company information
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),
  location: text("location"),
  size: text("size"),
  address: text("address"),
  searchDate: timestamp("search_date").defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  searchDate: true,
});

// Contact schema to store contact information
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  position: text("position"),
  email: text("email"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").default(false),
  decisionMaker: boolean("decision_maker").default(false),
  saved: boolean("saved").default(false),
  status: text("status").default("new"),
  notes: text("notes"),
  lastContactDate: timestamp("last_contact_date"),
  searchDate: timestamp("search_date").defaultNow(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  searchDate: true,
  lastContactDate: true,
});

// Search history schema to store search history
export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  searchDate: timestamp("search_date").defaultNow(),
  resultsCount: integer("results_count").default(0),
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  searchDate: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
