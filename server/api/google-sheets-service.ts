/**
 * Google Sheets integration service for exporting scraped lead data
 * This service handles authentication and data export to Google Sheets
 */

import { google, sheets_v4 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { BusinessData, Contact } from '../models/business-data';

// Define the structure for exported data
interface ExportConfig {
  spreadsheetId: string;
  sheetName?: string;
  includeSummary?: boolean;
  includeContactDetails?: boolean;
  includeMetadata?: boolean;
}

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null;
  private authorized: boolean = false;
  private credentials: any = null;
  private logsDir = path.join(process.cwd(), 'logs');
  private lastExport: any = null;
  
  constructor() {
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // Check for credentials in environment variables
    this.initializeClient();
  }
  
  /**
   * Initialize the Google Sheets API client
   */
  private async initializeClient(): Promise<boolean> {
    try {
      // Check if we have service account credentials first
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        // Parse JSON credentials from environment variable
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        
        // Create JWT client
        const auth = new google.auth.JWT(
          credentials.client_email,
          undefined,
          credentials.private_key,
          ['https://www.googleapis.com/auth/spreadsheets']
        );
        
        this.sheets = google.sheets({ version: 'v4', auth });
        this.authorized = true;
        this.credentials = credentials;
        
        console.log('Google Sheets service initialized with service account credentials');
        return true;
      }
      
      // Check for API key-based access
      if (process.env.GOOGLE_API_KEY) {
        const auth = new google.auth.GoogleAuth({
          key: process.env.GOOGLE_API_KEY,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        
        this.sheets = google.sheets({ version: 'v4', auth });
        this.authorized = true;
        console.log('Google Sheets service initialized with API key');
        return true;
      }
      
      console.warn('Google Sheets service not initialized - no credentials found');
      return false;
    } catch (error) {
      console.error('Error initializing Google Sheets client:', error);
      return false;
    }
  }
  
  /**
   * Check if the service is properly authorized
   */
  public isAuthorized(): boolean {
    return this.authorized && this.sheets !== null;
  }
  
  /**
   * Export business data to Google Sheets
   */
  public async exportBusinessData(
    businesses: BusinessData[],
    config: ExportConfig
  ): Promise<{ success: boolean; message: string; url?: string }> {
    // Validate authorization
    if (!this.isAuthorized()) {
      const error = 'Google Sheets service not authorized';
      console.error(error);
      return { success: false, message: error };
    }
    
    try {
      const { spreadsheetId, sheetName = 'Lead Data', includeSummary = true, includeContactDetails = true } = config;
      
      // Log the export attempt
      console.log(`Exporting ${businesses.length} businesses to Google Sheet ID: ${spreadsheetId}`);
      
      // First, check if the spreadsheet exists and we have access
      try {
        const response = await this.sheets!.spreadsheets.get({ spreadsheetId });
        console.log(`Successfully connected to spreadsheet: ${response.data.properties?.title}`);
      } catch (error) {
        console.error('Error accessing spreadsheet:', error);
        return { 
          success: false, 
          message: `Error accessing spreadsheet: ${(error as Error).message}` 
        };
      }
      
      // Check if the sheet exists, create it if not
      let sheetExists = false;
      try {
        const sheetsResponse = await this.sheets!.spreadsheets.get({ 
          spreadsheetId,
          fields: 'sheets.properties.title'
        });
        
        sheetExists = sheetsResponse.data.sheets?.some(
          sheet => sheet.properties?.title === sheetName
        ) || false;
        
        if (!sheetExists) {
          // Create the sheet
          await this.sheets!.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: sheetName
                    }
                  }
                }
              ]
            }
          });
          console.log(`Created new sheet: ${sheetName}`);
        }
      } catch (error) {
        console.error('Error checking/creating sheet:', error);
        return { 
          success: false, 
          message: `Error with sheet: ${(error as Error).message}` 
        };
      }
      
      // Clear existing content if sheet exists
      if (sheetExists) {
        try {
          await this.sheets!.spreadsheets.values.clear({
            spreadsheetId,
            range: sheetName
          });
          console.log(`Cleared existing data from sheet: ${sheetName}`);
        } catch (error) {
          console.error('Error clearing sheet:', error);
          // Continue anyway
        }
      }
      
      // Create the header row
      const headerRow = [
        'Business Name',
        'Address',
        'Phone Number',
        'Website',
        'Industry',
        'Location',
        'Size',
        'Rating',
        'Reviews',
        'Data Source',
        'Extraction Date'
      ];
      
      // Add contact detail headers if requested
      if (includeContactDetails) {
        headerRow.push(
          'Contact Name',
          'Position',
          'Decision Maker',
          'Email',
          'Phone',
          'LinkedIn'
        );
      }
      
      // Prepare the data rows
      const dataRows: string[][] = [];
      
      // Add summary row for each business
      businesses.forEach(business => {
        const businessRow = [
          business.name || '',
          business.address || '',
          business.phoneNumber || '',
          business.website || '',
          business.industry || '',
          business.location || '',
          business.size || '',
          business.google_rating?.toString() || '',
          business.review_count?.toString() || '',
          business.data_source || '',
          business.extraction_date || ''
        ];
        
        if (includeContactDetails) {
          // If we include contact details in same row, add the first contact
          if (business.contacts && business.contacts.length > 0) {
            const firstContact = business.contacts[0];
            businessRow.push(
              firstContact.name || '',
              firstContact.position || '',
              firstContact.isDecisionMaker ? 'Yes' : 'No',
              firstContact.email || '',
              firstContact.phoneNumber || '',
              firstContact.linkedinUrl || ''
            );
          } else {
            // Add empty cells if no contacts
            businessRow.push('', '', '', '', '', '');
          }
        }
        
        dataRows.push(businessRow);
        
        // If including contact details, add additional rows for each additional contact
        if (includeContactDetails && business.contacts && business.contacts.length > 1) {
          business.contacts.slice(1).forEach(contact => {
            const contactRow = [
              '', '', '', '', '', '', '', '', '', '', '' // Empty business data cells
            ];
            
            contactRow.push(
              contact.name || '',
              contact.position || '',
              contact.isDecisionMaker ? 'Yes' : 'No',
              contact.email || '',
              contact.phoneNumber || '',
              contact.linkedinUrl || ''
            );
            
            dataRows.push(contactRow);
          });
        }
      });
      
      // Combine header and data
      const allRows = [headerRow, ...dataRows];
      
      // Update the sheet
      try {
        await this.sheets!.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: allRows
          }
        });
        
        console.log(`Successfully exported ${businesses.length} businesses with ${this.countTotalContacts(businesses)} contacts`);
        
        // Format the sheet to make it more readable
        try {
          await this.applyFormattingToSheet(spreadsheetId, sheetName, allRows.length, headerRow.length);
        } catch (formattingError) {
          console.error('Error applying formatting:', formattingError);
          // Continue anyway, since the data is already exported
        }
        
        // Generate a URL to the spreadsheet
        const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;
        
        // Store last export info
        this.lastExport = {
          timestamp: new Date().toISOString(),
          businesses_count: businesses.length,
          contacts_count: this.countTotalContacts(businesses),
          spreadsheetId,
          spreadsheetUrl,
          sheetName
        };
        
        // Log the export
        const exportLogPath = path.join(this.logsDir, 'google-sheets-exports.json');
        let exportLogs = [];
        try {
          if (fs.existsSync(exportLogPath)) {
            exportLogs = JSON.parse(fs.readFileSync(exportLogPath, 'utf-8'));
          }
        } catch (err) {
          // Ignore file reading errors
        }
        
        exportLogs.push(this.lastExport);
        fs.writeFileSync(exportLogPath, JSON.stringify(exportLogs, null, 2));
        
        return { 
          success: true, 
          message: `Successfully exported ${businesses.length} businesses with ${this.countTotalContacts(businesses)} contacts`,
          url: spreadsheetUrl
        };
      } catch (error) {
        console.error('Error updating sheet:', error);
        return { 
          success: false, 
          message: `Error updating sheet: ${(error as Error).message}` 
        };
      }
    } catch (error) {
      console.error('Error in exportBusinessData:', error);
      return { 
        success: false, 
        message: `Export error: ${(error as Error).message}` 
      };
    }
  }
  
  /**
   * Apply formatting to the sheet to make it more readable
   */
  private async applyFormattingToSheet(
    spreadsheetId: string, 
    sheetName: string, 
    rowCount: number, 
    columnCount: number
  ): Promise<void> {
    // Get the sheet ID
    const sheetsResponse = await this.sheets!.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });
    
    const sheet = sheetsResponse.data.sheets?.find(
      s => s.properties?.title === sheetName
    );
    
    if (!sheet || !sheet.properties?.sheetId) {
      throw new Error(`Could not find sheet ID for ${sheetName}`);
    }
    
    const sheetId = sheet.properties.sheetId;
    
    // Apply formatting
    await this.sheets!.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Format header row
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: columnCount
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                  textFormat: {
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                    bold: true
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },
          // Freeze header row
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: {
                  frozenRowCount: 1
                }
              },
              fields: 'gridProperties.frozenRowCount'
            }
          },
          // Auto-resize columns
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: columnCount
              }
            }
          },
          // Add borders to the data
          {
            updateBorders: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: rowCount,
                startColumnIndex: 0,
                endColumnIndex: columnCount
              },
              top: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.5, green: 0.5, blue: 0.5 }
              },
              bottom: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.5, green: 0.5, blue: 0.5 }
              },
              left: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.5, green: 0.5, blue: 0.5 }
              },
              right: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.5, green: 0.5, blue: 0.5 }
              },
              innerHorizontal: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.8, green: 0.8, blue: 0.8 }
              },
              innerVertical: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.8, green: 0.8, blue: 0.8 }
              }
            }
          }
        ]
      }
    });
  }
  
  /**
   * Count the total number of contacts across all businesses
   */
  private countTotalContacts(businesses: BusinessData[]): number {
    return businesses.reduce((total, business) => {
      return total + (business.contacts?.length || 0);
    }, 0);
  }
  
  /**
   * Get information about the last export
   */
  public getLastExport(): any {
    return this.lastExport;
  }
  
  /**
   * Create a new spreadsheet
   */
  public async createSpreadsheet(title: string): Promise<string> {
    if (!this.isAuthorized()) {
      throw new Error('Google Sheets service not authorized');
    }
    
    try {
      const response = await this.sheets!.spreadsheets.create({
        requestBody: {
          properties: {
            title
          },
          sheets: [
            {
              properties: {
                title: 'Lead Data'
              }
            }
          ]
        }
      });
      
      if (response.data.spreadsheetId) {
        console.log(`Created new spreadsheet: ${title} with ID: ${response.data.spreadsheetId}`);
        return response.data.spreadsheetId;
      }
      
      throw new Error('No spreadsheet ID returned from creation request');
    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();