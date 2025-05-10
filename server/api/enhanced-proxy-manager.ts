/**
 * Enhanced Proxy Manager for LeadHunter
 * Supports multiple proxy sources including proxy lists, proxy APIs, and rotating proxies
 */

import axios, { AxiosRequestConfig } from 'axios';
import { logExecution } from './scraper-utils';
import * as fs from 'fs';
import * as path from 'path';

export interface ProxySource {
  id: string;
  type: 'list' | 'api' | 'service';
  name: string;
  url?: string;
  apiKey?: string;
  refreshInterval?: number; // in minutes
  status: 'active' | 'inactive';
  lastRefresh?: Date;
}

export interface ProxyServer {
  id: string;
  protocol: string;  // http, https, socks4, socks5
  host: string;
  port: number;
  username?: string;
  password?: string;
  sourceId: string;
  lastUsed?: Date;
  successCount: number;
  failureCount: number;
  avgResponseTime: number;
  status: 'active' | 'blocked' | 'error';
  country?: string;
  city?: string;
  asn?: string;
  tags?: string[];
}

export class EnhancedProxyManager {
  private proxies: ProxyServer[] = [];
  private sources: ProxySource[] = [];
  private currentProxyIndex = 0;
  private executionId: string;
  private maxFailuresBeforeBlocking = 3;
  private healthCheckUrl = 'https://www.google.com';
  private configPath: string;
  private proxyApiKeys: { [key: string]: string } = {};
  
  constructor(executionId: string) {
    this.executionId = executionId;
    this.configPath = path.join(process.cwd(), 'config', 'proxies');
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(this.configPath, { recursive: true });
    }
    
    // Load proxy sources and proxies
    this.loadConfig();
    
    // Initialize proxy API keys from environment variables
    this.proxyApiKeys = {
      'brightdata': process.env.BRIGHTDATA_API_KEY || '',
      'smartproxy': process.env.SMARTPROXY_API_KEY || '',
      'proxy_bonanza': process.env.PROXY_BONANZA_API_KEY || '',
      'luminati': process.env.LUMINATI_API_KEY || '',
      'stormproxies': process.env.STORMPROXIES_API_KEY || '',
      'geonode': process.env.GEONODE_API_KEY || '',
      'proxyseeker': process.env.PROXYSEEKER_API_KEY || '',
      'gimmeproxy': process.env.GIMMEPROXY_API_KEY || ''
    };
    
    // Schedule refreshes for API sources
    this.scheduleProxyRefreshes();
  }
  
  /**
   * Load proxy configuration from files
   */
  private loadConfig() {
    try {
      const sourcesPath = path.join(this.configPath, 'sources.json');
      const proxiesPath = path.join(this.configPath, 'proxies.json');
      
      if (fs.existsSync(sourcesPath)) {
        this.sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
        console.log(`Loaded ${this.sources.length} proxy sources from config`);
      } else {
        // Initialize with default sources
        this.sources = this.getDefaultSources();
        this.saveConfig();
      }
      
      if (fs.existsSync(proxiesPath)) {
        this.proxies = JSON.parse(fs.readFileSync(proxiesPath, 'utf-8'));
        console.log(`Loaded ${this.proxies.length} proxies from config`);
      } else {
        // Initialize with default proxies if available
        this.loadProxiesFromEnv();
        this.saveConfig();
      }
    } catch (error) {
      console.error('Error loading proxy configuration:', error);
      // Initialize with defaults
      this.sources = this.getDefaultSources();
      this.loadProxiesFromEnv();
      this.saveConfig();
    }
  }
  
  /**
   * Save proxy configuration to files
   */
  private saveConfig() {
    try {
      const sourcesPath = path.join(this.configPath, 'sources.json');
      const proxiesPath = path.join(this.configPath, 'proxies.json');
      
      fs.writeFileSync(sourcesPath, JSON.stringify(this.sources, null, 2));
      fs.writeFileSync(proxiesPath, JSON.stringify(this.proxies, null, 2));
    } catch (error) {
      console.error('Error saving proxy configuration:', error);
    }
  }
  
  /**
   * Get default proxy sources
   */
  private getDefaultSources(): ProxySource[] {
    return [
      {
        id: 'env',
        type: 'list',
        name: 'Environment Variables',
        status: 'active'
      },
      {
        id: 'brightdata',
        type: 'service',
        name: 'Bright Data',
        url: 'https://api.brightdata.com/proxy/get',
        refreshInterval: 60,
        status: 'inactive'
      },
      {
        id: 'smartproxy',
        type: 'service',
        name: 'Smartproxy',
        url: 'https://api.smartproxy.com/v1/proxies',
        refreshInterval: 60,
        status: 'inactive'
      },
      {
        id: 'proxyseeker',
        type: 'api',
        name: 'ProxySeeker API',
        url: 'https://api.proxyseeker.io/premium',
        refreshInterval: 60,
        status: 'inactive'
      },
      {
        id: 'gimmeproxy',
        type: 'api',
        name: 'Gimmeproxy API',
        url: 'https://gimmeproxy.com/api/getProxy',
        refreshInterval: 5,
        status: 'inactive'
      },
      {
        id: 'geonode',
        type: 'api',
        name: 'GeoNode Free Proxy API',
        url: 'https://proxylist.geonode.com/api/proxy-list',
        refreshInterval: 15,
        status: 'active'
      },
      {
        id: 'pubproxy',
        type: 'api',
        name: 'PubProxy API',
        url: 'http://pubproxy.com/api/proxy',
        refreshInterval: 10,
        status: 'active'
      }
    ];
  }
  
  /**
   * Load proxies from environment variables
   */
  private loadProxiesFromEnv() {
    // PROXY_LIST format: protocol://user:pass@host:port,protocol://host:port,...
    const proxyListEnv = process.env.PROXY_LIST;
    
    if (proxyListEnv) {
      const proxyStrings = proxyListEnv.split(',');
      
      const newProxies = proxyStrings.map((proxyStr, index) => {
        try {
          // Parse the proxy URL
          // protocol://user:pass@host:port
          const match = proxyStr.match(/^(https?|socks[45]):\/\/(?:([^:@]+):([^@]+)@)?([^:]+):(\d+)$/i);
          
          if (match) {
            const [, protocol, username, password, host, portStr] = match;
            const port = parseInt(portStr, 10);
            
            if (host && !isNaN(port)) {
              return {
                id: `env-${index}`,
                protocol,
                host,
                port,
                username,
                password,
                sourceId: 'env',
                successCount: 0,
                failureCount: 0,
                avgResponseTime: 0,
                status: 'active' as const,
                tags: ['environment']
              };
            }
          }
          return null;
        } catch (error) {
          console.error(`Failed to parse proxy string: ${proxyStr}`, error);
          return null;
        }
      }).filter(Boolean) as ProxyServer[];
      
      if (newProxies.length > 0) {
        this.proxies = [...this.proxies, ...newProxies];
        console.log(`Added ${newProxies.length} proxies from environment variables`);
      }
    }
  }
  
  /**
   * Add a new proxy source
   */
  addSource(source: Partial<ProxySource>): ProxySource {
    if (!source.id) {
      source.id = `source-${Date.now()}`;
    }
    
    const newSource: ProxySource = {
      id: source.id,
      type: source.type || 'list',
      name: source.name || `Source ${this.sources.length + 1}`,
      url: source.url,
      apiKey: source.apiKey,
      refreshInterval: source.refreshInterval || 60,
      status: source.status || 'inactive',
      lastRefresh: source.lastRefresh
    };
    
    this.sources.push(newSource);
    this.saveConfig();
    
    console.log(`Added new proxy source: ${newSource.name}`);
    
    // If the source is active, refresh it immediately
    if (newSource.status === 'active') {
      this.refreshSource(newSource.id).catch(error => {
        console.error(`Error refreshing new source: ${error}`);
      });
    }
    
    return newSource;
  }
  
  /**
   * Add proxies to the manager
   */
  addProxies(newProxies: Partial<ProxyServer>[], sourceId?: string): number {
    const validProxies = newProxies.filter(p => p.host && p.port);
    
    const proxyId = (p: Partial<ProxyServer>) => `${p.host}:${p.port}`;
    const existingIds = new Set(this.proxies.map(p => proxyId(p)));
    
    let addedCount = 0;
    
    validProxies.forEach(proxyInfo => {
      const id = proxyId(proxyInfo);
      if (!existingIds.has(id)) {
        this.proxies.push({
          id,
          protocol: proxyInfo.protocol || 'http',
          host: proxyInfo.host!,
          port: proxyInfo.port!,
          username: proxyInfo.username,
          password: proxyInfo.password,
          sourceId: sourceId || proxyInfo.sourceId || 'manual',
          successCount: 0,
          failureCount: 0,
          avgResponseTime: 0,
          status: 'active',
          country: proxyInfo.country,
          city: proxyInfo.city,
          asn: proxyInfo.asn,
          tags: proxyInfo.tags || []
        });
        existingIds.add(id);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      console.log(`Added ${addedCount} new proxies to rotation pool`);
      logExecution(this.executionId, 'proxy-add', { count: addedCount, sourceId });
      this.saveConfig();
    }
    
    return addedCount;
  }

  /**
   * Configure axios to use the next proxy in the rotation
   */
  applyProxy(config: AxiosRequestConfig): AxiosRequestConfig {
    const activeProxies = this.proxies.filter(p => p.status === 'active');
    
    if (activeProxies.length === 0) {
      console.warn("No active proxies available, making direct connection");
      logExecution(this.executionId, 'proxy-direct-connect', { reason: 'no-active-proxies' });
      return config;
    }
    
    // Simple round-robin selection for now
    this.currentProxyIndex = (this.currentProxyIndex + 1) % activeProxies.length;
    const proxy = activeProxies[this.currentProxyIndex];
    
    // Record proxy usage
    proxy.lastUsed = new Date();
    
    // Format proxy URL based on auth requirements
    const proxyAuth = proxy.username && proxy.password
      ? `${proxy.username}:${proxy.password}@`
      : '';
    
    const proxyUrl = `${proxy.protocol}://${proxyAuth}${proxy.host}:${proxy.port}`;
    
    logExecution(this.executionId, 'proxy-selected', { proxyId: proxy.id });
    
    return {
      ...config,
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

  /**
   * Report proxy success or failure
   */
  reportProxyResult(host: string, port: number, success: boolean, responseTime?: number) {
    const proxyId = `${host}:${port}`;
    const proxy = this.proxies.find(p => p.id === proxyId);
    
    if (!proxy) return;
    
    if (success) {
      proxy.successCount++;
      
      // Update average response time
      if (responseTime) {
        const totalRespTime = proxy.avgResponseTime * proxy.successCount;
        proxy.avgResponseTime = (totalRespTime + responseTime) / (proxy.successCount + 1);
      }
      
      // Reset failure count on success
      proxy.failureCount = 0;
    } else {
      proxy.failureCount++;
      
      // Block proxy after consecutive failures
      if (proxy.failureCount >= this.maxFailuresBeforeBlocking) {
        proxy.status = 'blocked';
        logExecution(this.executionId, 'proxy-blocked', { proxyId, failures: proxy.failureCount });
      }
    }
    
    // Save config after reporting results
    this.saveConfig();
  }

  /**
   * Get a proxy configuration for the axios client
   */
  getProxyConfig(): AxiosRequestConfig {
    return this.applyProxy({});
  }

  /**
   * Schedule refreshes for proxy sources
   */
  private scheduleProxyRefreshes() {
    this.sources
      .filter(source => source.status === 'active' && source.refreshInterval && source.refreshInterval > 0)
      .forEach(source => {
        const interval = source.refreshInterval || 60;
        setInterval(() => {
          this.refreshSource(source.id).catch(error => {
            console.error(`Error refreshing proxy source ${source.name}: ${error}`);
          });
        }, interval * 60 * 1000);
      });
  }

  /**
   * Refresh proxies from a specific source
   */
  async refreshSource(sourceId: string): Promise<number> {
    const source = this.sources.find(s => s.id === sourceId);
    
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }
    
    if (source.status !== 'active') {
      return 0;
    }
    
    console.log(`Refreshing proxies from source: ${source.name}`);
    
    let addedCount = 0;
    
    try {
      switch (source.type) {
        case 'api':
          addedCount = await this.refreshFromApi(source);
          break;
        case 'service':
          addedCount = await this.refreshFromService(source);
          break;
        case 'list':
          if (sourceId === 'env') {
            this.loadProxiesFromEnv();
          }
          break;
      }
      
      // Update last refresh time
      source.lastRefresh = new Date();
      this.saveConfig();
      
      return addedCount;
    } catch (error) {
      console.error(`Error refreshing source ${source.name}:`, error);
      return 0;
    }
  }

  /**
   * Refresh proxies from an API source
   */
  private async refreshFromApi(source: ProxySource): Promise<number> {
    if (!source.url) {
      throw new Error(`API URL not specified for source: ${source.name}`);
    }
    
    try {
      let url = source.url;
      const apiKey = source.apiKey || this.proxyApiKeys[source.id];
      
      // Configure request based on API type
      let requestConfig: AxiosRequestConfig = {};
      
      if (source.id === 'geonode') {
        // Special handling for GeoNode API
        url = `${url}?limit=100&page=1&sort_by=lastChecked&sort_type=desc`;
        if (apiKey) {
          url += `&api_key=${apiKey}`;
        }
      } else if (source.id === 'pubproxy') {
        // Special handling for PubProxy
        url = `${url}?limit=20&format=json&https=true`;
      } else if (apiKey) {
        // Generic handling for APIs with keys
        requestConfig.headers = {
          'Authorization': `Bearer ${apiKey}`
        };
      }
      
      const response = await axios.get(url, requestConfig);
      
      // Process the response based on API type
      const newProxies: Partial<ProxyServer>[] = [];
      
      if (source.id === 'geonode') {
        // Handle GeoNode response format
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          response.data.data.forEach((item: any) => {
            if (item.ip && item.port) {
              newProxies.push({
                protocol: item.protocols && item.protocols[0] ? item.protocols[0].toLowerCase() : 'http',
                host: item.ip,
                port: parseInt(item.port, 10),
                country: item.country,
                city: item.city,
                asn: item.asn,
                tags: ['geonode', item.anonymityLevel && item.anonymityLevel.toLowerCase()]
              });
            }
          });
        }
      } else if (source.id === 'pubproxy') {
        // Handle PubProxy response format
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          response.data.data.forEach((item: any) => {
            if (item.ip && item.port) {
              newProxies.push({
                protocol: item.type ? item.type.toLowerCase() : 'http',
                host: item.ip,
                port: parseInt(item.port, 10),
                country: item.country,
                tags: ['pubproxy', item.type && item.type.toLowerCase()]
              });
            }
          });
        }
      }
      
      // Add the new proxies
      const addedCount = this.addProxies(newProxies, source.id);
      console.log(`Added ${addedCount} proxies from ${source.name}`);
      
      return addedCount;
    } catch (error) {
      console.error(`Error refreshing from API ${source.name}:`, error);
      return 0;
    }
  }

  /**
   * Refresh proxies from a proxy service
   */
  private async refreshFromService(source: ProxySource): Promise<number> {
    // Implement based on specific proxy services supported
    console.log(`Service type refresh not implemented for: ${source.name}`);
    return 0;
  }

  /**
   * Check health of all proxies in the pool
   */
  async checkProxyHealth(): Promise<{ 
    active: number; 
    blocked: number; 
    error: number;
    total: number;
    bySource: { [key: string]: { active: number; blocked: number; error: number; total: number } }
  }> {
    const results = { 
      active: 0, 
      blocked: 0, 
      error: 0,
      total: this.proxies.length,
      bySource: {} as { [key: string]: { active: number; blocked: number; error: number; total: number } }
    };
    
    // Initialize counts by source
    this.sources.forEach(source => {
      results.bySource[source.id] = { active: 0, blocked: 0, error: 0, total: 0 };
    });
    
    // Run health checks in smaller batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < this.proxies.length; i += batchSize) {
      const batch = this.proxies.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async proxy => {
          // Increment total count for this source
          if (results.bySource[proxy.sourceId]) {
            results.bySource[proxy.sourceId].total++;
          }
          
          const startTime = Date.now();
          try {
            await axios.get(this.healthCheckUrl, {
              proxy: {
                protocol: proxy.protocol,
                host: proxy.host,
                port: proxy.port,
                auth: proxy.username && proxy.password ? {
                  username: proxy.username,
                  password: proxy.password
                } : undefined
              },
              timeout: 10000 // 10 seconds timeout for health check
            });
            
            const responseTime = Date.now() - startTime;
            proxy.status = 'active';
            proxy.failureCount = 0;
            
            // Update average response time
            const totalRespTime = proxy.avgResponseTime * proxy.successCount;
            proxy.successCount++;
            proxy.avgResponseTime = (totalRespTime + responseTime) / proxy.successCount;
            
            // Increment active count
            results.active++;
            if (results.bySource[proxy.sourceId]) {
              results.bySource[proxy.sourceId].active++;
            }
            
            return { id: proxy.id, success: true, responseTime };
          } catch (error) {
            proxy.failureCount++;
            
            if (proxy.failureCount >= this.maxFailuresBeforeBlocking) {
              proxy.status = 'blocked';
              results.blocked++;
              if (results.bySource[proxy.sourceId]) {
                results.bySource[proxy.sourceId].blocked++;
              }
            } else if (proxy.status === 'error') {
              results.error++;
              if (results.bySource[proxy.sourceId]) {
                results.bySource[proxy.sourceId].error++;
              }
            }
            
            return { id: proxy.id, success: false, error: (error as Error).message };
          }
        })
      );
    }
    
    this.saveConfig();
    
    return results;
  }

  /**
   * Reset blocked proxies to active state
   */
  resetBlockedProxies() {
    let count = 0;
    
    this.proxies.forEach(proxy => {
      if (proxy.status === 'blocked') {
        proxy.status = 'active';
        proxy.failureCount = 0;
        count++;
      }
    });
    
    if (count > 0) {
      console.log(`Reset ${count} blocked proxies to active state`);
      this.saveConfig();
    }
    
    logExecution(this.executionId, 'proxy-reset', { count });
    return count;
  }

  /**
   * Get statistics about the proxy pool
   */
  getStats() {
    const active = this.proxies.filter(p => p.status === 'active').length;
    const blocked = this.proxies.filter(p => p.status === 'blocked').length;
    const error = this.proxies.filter(p => p.status === 'error').length;
    
    const avgResponseTime = this.proxies.reduce((sum, p) => sum + p.avgResponseTime, 0) / this.proxies.length;
    
    const topPerformers = [...this.proxies]
      .filter(p => p.successCount > 0)
      .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        avgResponseTime: p.avgResponseTime,
        successCount: p.successCount,
        protocol: p.protocol,
        country: p.country
      }));
    
    // Get stats by source
    const bySource = this.sources.map(source => {
      const sourceProxies = this.proxies.filter(p => p.sourceId === source.id);
      const sourceActive = sourceProxies.filter(p => p.status === 'active').length;
      const sourceBlocked = sourceProxies.filter(p => p.status === 'blocked').length;
      const sourceError = sourceProxies.filter(p => p.status === 'error').length;
      
      return {
        id: source.id,
        name: source.name,
        type: source.type,
        status: source.status,
        lastRefresh: source.lastRefresh,
        total: sourceProxies.length,
        active: sourceActive,
        blocked: sourceBlocked,
        error: sourceError
      };
    });
      
    return {
      total: this.proxies.length,
      active,
      blocked,
      error,
      avgResponseTime: isNaN(avgResponseTime) ? 0 : avgResponseTime,
      topPerformers,
      bySource,
      sources: {
        total: this.sources.length,
        active: this.sources.filter(s => s.status === 'active').length
      }
    };
  }
}

/**
 * Create an enhanced proxy manager instance with the provided execution ID
 */
export function createEnhancedProxyManager(executionId: string) {
  return new EnhancedProxyManager(executionId);
}