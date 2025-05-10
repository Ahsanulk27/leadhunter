/**
 * B2C Batch Scraper for NexLead Hunter
 * This script sends batch scraping requests for cleaning services
 * 
 * Usage:
 * node batch-scraper.mjs
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const API_URL = 'http://localhost:5000/api/b2c/batch-search';
const USE_PROXIES = true; // Set to false if you don't have any proxies configured

// Services to search for
const SERVICES = [
  'move-out cleaning',
  'move-in cleaning',
  'turnover cleaning',
  'deep cleaning',
  'apartment cleaning'
];

// Locations to search in
const LOCATIONS = [
  'Miami, Florida',
  'Orlando, Florida',
  'Tampa, Florida',
  'Brooklyn, New York',
  'Queens, New York',
  'Dallas, Texas',
  'Austin, Texas'
];

// Get the directory of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Main function to run the batch scraper
async function runBatchScraper() {
  console.log('Starting B2C Batch Scraper for NexLead Hunter');
  console.log(`Services: ${SERVICES.join(', ')}`);
  console.log(`Locations: ${LOCATIONS.join(', ')}`);
  console.log(`Using proxies: ${USE_PROXIES ? 'Yes' : 'No'}`);
  
  try {
    // Make the batch search request
    const response = await axios.post(API_URL, {
      services: SERVICES,
      locations: LOCATIONS,
      maxResults: 50,
      onlyDecisionMakers: true,
      useProxies: USE_PROXIES
    });
    
    const { batchId, status, message, outputFile } = response.data;
    
    console.log(`Batch ID: ${batchId}`);
    console.log(`Status: ${status}`);
    console.log(`Message: ${message}`);
    console.log(`Output will be saved to: ${outputFile}`);
    
    // Since this is a background job, we'll need to poll for status
    console.log('\nBatch scraping is running in the background.');
    console.log('The server will process all requests and save results to the batch_results directory.');
    console.log('This may take some time depending on the number of searches.');
    
  } catch (error) {
    console.error('Error starting batch scrape:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
  }
}

// Run the batch scraper
runBatchScraper();