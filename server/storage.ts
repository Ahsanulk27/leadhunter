import { db } from "./db";
import { eq } from "drizzle-orm";
import { 
  users, companies, contacts, searchHistory, bulkLeadSearches,
  type User, type InsertUser, 
  type Company, type InsertCompany,
  type Contact, type InsertContact,
  type SearchHistory, type InsertSearchHistory,
  type BulkLeadSearch, type InsertBulkLeadSearch 
} from "@shared/schema";

/**
 * Data storage interface for NexLead
 */
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Company methods
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByName(name: string): Promise<Company | undefined>;
  getCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Contact methods
  getContact(id: number): Promise<Contact | undefined>;
  getContactsByCompanyId(companyId: number): Promise<Contact[]>;
  getSavedContacts(): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<Contact>): Promise<Contact | undefined>;
  
  // Search history methods
  getSearchHistory(): Promise<SearchHistory[]>;
  createSearchHistory(searchHistory: InsertSearchHistory): Promise<SearchHistory>;
  
  // Bulk lead search methods
  saveBulkLeadSearch(searchData: InsertBulkLeadSearch): Promise<BulkLeadSearch>;
  getBulkLeadSearches(): Promise<BulkLeadSearch[]>;
  getBulkLeadSearch(id: number): Promise<BulkLeadSearch | undefined>;
}

/**
 * Database implementation of storage using Drizzle ORM
 */
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }
  
  async getCompanyByName(name: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.name, name));
    return company || undefined;
  }
  
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }
  
  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values(insertCompany)
      .returning();
    return company;
  }
  
  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }
  
  async getContactsByCompanyId(companyId: number): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(eq(contacts.companyId, companyId));
  }
  
  async getSavedContacts(): Promise<Contact[]> {
    // Get contacts from companies that are saved
    const savedCompanies = await db
      .select()
      .from(companies)
      .where(eq(companies.isSaved, true));
    
    const savedContactsPromises = savedCompanies.map(company => 
      this.getContactsByCompanyId(company.id)
    );
    
    const savedContactsArrays = await Promise.all(savedContactsPromises);
    return savedContactsArrays.flat();
  }
  
  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values(insertContact)
      .returning();
    return contact;
  }
  
  async updateContact(id: number, contactUpdate: Partial<Contact>): Promise<Contact | undefined> {
    const [updatedContact] = await db
      .update(contacts)
      .set(contactUpdate)
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact;
  }
  
  async getSearchHistory(): Promise<SearchHistory[]> {
    return await db
      .select()
      .from(searchHistory)
      .orderBy(searchHistory.searchDate);
  }
  
  async createSearchHistory(insertSearchHistory: InsertSearchHistory): Promise<SearchHistory> {
    const [searchHistoryEntry] = await db
      .insert(searchHistory)
      .values(insertSearchHistory)
      .returning();
    return searchHistoryEntry;
  }
  
  async saveBulkLeadSearch(searchData: InsertBulkLeadSearch): Promise<BulkLeadSearch> {
    const [bulkSearch] = await db
      .insert(bulkLeadSearches)
      .values(searchData)
      .returning();
    return bulkSearch;
  }
  
  async getBulkLeadSearches(): Promise<BulkLeadSearch[]> {
    return await db
      .select()
      .from(bulkLeadSearches)
      .orderBy(bulkLeadSearches.searchDate);
  }
  
  async getBulkLeadSearch(id: number): Promise<BulkLeadSearch | undefined> {
    const [bulkSearch] = await db
      .select()
      .from(bulkLeadSearches)
      .where(eq(bulkLeadSearches.id, id));
    return bulkSearch || undefined;
  }
}

// Export the database storage instance
export const storage = new DatabaseStorage();