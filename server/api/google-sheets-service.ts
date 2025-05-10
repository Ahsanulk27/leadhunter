/**
 * Google Sheets integration for the NexLead application
 * Provides functionality to export business leads to Google Sheets
 */

import { google, sheets_v4 } from 'googleapis';
import { BusinessData, Contact } from '../models/business-data';

interface SheetExportResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  error?: string;
}

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null;
  private lastExportId: string | null = null;
  private lastExportUrl: string | null = null;
  
  constructor() {
    try {
      // Initialize the Sheets API client with the API key
      if (process.env.GOOGLE_API_KEY) {
        const auth = google.auth.fromAPIKey(process.env.GOOGLE_API_KEY);
        this.sheets = google.sheets({ version: 'v4', auth });
        console.log('✅ Google Sheets API initialized successfully');
      } else {
        console.log('⚠️ Google API Key not found, Sheets export will not be available');
      }
    } catch (error) {
      console.error('❌ Error initializing Google Sheets API:', error);
      this.sheets = null;
    }
  }
  
  /**
   * Validate the Google API key by making a simple test request
   */
  async checkApiKeyValidity(): Promise<{valid: boolean, message?: string}> {
    if (!this.sheets) {
      const message = 'Google Sheets API not initialized, cannot validate API key';
      console.log(`⚠️ ${message}`);
      return { valid: false, message };
    }
    
    try {
      // Make a simple request to verify the API key works
      // We'll just request spreadsheet metadata for a sample spreadsheet ID
      // This is a lightweight operation that doesn't require any specific permissions
      // Using a test spreadsheet ID format - actual spreadsheet doesn't need to exist
      await this.sheets.spreadsheets.get({
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Example ID from Google's documentation
        fields: 'spreadsheetId' // Request minimal data to reduce overhead
      });
      
      console.log('✅ Google API Key validation successful');
      return { valid: true };
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.warn(`⚠️ Google API Key validation failed: ${errorMessage}`);
      
      // Check for specific API not enabled error
      const apiNotEnabledRegex = /API .* has not been used in project .* before or it is disabled/;
      if (apiNotEnabledRegex.test(errorMessage)) {
        const message = 'The Google Sheets API is not enabled for this API key. You need to enable it in the Google Cloud Console.';
        return { valid: false, message };
      }
      
      // Check for invalid key
      if (errorMessage.includes('invalid API key')) {
        const message = 'The provided Google API key is invalid. Please check the key and try again.';
        return { valid: false, message };
      }
      
      return { valid: false, message: errorMessage };
    }
  }
  
  /**
   * Check if the Google Sheets API is authorized
   */
  isAuthorized(): boolean {
    return this.sheets !== null;
  }
  
  /**
   * Create a new Google Spreadsheet with business data
   */
  async createSheetWithBusinessData(
    title: string,
    businesses: BusinessData[]
  ): Promise<SheetExportResult> {
    if (!this.sheets) {
      return {
        success: false,
        error: 'Google Sheets API not initialized'
      };
    }
    
    try {
      // Create a new spreadsheet
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `NexLead - ${title} - ${new Date().toLocaleDateString()}`
          },
          sheets: [
            {
              properties: {
                title: 'Businesses',
                gridProperties: {
                  frozenRowCount: 1 // Freeze the header row
                }
              }
            },
            {
              properties: {
                title: 'Contacts',
                gridProperties: {
                  frozenRowCount: 1 // Freeze the header row
                }
              }
            }
          ]
        }
      });
      
      const spreadsheetId = spreadsheet.data.spreadsheetId;
      
      if (!spreadsheetId) {
        return {
          success: false,
          error: 'Failed to create spreadsheet'
        };
      }
      
      // Format header for businesses sheet
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0, // First sheet (Businesses)
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 },
                    horizontalAlignment: 'CENTER',
                    textRotation: { angle: 0 },
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 }
                  }
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,foregroundColor)'
              }
            },
            {
              repeatCell: {
                range: {
                  sheetId: 1, // Second sheet (Contacts)
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 },
                    horizontalAlignment: 'CENTER',
                    textRotation: { angle: 0 },
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 }
                  }
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,foregroundColor)'
              }
            }
          ]
        }
      });
      
      // Prepare data for the businesses sheet
      const businessHeaders = [
        'Business Name', 
        'Category', 
        'Address', 
        'Phone', 
        'Website', 
        'Email',
        'Rating', 
        'Reviews',
        'Has Decision Maker', 
        'Source',
        'Date Added'
      ];
      
      const businessesData = [
        businessHeaders,
        ...businesses.map(business => [
          business.name || '',
          business.category || '',
          business.address || '',
          business.phoneNumber || '',
          business.website || '',
          business.email || '',
          business.rating?.toString() || '',
          business.reviewCount?.toString() || '',
          (business.isDecisionMaker || false) ? 'Yes' : 'No',
          business.source || '',
          new Date(business.scrapedDate || new Date()).toLocaleDateString()
        ])
      ];
      
      // Write data to the businesses sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Businesses!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: businessesData
        }
      });
      
      // Prepare data for the contacts sheet
      const contactHeaders = [
        'Business Name',
        'Contact Name',
        'Position',
        'Email',
        'Phone',
        'Is Decision Maker',
        'Date Added'
      ];
      
      // Flatten all contacts from all businesses
      const allContacts: (Contact & { businessName: string })[] = [];
      businesses.forEach(business => {
        if (business.contacts && business.contacts.length > 0) {
          business.contacts.forEach(contact => {
            allContacts.push({
              ...contact,
              businessName: business.name
            });
          });
        }
      });
      
      const contactsData = [
        contactHeaders,
        ...allContacts.map(contact => [
          contact.businessName || '',
          contact.name || '',
          contact.position || '',
          contact.email || '',
          contact.phoneNumber || '',
          contact.isDecisionMaker ? 'Yes' : 'No',
          new Date().toLocaleDateString()
        ])
      ];
      
      // Write data to the contacts sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Contacts!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: contactsData
        }
      });
      
      // Auto-resize all columns in both sheets
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: businessHeaders.length
                }
              }
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 1,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: contactHeaders.length
                }
              }
            }
          ]
        }
      });
      
      // Store export info
      this.lastExportId = spreadsheetId;
      this.lastExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      
      console.log(`✅ Exported ${businesses.length} businesses and ${allContacts.length} contacts to Google Sheets: ${this.lastExportUrl}`);
      
      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl: this.lastExportUrl
      };
    } catch (error) {
      console.error('❌ Error exporting to Google Sheets:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Get information about the last exported spreadsheet
   */
  getLastExport(): { id: string | null; url: string | null } {
    return {
      id: this.lastExportId,
      url: this.lastExportUrl
    };
  }
  
  /**
   * Export business data to an existing spreadsheet
   */
  async exportBusinessData(
    spreadsheetId: string,
    businesses: BusinessData[]
  ): Promise<SheetExportResult> {
    if (!this.sheets) {
      return {
        success: false,
        error: 'Google Sheets API not initialized'
      };
    }
    
    try {
      // Check if the spreadsheet exists and we have access
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId
      });
      
      if (!spreadsheet || !spreadsheet.data) {
        return {
          success: false,
          error: 'Spreadsheet not found or no access'
        };
      }
      
      // Prepare data
      const businessesData = businesses.map(business => [
        business.name || '',
        business.category || '',
        business.address || '',
        business.phoneNumber || '',
        business.website || '',
        business.email || '',
        business.rating?.toString() || '',
        business.reviewCount?.toString() || '',
        (business.isDecisionMaker || false) ? 'Yes' : 'No',
        business.source || '',
        new Date(business.scrapedDate || new Date()).toLocaleDateString()
      ]);
      
      // Append data to the businesses sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Businesses!A:K',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: businessesData
        }
      });
      
      // Flatten all contacts
      const allContacts: (Contact & { businessName: string })[] = [];
      businesses.forEach(business => {
        if (business.contacts && business.contacts.length > 0) {
          business.contacts.forEach(contact => {
            allContacts.push({
              ...contact,
              businessName: business.name
            });
          });
        }
      });
      
      // Append contacts data
      if (allContacts.length > 0) {
        const contactsData = allContacts.map(contact => [
          contact.businessName || '',
          contact.name || '',
          contact.position || '',
          contact.email || '',
          contact.phoneNumber || '',
          contact.isDecisionMaker ? 'Yes' : 'No',
          new Date().toLocaleDateString()
        ]);
        
        await this.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'Contacts!A:G',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: contactsData
          }
        });
      }
      
      // Store export info
      this.lastExportId = spreadsheetId;
      this.lastExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      
      console.log(`✅ Exported ${businesses.length} businesses and ${allContacts.length} contacts to existing Google Sheet: ${this.lastExportUrl}`);
      
      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl: this.lastExportUrl
      };
    } catch (error) {
      console.error('❌ Error exporting to existing Google Sheets:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();