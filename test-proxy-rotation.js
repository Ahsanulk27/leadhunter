/**
 * Proxy Rotation Test Script for NexLead Hunter
 * Tests the proxy rotation capabilities without running the full server
 */

// Load environment variables
require('dotenv').config();

// Create a simple proxy rotation system
class ProxyRotator {
  constructor() {
    this.proxies = this.loadProxiesFromEnv();
    this.currentIndex = 0;
    
    console.log(`Loaded ${this.proxies.length} proxies from environment`);
  }
  
  loadProxiesFromEnv() {
    const proxyListEnv = process.env.PROXY_LIST;
    if (!proxyListEnv) {
      return [];
    }
    
    return proxyListEnv.split(',')
      .map(proxyStr => {
        try {
          // Parse the proxy URL format: protocol://user:pass@host:port
          const match = proxyStr.match(/^(https?|socks[45]):\/\/(?:([^:@]+):([^@]+)@)?([^:]+):(\d+)$/i);
          
          if (match) {
            const [, protocol, username, password, host, portStr] = match;
            const port = parseInt(portStr, 10);
            
            if (host && !isNaN(port)) {
              return {
                protocol,
                host,
                port,
                username,
                password,
                successCount: 0,
                failureCount: 0,
                status: 'active'
              };
            }
          }
          
          console.error(`Invalid proxy format: ${proxyStr}`);
          return null;
        } catch (error) {
          console.error(`Error parsing proxy: ${proxyStr}`, error);
          return null;
        }
      })
      .filter(Boolean);
  }
  
  getNextProxy() {
    if (this.proxies.length === 0) {
      return null;
    }
    
    // Simple round-robin selection
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return this.proxies[this.currentIndex];
  }
  
  getProxyConfig() {
    const proxy = this.getNextProxy();
    if (!proxy) {
      return {};
    }
    
    console.log(`Using proxy: ${proxy.host}:${proxy.port}`);
    
    return {
      proxy: {
        protocol: proxy.protocol,
        host: proxy.host,
        port: proxy.port,
        auth: proxy.username && proxy.password ? {
          username: proxy.username,
          password: proxy.password
        } : undefined
      }
    };
  }
  
  reportResult(proxy, success) {
    if (!proxy) return;
    
    if (success) {
      proxy.successCount++;
      proxy.failureCount = 0;
    } else {
      proxy.failureCount++;
      
      if (proxy.failureCount >= 3) {
        proxy.status = 'blocked';
        console.log(`Blocked proxy ${proxy.host}:${proxy.port} after ${proxy.failureCount} failures`);
      }
    }
  }
}

// Simple B2C lead search function
async function searchForB2CLeads(query, location) {
  const axios = require('axios');
  const cheerio = require('cheerio');
  const rotator = new ProxyRotator();
  
  console.log(`Searching for "${query}" in ${location}`);
  
  // Format search URL for Google
  const searchQuery = encodeURIComponent(`${query} ${location}`);
  const url = `https://www.google.com/search?q=${searchQuery}&hl=en&gl=us`;
  
  try {
    // Configure request with proxy
    const config = {
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    };
    
    // Add proxy if available
    const proxyConfig = rotator.getProxyConfig();
    const currentProxy = proxyConfig.proxy;
    Object.assign(config, proxyConfig);
    
    // Make the request
    console.log('Sending request...');
    const response = await axios(config);
    console.log(`Got response: ${response.status} (${response.data.length} bytes)`);
    
    // Report success
    if (currentProxy) {
      rotator.reportResult(currentProxy, true);
    }
    
    // Parse the HTML using Cheerio
    const $ = cheerio.load(response.data);
    console.log('Parsing results...');
    
    // Find local business results
    const businesses = [];
    $('.VkpGBb').each((i, el) => {
      try {
        const name = $(el).find('.dbg0pd').text().trim();
        const address = $(el).find('.rllt__details div:nth-child(3)').text().trim();
        const phoneElement = $(el).find('.rllt__details div:nth-child(4)');
        const phoneNumber = phoneElement.text().match(/^\(\d{3}\) \d{3}-\d{4}$/) ? phoneElement.text().trim() : '';
        
        if (name) {
          businesses.push({
            name,
            address: address || '',
            phoneNumber: phoneNumber || '',
            category: 'Cleaning Service',
            source: 'google'
          });
        }
      } catch (error) {
        console.error('Error parsing business:', error);
      }
    });
    
    console.log(`Found ${businesses.length} businesses`);
    
    // Return the results
    return {
      query,
      location,
      timestamp: new Date().toISOString(),
      businesses,
      businessCount: businesses.length
    };
  } catch (error) {
    console.error('Error searching for leads:', error.message);
    
    // Report failure
    if (config.proxy) {
      rotator.reportResult(config.proxy, false);
    }
    
    return {
      query,
      location,
      timestamp: new Date().toISOString(),
      businesses: [],
      businessCount: 0,
      error: error.message
    };
  }
}

// Main function
async function main() {
  try {
    console.log('Starting proxy rotation test for B2C lead generation');
    
    // Test with cleaning services query
    const result = await searchForB2CLeads('move-out cleaning', 'Miami, Florida');
    
    console.log('\nSearch Results:');
    console.log(`Query: ${result.query}`);
    console.log(`Location: ${result.location}`);
    console.log(`Found ${result.businessCount} businesses`);
    
    if (result.error) {
      console.log(`Error: ${result.error}`);
    } else if (result.businesses.length > 0) {
      console.log('\nTop 3 businesses:');
      result.businesses.slice(0, 3).forEach((business, i) => {
        console.log(`\n[${i + 1}] ${business.name}`);
        if (business.address) console.log(`    Address: ${business.address}`);
        if (business.phoneNumber) console.log(`    Phone: ${business.phoneNumber}`);
      });
    } else {
      console.log('No businesses found');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
main();