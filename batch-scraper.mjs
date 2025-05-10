/**
 * Batch Scraping Script for Lead Hunter
 * 
 * This script sends a batch scraping request to the Lead Hunter API
 * to generate leads for multiple services across multiple locations.
 * 
 * Usage:
 * 1. Start the Lead Hunter server
 * 2. Run this script with Node.js: node batch-scraper.mjs
 * 3. Results will be saved to the batch_results folder
 */

import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:5000/api/b2c/batch';

// Services for cleaning business
const services = [
  'carpet cleaning',
  'window cleaning',
  'move-out cleaning',
  'deep cleaning',
  'maid services',
  'home move in move out clean',
  'turnover clean'
];

// Target locations
const locations = [
  'Miami, Florida',
  'Orlando, Florida',
  'Brooklyn, New York',
  'Queens, New York',
  'Dallas, Texas',
  'Austin, Texas'
];

// Options for the scraper
const options = {
  useProxies: true,
  delayBetweenQueries: 15000, // 15 seconds between queries
  maxResults: 50,
  onlyDecisionMakers: true,
  saveHtml: false,
  delayMin: 2000,
  delayMax: 5000
};

// Execute the batch scraping
async function runBatchScrape() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║            LEAD HUNTER BATCH SCRAPER               ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('Starting batch scraping process for cleaning services...\n');
  
  console.log('Services to search:');
  services.forEach(service => console.log(` • ${service}`));
  
  console.log('\nLocations to search:');
  locations.forEach(location => console.log(` • ${location}`));
  
  console.log(`\nTotal jobs: ${services.length * locations.length}`);
  console.log('Estimated time: ~30 seconds per job\n');
  
  try {
    console.log('Submitting batch job to the server...');
    
    const response = await axios.post(API_URL, {
      services,
      locations,
      options
    });
    
    console.log('\n✅ Batch scraping job submitted successfully!');
    console.log(`\nBatch ID: ${response.data.batchId}`);
    console.log(`Estimated completion time: ${response.data.estimatedTime}`);
    
    console.log('\nThe scraping process is running in the background.');
    console.log('Results will be saved to the batch_results folder in Excel format.');
    console.log('Each file will be named: service_location_leads.xlsx');
    
    console.log('\nYou can continue to use the application while the batch job runs.');
    console.log('To view results, check the batch_results folder after completion.');
  } catch (error) {
    console.error('\n❌ Error submitting batch scraping job:');
    console.error(error.message);
    
    if (error.response) {
      console.error('\nServer response:');
      console.error(error.response.data);
    }
    
    console.log('\nTroubleshooting tips:');
    console.log(' • Make sure the Lead Hunter server is running');
    console.log(' • Check that port 5000 is accessible');
    console.log(' • Verify network connectivity');
  }
}

// Run the batch scraping
runBatchScrape();