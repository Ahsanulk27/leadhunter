/**
 * Single Target B2C Lead Scraper for NexLead Hunter
 * This script sends a focused scraping request for a specific cleaning service and location
 * 
 * Usage:
 * node single-scrape.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:5000/api/b2c/search';
const USE_PROXIES = true; // Set to false if you don't have any proxies configured

// Service to search for - adjust these for your specific needs
const SERVICE = 'move-out cleaning';
const LOCATION = 'Miami, Florida';
const MAX_RESULTS = 50;

// Main function to run the scraper
async function runSingleScraper() {
  console.log(`Starting B2C Lead Scraper for "${SERVICE}" in ${LOCATION}`);
  console.log(`Using proxies: ${USE_PROXIES ? 'Yes' : 'No'}`);
  console.log(`Max results: ${MAX_RESULTS}`);
  
  try {
    // Make the search request
    const response = await axios.post(API_URL, {
      query: SERVICE,
      location: LOCATION,
      maxResults: MAX_RESULTS,
      onlyDecisionMakers: true,
      useProxies: USE_PROXIES
    });
    
    if (response.data.success) {
      const { executionId, businessCount, contactCount, businesses } = response.data;
      
      console.log(`\n✅ Search completed successfully!`);
      console.log(`Execution ID: ${executionId}`);
      console.log(`Found ${businessCount} businesses with ${contactCount} contacts`);
      
      // Save results to CSV
      const csvDir = path.join(process.cwd(), 'csv_results');
      if (!fs.existsSync(csvDir)) {
        fs.mkdirSync(csvDir, { recursive: true });
      }
      
      const filename = `${SERVICE.replace(/\s+/g, '_')}_${LOCATION.replace(/,?\s+/g, '_')}.csv`;
      const filepath = path.join(csvDir, filename);
      
      // Format businesses and contacts as CSV
      const csvHeader = 'Business Name,Address,Phone,Email,Website,Category,Source,Contact Name,Position,Contact Email,Contact Phone,Decision Maker\n';
      let csvContent = csvHeader;
      
      businesses.forEach(business => {
        // Handle businesses with contacts
        if (business.contacts && business.contacts.length > 0) {
          business.contacts.forEach(contact => {
            const row = [
              escapeCsv(business.name),
              escapeCsv(business.address || ''),
              escapeCsv(business.phoneNumber || ''),
              escapeCsv(business.email || ''),
              escapeCsv(business.website || ''),
              escapeCsv(business.category || 'Cleaning Service'),
              escapeCsv(business.source),
              escapeCsv(contact.name),
              escapeCsv(contact.position || ''),
              escapeCsv(contact.email || ''),
              escapeCsv(contact.phoneNumber || ''),
              contact.isDecisionMaker ? 'Yes' : 'No'
            ].join(',');
            
            csvContent += row + '\n';
          });
        } else {
          // Handle businesses without contacts
          const row = [
            escapeCsv(business.name),
            escapeCsv(business.address || ''),
            escapeCsv(business.phoneNumber || ''),
            escapeCsv(business.email || ''),
            escapeCsv(business.website || ''),
            escapeCsv(business.category || 'Cleaning Service'),
            escapeCsv(business.source),
            '',
            '',
            '',
            '',
            ''
          ].join(',');
          
          csvContent += row + '\n';
        }
      });
      
      // Write to file
      fs.writeFileSync(filepath, csvContent);
      
      console.log(`\nResults saved to ${filepath}`);
      
      // Also save the full JSON data for reference
      const jsonPath = path.join(csvDir, `${SERVICE.replace(/\s+/g, '_')}_${LOCATION.replace(/,?\s+/g, '_')}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(response.data, null, 2));
      console.log(`Full data saved to ${jsonPath}`);
      
      // Print a sample of the data
      console.log('\nSample Results (first 3 businesses):');
      businesses.slice(0, 3).forEach((business, index) => {
        console.log(`\n[${index + 1}] ${business.name}`);
        console.log(`    Address: ${business.address || 'N/A'}`);
        console.log(`    Phone: ${business.phoneNumber || 'N/A'}`);
        console.log(`    Website: ${business.website || 'N/A'}`);
        console.log(`    Source: ${business.source}`);
        
        if (business.contacts && business.contacts.length > 0) {
          console.log('    Contacts:');
          business.contacts.forEach((contact, cIndex) => {
            console.log(`      ${cIndex + 1}. ${contact.name} - ${contact.position || 'N/A'}`);
            if (contact.email) console.log(`         Email: ${contact.email}`);
            if (contact.phoneNumber) console.log(`         Phone: ${contact.phoneNumber}`);
          });
        } else {
          console.log('    No contacts found');
        }
      });
    } else {
      console.log('\n❌ Search failed:');
      console.log(response.data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error during search:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
  }
}

// Helper function to escape CSV values
function escapeCsv(value) {
  if (value == null) return '';
  return `"${String(value).replace(/"/g, '""')}"`;
}

// Run the scraper
runSingleScraper();