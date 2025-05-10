/**
 * Direct Lead Scraper for cleaning services
 * Uses the B2C search endpoint without proxy rotation
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const API_URL = 'http://localhost:5000/api/b2c/search';
const OUTPUT_DIR = 'direct_results';

// Service to search
const service = 'move-out cleaning';

// Location to search
const location = 'Miami, Florida';

// Make sure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Execute the search
async function runSearch() {
  console.log(`Searching for "${service}" in "${location}"...`);
  
  try {
    const params = {
      query: service,
      location: location,
      maxResults: 50,
      onlyDecisionMakers: true,
      useProxies: false // Turn off proxy usage since we don't have actual proxies configured
    };
    
    const response = await axios.post(API_URL, params);
    
    if (response.data && response.data.businesses) {
      const results = response.data;
      
      // Save results to JSON file
      const outputFile = path.join(OUTPUT_DIR, `${service.replace(/\s+/g, '_')}_${location.replace(/,?\s+/g, '_')}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
      
      // Generate CSV files
      const businessesData = [];
      const contactsData = [];
      
      results.businesses.forEach(business => {
        // Add business to businesses data
        businessesData.push({
          "Business Name": business.name,
          "Address": business.address || '',
          "Phone": business.phoneNumber || '',
          "Email": business.email || '',
          "Website": business.website || '',
          "Category": business.category || '',
          "Source": business.source
        });
        
        // Add contacts to contacts data
        if (business.contacts && business.contacts.length > 0) {
          business.contacts.forEach(contact => {
            contactsData.push({
              "Business Name": business.name,
              "Contact Name": contact.name,
              "Position": contact.position || '',
              "Email": contact.email || '',
              "Phone": contact.phoneNumber || '',
              "Decision Maker": contact.isDecisionMaker ? 'Yes' : 'No',
              "Business Address": business.address || '',
              "Business Website": business.website || ''
            });
          });
        }
      });
      
      // Save businesses to CSV
      if (businessesData.length > 0) {
        const businessesCsv = path.join(OUTPUT_DIR, `${service.replace(/\s+/g, '_')}_businesses.csv`);
        const businessesHeader = Object.keys(businessesData[0]).join(',');
        const businessesRows = businessesData.map(row => 
          Object.values(row).map(value => `"${(value || '').toString().replace(/"/g, '""')}"`).join(',')
        );
        fs.writeFileSync(businessesCsv, [businessesHeader, ...businessesRows].join('\n'));
        console.log(`Saved ${businessesData.length} businesses to ${businessesCsv}`);
        
        // Print the contents of the business CSV file
        console.log('\nBusinesses CSV content:');
        console.log(fs.readFileSync(businessesCsv, 'utf8'));
      } else {
        console.log('No businesses found.');
      }
      
      // Save contacts to CSV
      if (contactsData.length > 0) {
        const contactsCsv = path.join(OUTPUT_DIR, `${service.replace(/\s+/g, '_')}_contacts.csv`);
        const contactsHeader = Object.keys(contactsData[0]).join(',');
        const contactsRows = contactsData.map(row =>
          Object.values(row).map(value => `"${(value || '').toString().replace(/"/g, '""')}"`).join(',')
        );
        fs.writeFileSync(contactsCsv, [contactsHeader, ...contactsRows].join('\n'));
        console.log(`Saved ${contactsData.length} contacts to ${contactsCsv}`);
        
        // Print the contents of the contacts CSV file
        console.log('\nContacts CSV content:');
        console.log(fs.readFileSync(contactsCsv, 'utf8'));
      } else {
        console.log('No contacts found.');
      }
      
      console.log(`\nSearch completed successfully.`);
      console.log(`Found ${results.businesses.length} businesses with ${contactsData.length} contacts.`);
    } else {
      console.log('No results returned from the search.');
    }
  } catch (error) {
    console.error('Error during search:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
  }
}

// Run the search
runSearch();