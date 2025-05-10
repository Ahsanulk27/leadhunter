/**
 * Google Sheets integration service for NexLead
 * Handles creation and updating of Google Sheets containing business lead data
 */

import { google } from 'googleapis';
import { BusinessData, Contact } from '../models/business-data';

interface SheetCreateResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  error?: string;
}

export class GoogleSheetsService {
  private sheets: any;
  private apiKey: string | undefined;
  
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    
    if (this.apiKey) {
      this.sheets = google.sheets({ version: 'v4', auth: this.apiKey });
      console.log('🔑 Google Sheets API initialized');
    } else {
      console.log('⚠️ Google Sheets API key not found');
    }
  }
  
  /**
   * Create a new Google Sheet with business data
   */
  async createSheetWithBusinessData(
    title: string,
    businesses: BusinessData[]
  ): Promise<SheetCreateResult> {
    if (!this.apiKey || !this.sheets) {
      return { 
        success: false, 
        error: 'Google Sheets API key not found' 
      };
    }
    
    try {
      // Create a new spreadsheet
      const dateStr = new Date().toISOString().split('T')[0];
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `NexLead Results - ${title} - ${dateStr}`
          },
          sheets: [
            { properties: { title: 'Businesses' } },
            { properties: { title: 'Contacts' } }
          ]
        }
      });
      
      const spreadsheetId = response.data.spreadsheetId;
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      
      // Prepare data for the business sheet
      const businessHeaders = [
        'Business Name',
        'Industry',
        'Address',
        'Phone Number',
        'Website',
        'Size',
        'Location',
        'Source',
        'Extraction Date',
        'Google Rating',
        'Reviews'
      ];
      
      const businessData = businesses.map(business => [
        business.name,
        business.industry,
        business.address,
        business.phoneNumber,
        business.website,
        business.size,
        business.location,
        business.data_source,
        business.extraction_date,
        business.google_rating || '',
        business.review_count || ''
      ]);
      
      // Update the businesses sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Businesses!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [businessHeaders, ...businessData]
        }
      });
      
      // Format headers
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.2,
                      green: 0.2,
                      blue: 0.2
                    },
                    textFormat: {
                      foregroundColor: {
                        red: 1.0,
                        green: 1.0,
                        blue: 1.0
                      },
                      bold: true
                    }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            }
          ]
        }
      });
      
      // Extract all contacts from businesses
      const allContacts: Contact[] = [];
      businesses.forEach(business => {
        business.contacts.forEach(contact => {
          // Ensure contact has company information
          allContacts.push({
            ...contact,
            companyName: contact.companyName || business.name,
            companyWebsite: contact.companyWebsite || business.website
          });
        });
      });
      
      if (allContacts.length > 0) {
        const contactHeaders = [
          'Full Name',
          'Title/Position',
          'Email',
          'Phone Number',
          'Company Name',
          'Company Website',
          'Is Decision Maker',
          'LinkedIn',
          'Notes',
          'Source'
        ];
        
        const contactData = allContacts.map(contact => [
          contact.name,
          contact.title || '',
          contact.email || '',
          contact.phoneNumber || '',
          contact.companyName,
          contact.companyWebsite || '',
          contact.is_decision_maker ? 'Yes' : 'No',
          contact.linkedin || '',
          contact.notes || '',
          contact.source || ''
        ]);
        
        // Update the contacts sheet
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Contacts!A1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [contactHeaders, ...contactData]
          }
        });
        
        // Format headers for contacts sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: 1,
                    startRowIndex: 0,
                    endRowIndex: 1
                  },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: {
                        red: 0.2,
                        green: 0.2,
                        blue: 0.2
                      },
                      textFormat: {
                        foregroundColor: {
                          red: 1.0,
                          green: 1.0,
                          blue: 1.0
                        },
                        bold: true
                      }
                    }
                  },
                  fields: 'userEnteredFormat(backgroundColor,textFormat)'
                }
              }
            ]
          }
        });
      }
      
      console.log(`📊 Google Sheets: Created spreadsheet "${response.data.properties.title}"`);
      console.log(`📊 Google Sheets: Added ${businesses.length} businesses`);
      console.log(`📊 Google Sheets: Added ${allContacts.length} contacts`);
      
      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl
      };
    } catch (error) {
      console.error('❌ Google Sheets Error:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Update an existing spreadsheet with business data
   */
  async updateSheetWithBusinessData(
    spreadsheetId: string,
    businesses: BusinessData[]
  ): Promise<SheetCreateResult> {
    if (!this.apiKey || !this.sheets) {
      return { 
        success: false, 
        error: 'Google Sheets API key not found' 
      };
    }
    
    try {
      // Prepare business data
      const businessData = businesses.map(business => [
        business.name,
        business.industry,
        business.address,
        business.phoneNumber,
        business.website,
        business.size,
        business.location,
        business.data_source,
        business.extraction_date,
        business.google_rating || '',
        business.review_count || ''
      ]);
      
      // Get current business data to append
      const currentData = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Businesses!A:K'
      });
      
      const existingRowCount = currentData.data.values ? currentData.data.values.length : 1;
      
      // Append new business data
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Businesses!A${existingRowCount + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: businessData
        }
      });
      
      // Extract and append contact data
      const allContacts: Contact[] = [];
      businesses.forEach(business => {
        business.contacts.forEach(contact => {
          allContacts.push({
            ...contact,
            companyName: contact.companyName || business.name,
            companyWebsite: contact.companyWebsite || business.website
          });
        });
      });
      
      if (allContacts.length > 0) {
        // Get current contact data
        const currentContactData = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'Contacts!A:J'
        });
        
        const existingContactRowCount = currentContactData.data.values ? currentContactData.data.values.length : 1;
        
        // Prepare contact data
        const contactData = allContacts.map(contact => [
          contact.name,
          contact.title || '',
          contact.email || '',
          contact.phoneNumber || '',
          contact.companyName,
          contact.companyWebsite || '',
          contact.is_decision_maker ? 'Yes' : 'No',
          contact.linkedin || '',
          contact.notes || '',
          contact.source || ''
        ]);
        
        // Append new contact data
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Contacts!A${existingContactRowCount + 1}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: contactData
          }
        });
      }
      
      console.log(`📊 Google Sheets: Updated spreadsheet ${spreadsheetId}`);
      console.log(`📊 Google Sheets: Added ${businesses.length} businesses`);
      console.log(`📊 Google Sheets: Added ${allContacts.length} contacts`);
      
      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      };
    } catch (error) {
      console.error('❌ Google Sheets Error:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Check if the API key is valid and working
   */
  async checkApiKeyValidity(): Promise<boolean> {
    if (!this.apiKey || !this.sheets) {
      return false;
    }
    
    try {
      // Try to list spreadsheets to validate API key
      await this.sheets.spreadsheets.get({
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' // Example Google Sheets ID
      });
      
      return true;
    } catch (error) {
      console.error('❌ Google Sheets API Key Validation Error:', error);
      return false;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();