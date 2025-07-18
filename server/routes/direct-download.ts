import { Router, Request, Response, Express } from 'express';
import { storage } from '../storage';

/**
 * Register direct download routes for the application
 */
// Helper function to escape CSV values
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return '""';
  
  // Convert to string and escape double quotes by doubling them
  const stringValue = String(value).replace(/"/g, '""');
  
  // Wrap in quotes
  return `"${stringValue}"`;
}

export function registerDirectDownloadRoutes(app: Express) {
  const router = Router();
  
  // CSV direct download endpoint - specifically optimized for iOS devices
  router.get('/csv', async (req: Request, res: Response) => {
    try {
      let filename = req.query.filename as string;
      const searchTerm = req.query.searchTerm as string;
      
      if (!filename) {
        // Generate a default filename if none provided
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        filename = `nexlead_export_${timestamp}.csv`;
      }
      
      // Add a proper content type for CSV
      res.setHeader('Content-Type', 'text/csv');
      
      // Set content disposition to force download
      // The "attachment" disposition will prompt a download
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // For iOS specifically, add cache-control headers to prevent caching
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // If we're running in development mode, delay slightly to ensure the browser has time to process
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Get the bulk lead search data from storage based on search term
      let businesses: Array<any> = [];
      
      try {
        // Try to find in database by search term
        if (searchTerm) {
          console.log(`Attempting to prepare download for search: ${searchTerm}`);
          
          // Get the most recent search with this search term
          const allSearches = await storage.getBulkLeadSearches();
          const matchingSearch = allSearches
            .filter(search => search.searchTerm === searchTerm)
            .sort((a, b) => {
              // Sort by search date (newest first)
              const dateA = a.searchDate ? new Date(a.searchDate).getTime() : 0;
              const dateB = b.searchDate ? new Date(b.searchDate).getTime() : 0;
              return dateB - dateA;
            })[0];
            
          if (matchingSearch && matchingSearch.businessData) {
            businesses = matchingSearch.businessData as any[];
            console.log(`Found ${businesses.length} businesses for CSV export from search: ${searchTerm}`);
          } else {
            console.log(`No matching search found for term: ${searchTerm}`);
          }
        }
      } catch (err) {
        console.error("Error retrieving data for download:", err);
      }
      
      // Generate CSV content 
      let csvRows = [];
      
      // Create CSV header
      csvRows.push(['Company Name', 'Industry', 'Address', 'Phone', 'Website', 
                  'Contact Name', 'Contact Position', 'Contact Email', 
                  'Contact Phone', 'Is Decision Maker'].join(','));
      
      // If there are businesses from the database, add them to the CSV
      if (businesses && businesses.length > 0) {
        businesses.forEach((business: any) => {
          if (!business.contacts || business.contacts.length === 0) {
            // Add a row with just the business info
            csvRows.push([
              escapeCsvValue(business.name || ''),
              escapeCsvValue(business.category || ''),
              escapeCsvValue(business.address || ''),
              escapeCsvValue(business.phoneNumber || ''),
              escapeCsvValue(business.website || ''),
              '', '', '', '', ''
            ].join(','));
          } else {
            // Add a row for each contact
            business.contacts.forEach((contact: any) => {
              csvRows.push([
                escapeCsvValue(business.name || ''),
                escapeCsvValue(business.category || ''),
                escapeCsvValue(business.address || ''),
                escapeCsvValue(business.phoneNumber || ''),
                escapeCsvValue(business.website || ''),
                escapeCsvValue(contact.name || ''),
                escapeCsvValue(contact.position || ''),
                escapeCsvValue(contact.email || ''),
                escapeCsvValue(contact.phoneNumber || ''),
                escapeCsvValue(contact.isDecisionMaker ? 'Yes' : 'No')
              ].join(','));
            });
          }
        });
      } else {
        // If this is direct access (without form submission), show a helpful message
        // Instead of empty rows
        console.log('No business data in storage for CSV generation. Direct URL access?');
        csvRows.push('"For best results, please search for leads first, then use the Export button","","","","","","","","",""');
        csvRows.push('"This CSV was generated without search data","","","","","","","","",""');
      }
      
      // Create the CSV content
      let csvContent = csvRows.join('\n');
      
      // Send the CSV directly to the client
      res.send(csvContent);
    } catch (error) {
      console.error('Error handling direct download:', error);
      res.status(500).json({ error: 'An error occurred during download preparation' });
    }
  });
  
  // Register the router
  app.use('/api/direct-download', router);
  console.log('✓ Direct download routes registered');
}