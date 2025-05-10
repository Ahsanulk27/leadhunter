import { 
  users, type User, type InsertUser,
  companies, type Company, type InsertCompany,
  contacts, type Contact, type InsertContact,
  searchHistory, type SearchHistory, type InsertSearchHistory
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private companies: Map<number, Company>;
  private contacts: Map<number, Contact>;
  private searchHistories: Map<number, SearchHistory>;
  
  private userId: number;
  private companyId: number;
  private contactId: number;
  private searchHistoryId: number;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.contacts = new Map();
    this.searchHistories = new Map();
    
    this.userId = 1;
    this.companyId = 1;
    this.contactId = 1;
    this.searchHistoryId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Add any initial data if needed
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getCompanyByName(name: string): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find(
      (company) => company.name.toLowerCase() === name.toLowerCase(),
    );
  }

  async getCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = this.companyId++;
    const searchDate = new Date();
    const company: Company = { ...insertCompany, id, searchDate };
    this.companies.set(id, company);
    return company;
  }
  
  // Contact methods
  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async getContactsByCompanyId(companyId: number): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(
      (contact) => contact.companyId === companyId,
    );
  }

  async getSavedContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(
      (contact) => contact.saved === true,
    );
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.contactId++;
    const searchDate = new Date();
    const contact: Contact = { ...insertContact, id, searchDate, lastContactDate: null };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: number, contactUpdate: Partial<Contact>): Promise<Contact | undefined> {
    const existingContact = this.contacts.get(id);
    if (!existingContact) {
      return undefined;
    }

    const updatedContact = { ...existingContact, ...contactUpdate };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }
  
  // Search history methods
  async getSearchHistory(): Promise<SearchHistory[]> {
    return Array.from(this.searchHistories.values());
  }

  async createSearchHistory(insertSearchHistory: InsertSearchHistory): Promise<SearchHistory> {
    const id = this.searchHistoryId++;
    const searchDate = new Date();
    const searchHistoryEntry: SearchHistory = { ...insertSearchHistory, id, searchDate };
    this.searchHistories.set(id, searchHistoryEntry);
    return searchHistoryEntry;
  }
}

export const storage = new MemStorage();
