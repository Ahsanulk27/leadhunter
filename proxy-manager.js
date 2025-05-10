/**
 * Proxy Manager Utility for NexLead Hunter
 * Use this to check, update, and manage your proxy configurations
 * 
 * Usage:
 * node proxy-manager.js [command]
 * 
 * Commands:
 *   list                - List all configured proxies
 *   check               - Check health of all proxies
 *   add [proxy]         - Add a proxy (format: protocol://user:pass@host:port)
 *   delete [id]         - Remove a proxy by ID
 *   sources             - List proxy sources
 *   enable-source [id]  - Enable a proxy source
 *   disable-source [id] - Disable a proxy source
 *   reset               - Reset all blocked proxies
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const PROXIES_PATH = path.join(process.cwd(), 'config', 'proxies', 'proxies.json');
const SOURCES_PATH = path.join(process.cwd(), 'config', 'proxies', 'sources.json');
const HEALTH_CHECK_URL = 'https://www.google.com';
const MAX_CONCURRENT_CHECKS = 5;

// Ensure config directories exist
if (!fs.existsSync(path.dirname(PROXIES_PATH))) {
  fs.mkdirSync(path.dirname(PROXIES_PATH), { recursive: true });
}

// Load proxies
function loadProxies() {
  if (fs.existsSync(PROXIES_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(PROXIES_PATH, 'utf-8'));
    } catch (error) {
      console.error('Error loading proxies:', error);
      return [];
    }
  } else {
    return [];
  }
}

// Save proxies
function saveProxies(proxies) {
  try {
    fs.writeFileSync(PROXIES_PATH, JSON.stringify(proxies, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving proxies:', error);
    return false;
  }
}

// Load sources
function loadSources() {
  if (fs.existsSync(SOURCES_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf-8'));
    } catch (error) {
      console.error('Error loading sources:', error);
      return [];
    }
  } else {
    return [];
  }
}

// Save sources
function saveSources(sources) {
  try {
    fs.writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving sources:', error);
    return false;
  }
}

// Check a single proxy's health
async function checkProxyHealth(proxy) {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(HEALTH_CHECK_URL, {
      proxy: {
        protocol: proxy.protocol,
        host: proxy.host,
        port: proxy.port,
        auth: proxy.username && proxy.password ? {
          username: proxy.username,
          password: proxy.password
        } : undefined
      },
      timeout: 10000 // 10 seconds
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      id: proxy.id,
      success: true,
      responseTime,
      status: 'active'
    };
  } catch (error) {
    return {
      id: proxy.id,
      success: false,
      error: error.message,
      status: 'error'
    };
  }
}

// Command handlers
const commands = {
  // List all proxies
  async list() {
    const proxies = loadProxies();
    
    if (proxies.length === 0) {
      console.log('No proxies configured. Add some with the "add" command.');
      return;
    }
    
    console.log(`Found ${proxies.length} proxies:\n`);
    
    proxies.forEach((proxy, index) => {
      const authPart = proxy.username && proxy.password 
        ? `${proxy.username}:${proxy.password}@` 
        : '';
      
      console.log(`[${index + 1}] ${proxy.id} (${proxy.status})`);
      console.log(`    ${proxy.protocol}://${authPart}${proxy.host}:${proxy.port}`);
      
      if (proxy.sourceId) {
        console.log(`    Source: ${proxy.sourceId}`);
      }
      
      if (proxy.tags && proxy.tags.length) {
        console.log(`    Tags: ${proxy.tags.join(', ')}`);
      }
      
      console.log(`    Success: ${proxy.successCount}, Failures: ${proxy.failureCount}, Avg Response: ${proxy.avgResponseTime.toFixed(2)}ms`);
      console.log();
    });
    
    // Group by status
    const activeCount = proxies.filter(p => p.status === 'active').length;
    const blockedCount = proxies.filter(p => p.status === 'blocked').length;
    const errorCount = proxies.filter(p => p.status === 'error').length;
    
    console.log(`Status Summary: ${activeCount} active, ${blockedCount} blocked, ${errorCount} error`);
  },
  
  // Check health of all proxies
  async check() {
    const proxies = loadProxies();
    
    if (proxies.length === 0) {
      console.log('No proxies configured. Add some with the "add" command.');
      return;
    }
    
    console.log(`Checking health of ${proxies.length} proxies...\n`);
    
    // Check in batches to avoid memory issues
    const results = [];
    for (let i = 0; i < proxies.length; i += MAX_CONCURRENT_CHECKS) {
      const batch = proxies.slice(i, i + MAX_CONCURRENT_CHECKS);
      const batchResults = await Promise.all(batch.map(checkProxyHealth));
      results.push(...batchResults);
      
      // Show progress
      console.log(`Checked ${Math.min(i + MAX_CONCURRENT_CHECKS, proxies.length)}/${proxies.length} proxies`);
    }
    
    // Update proxy status based on health check
    let updatedCount = 0;
    proxies.forEach(proxy => {
      const result = results.find(r => r.id === proxy.id);
      if (result) {
        if (result.success) {
          if (proxy.status !== 'active') {
            proxy.status = 'active';
            updatedCount++;
          }
          
          proxy.successCount++;
          proxy.failureCount = 0;
          
          // Update average response time
          if (result.responseTime) {
            const totalRespTime = proxy.avgResponseTime * proxy.successCount;
            proxy.avgResponseTime = (totalRespTime + result.responseTime) / (proxy.successCount + 1);
          }
        } else {
          proxy.failureCount++;
          
          if (proxy.failureCount >= 3) {
            if (proxy.status !== 'blocked') {
              proxy.status = 'blocked';
              updatedCount++;
            }
          }
        }
      }
    });
    
    // Save updated proxies
    if (updatedCount > 0) {
      saveProxies(proxies);
      console.log(`\nUpdated status of ${updatedCount} proxies`);
    }
    
    // Display results
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`\nHealth Check Results: ${successCount} working, ${failCount} failed`);
    
    if (successCount > 0) {
      const avgResponseTime = results
        .filter(r => r.success && r.responseTime)
        .reduce((sum, r) => sum + r.responseTime, 0) / successCount;
      
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
    }
  },
  
  // Add a new proxy
  async add(proxyString) {
    if (!proxyString) {
      console.error('Error: Proxy string required. Format: protocol://user:pass@host:port');
      return;
    }
    
    // Parse the proxy string
    const proxyRegex = /^(https?|socks[45]):\/\/(?:([^:@]+):([^@]+)@)?([^:]+):(\d+)$/i;
    const match = proxyString.match(proxyRegex);
    
    if (!match) {
      console.error('Error: Invalid proxy format. Use protocol://user:pass@host:port');
      return;
    }
    
    const [, protocol, username, password, host, portStr] = match;
    const port = parseInt(portStr, 10);
    
    // Load existing proxies
    const proxies = loadProxies();
    
    // Check if proxy already exists
    const exists = proxies.some(p => p.host === host && p.port === port);
    if (exists) {
      console.error(`Error: Proxy ${host}:${port} already exists`);
      return;
    }
    
    // Create new proxy
    const id = `${host}:${port}`;
    const newProxy = {
      id,
      protocol,
      host,
      port,
      username,
      password,
      sourceId: 'manual',
      successCount: 0,
      failureCount: 0,
      avgResponseTime: 0,
      status: 'active',
      tags: ['manual']
    };
    
    // Add to list and save
    proxies.push(newProxy);
    saveProxies(proxies);
    
    console.log(`Added proxy: ${protocol}://${host}:${port}`);
    
    // Check health
    console.log('Checking proxy health...');
    const health = await checkProxyHealth(newProxy);
    
    if (health.success) {
      console.log('✅ Proxy is working!');
    } else {
      console.log(`❌ Proxy check failed: ${health.error}`);
      
      // Update status
      const updatedProxies = loadProxies();
      const proxy = updatedProxies.find(p => p.id === id);
      if (proxy) {
        proxy.status = 'error';
        proxy.failureCount = 1;
        saveProxies(updatedProxies);
      }
    }
  },
  
  // Delete a proxy
  async delete(id) {
    if (!id) {
      console.error('Error: Proxy ID required');
      return;
    }
    
    const proxies = loadProxies();
    const initialCount = proxies.length;
    
    const updatedProxies = proxies.filter(p => p.id !== id);
    
    if (updatedProxies.length === initialCount) {
      console.error(`Error: Proxy with ID ${id} not found`);
      return;
    }
    
    saveProxies(updatedProxies);
    console.log(`Removed proxy: ${id}`);
  },
  
  // List proxy sources
  async sources() {
    const sources = loadSources();
    
    if (sources.length === 0) {
      console.log('No proxy sources configured.');
      return;
    }
    
    console.log(`Found ${sources.length} proxy sources:\n`);
    
    sources.forEach((source, index) => {
      console.log(`[${index + 1}] ${source.name} (${source.id}) - ${source.status}`);
      console.log(`    Type: ${source.type}`);
      
      if (source.url) {
        console.log(`    URL: ${source.url}`);
      }
      
      if (source.refreshInterval) {
        console.log(`    Refresh: Every ${source.refreshInterval} minutes`);
      }
      
      if (source.lastRefresh) {
        console.log(`    Last Refresh: ${new Date(source.lastRefresh).toLocaleString()}`);
      }
      
      console.log();
    });
    
    // Count by status
    const activeCount = sources.filter(s => s.status === 'active').length;
    const inactiveCount = sources.filter(s => s.status === 'inactive').length;
    
    console.log(`Status Summary: ${activeCount} active, ${inactiveCount} inactive`);
  },
  
  // Enable a proxy source
  async enableSource(id) {
    if (!id) {
      console.error('Error: Source ID required');
      return;
    }
    
    const sources = loadSources();
    const source = sources.find(s => s.id === id);
    
    if (!source) {
      console.error(`Error: Source with ID ${id} not found`);
      return;
    }
    
    if (source.status === 'active') {
      console.log(`Source ${source.name} is already active`);
      return;
    }
    
    source.status = 'active';
    saveSources(sources);
    
    console.log(`Enabled source: ${source.name} (${id})`);
  },
  
  // Disable a proxy source
  async disableSource(id) {
    if (!id) {
      console.error('Error: Source ID required');
      return;
    }
    
    const sources = loadSources();
    const source = sources.find(s => s.id === id);
    
    if (!source) {
      console.error(`Error: Source with ID ${id} not found`);
      return;
    }
    
    if (source.status === 'inactive') {
      console.log(`Source ${source.name} is already inactive`);
      return;
    }
    
    source.status = 'inactive';
    saveSources(sources);
    
    console.log(`Disabled source: ${source.name} (${id})`);
  },
  
  // Reset all blocked proxies
  async reset() {
    const proxies = loadProxies();
    let resetCount = 0;
    
    proxies.forEach(proxy => {
      if (proxy.status === 'blocked' || proxy.status === 'error') {
        proxy.status = 'active';
        proxy.failureCount = 0;
        resetCount++;
      }
    });
    
    if (resetCount > 0) {
      saveProxies(proxies);
      console.log(`Reset ${resetCount} proxies to active state`);
    } else {
      console.log('No blocked or error proxies found');
    }
  },
  
  // Show help
  async help() {
    console.log(`
Proxy Manager Utility for NexLead Hunter

Usage:
  node proxy-manager.js [command]

Commands:
  list                - List all configured proxies
  check               - Check health of all proxies
  add [proxy]         - Add a proxy (format: protocol://user:pass@host:port)
  delete [id]         - Remove a proxy by ID
  sources             - List proxy sources
  enable-source [id]  - Enable a proxy source
  disable-source [id] - Disable a proxy source
  reset               - Reset all blocked proxies
  help                - Show this help message
`);
  }
};

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const param = args[1];
  
  if (commands[command]) {
    await commands[command](param);
  } else {
    console.error(`Unknown command: ${command}`);
    await commands.help();
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});