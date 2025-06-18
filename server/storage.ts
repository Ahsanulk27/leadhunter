import {
  type User,
  type InsertUser,
  type Company,
  type InsertCompany,
  type Contact,
  type InsertContact,
  type SearchHistory,
  type InsertSearchHistory,
  type BulkLeadSearch,
  type InsertBulkLeadSearch,
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
  updateContact(
    id: number,
    contact: Partial<Contact>
  ): Promise<Contact | undefined>;

  // Search history methods
  getSearchHistory(): Promise<SearchHistory[]>;
  createSearchHistory(
    searchHistory: InsertSearchHistory
  ): Promise<SearchHistory>;

  // Bulk lead search methods
  saveBulkLeadSearch(searchData: InsertBulkLeadSearch): Promise<BulkLeadSearch>;
  getBulkLeadSearches(): Promise<BulkLeadSearch[]>;
  getBulkLeadSearch(id: number): Promise<BulkLeadSearch | undefined>;
}

/**
 * In-memory implementation of storage
 */
export class InMemoryStorage implements IStorage {
  private users: User[] = [];
  private companies: Company[] = [];
  private contacts: Contact[] = [];
  private searchHistory: SearchHistory[] = [];
  private bulkLeadSearches: BulkLeadSearch[] = [];
  private nextId = 1;

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find((u) => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser = {
      id: this.nextId++,
      ...user,
      createdAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.find((c) => c.id === id);
  }

  async getCompanyByName(name: string): Promise<Company | undefined> {
    return this.companies.find((c) => c.name === name);
  }

  async getCompanies(): Promise<Company[]> {
    return this.companies;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const newCompany = {
      id: this.nextId++,
      ...company,
      scrapedDate: new Date(),
      searchDate: new Date(),
      saved: false,
      isSaved: false,
    };
    this.companies.push(newCompany);
    return newCompany;
  }

  // Contact methods
  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.find((c) => c.id === id);
  }

  async getContactsByCompanyId(companyId: number): Promise<Contact[]> {
    return this.contacts.filter((c) => c.companyId === companyId);
  }

  async getSavedContacts(): Promise<Contact[]> {
    const savedCompanyIds = this.companies
      .filter((c) => c.isSaved)
      .map((c) => c.id);
    return this.contacts.filter((c) => savedCompanyIds.includes(c.companyId));
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const newContact = {
      id: this.nextId++,
      ...contact,
      searchDate: new Date(),
    };
    this.contacts.push(newContact);
    return newContact;
  }

  async updateContact(
    id: number,
    contactUpdate: Partial<Contact>
  ): Promise<Contact | undefined> {
    const index = this.contacts.findIndex((c) => c.id === id);
    if (index === -1) return undefined;

    this.contacts[index] = {
      ...this.contacts[index],
      ...contactUpdate,
    };
    return this.contacts[index];
  }

  // Search history methods
  async getSearchHistory(): Promise<SearchHistory[]> {
    return this.searchHistory.sort(
      (a, b) =>
        new Date(b.searchDate).getTime() - new Date(a.searchDate).getTime()
    );
  }

  async createSearchHistory(
    searchHistory: InsertSearchHistory
  ): Promise<SearchHistory> {
    const newSearchHistory = {
      id: this.nextId++,
      ...searchHistory,
      searchDate: new Date(),
    };
    this.searchHistory.push(newSearchHistory);
    return newSearchHistory;
  }

  // Bulk lead search methods
  async saveBulkLeadSearch(
    searchData: InsertBulkLeadSearch
  ): Promise<BulkLeadSearch> {
    const newBulkSearch = {
      id: this.nextId++,
      ...searchData,
      searchDate: new Date(),
    };
    this.bulkLeadSearches.push(newBulkSearch);
    return newBulkSearch;
  }

  async getBulkLeadSearches(): Promise<BulkLeadSearch[]> {
    return this.bulkLeadSearches.sort(
      (a, b) =>
        new Date(b.searchDate).getTime() - new Date(a.searchDate).getTime()
    );
  }

  async getBulkLeadSearch(id: number): Promise<BulkLeadSearch | undefined> {
    return this.bulkLeadSearches.find((s) => s.id === id);
  }
}

// Export the in-memory storage instance
export const storage = new InMemoryStorage();
