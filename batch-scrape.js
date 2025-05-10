/**
 * Batch Scraping Script for Lead Hunter
 * 
 * This script sends a batch scraping request to the Lead Hunter API
 * to generate leads for multiple services across multiple locations.
 * 
 * Usage:
 * 1. Start the Lead Hunter server
 * 2. Run this script with Node.js: node batch-scrape.js
 * 3. Results will be saved to the batch_results folder
 */

const axios = require('axios');

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
  try {
    console.log('Starting batch scraping process...');
    console.log(`Services: ${services.join(', ')}`);
    console.log(`Locations: ${locations.join(', ')}`);
    console.log(`Total jobs: ${services.length * locations.length}`);
    
    const response = await axios.post(API_URL, {
      services,
      locations,
      options
    });
    
    console.log('Batch scraping job submitted successfully!');
    console.log('Response:', response.data);
    console.log('\nThe scraping process is running in the background.');
    console.log('Results will be saved to the batch_results folder in Excel format.');
    console.log(`Estimated completion time: ${response.data.estimatedTime}`);
  } catch (error) {
    console.error('Error submitting batch scraping job:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
  }
}

// Run the batch scraping
runBatchScrape();