import { Router, Request, Response, Express } from 'express';

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
      const { filename, searchTerm } = req.query;
      
      if (!filename) {
        return res.status(400).json({ error: 'Filename is required' });
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
        // In a full implementation, we would query the database
        if (searchTerm) {
          // Query database or in-memory cache
          // For now we'll rely on the client to send the data directly
          console.log(`Attempting to prepare download for search: ${searchTerm}`);
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
        // Add some columns to create a valid CSV even if no data is available
        csvRows.push('"No results available","","","","","","","","",""');
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