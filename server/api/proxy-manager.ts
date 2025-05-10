/**
 * Proxy Manager for NexLead
 * Manages proxy rotation, health checks, and error handling
 */

import axios, { AxiosRequestConfig } from 'axios';
import { logExecution } from './scraper-utils';

export interface Proxy {
  id: string;
  protocol: string;  // http, https, socks4, socks5
  host: string;
  port: number;
  username?: string;
  password?: string;
  lastUsed?: Date;
  successCount: number;
  failureCount: number;
  avgResponseTime: number;
  status: 'active' | 'blocked' | 'error';
  country?: string;
  tags?: string[];
}

export class ProxyManager {
  private proxies: Proxy[] = [];
  private currentProxyIndex = 0;
  private executionId: string;
  private maxFailuresBeforeBlocking = 3;
  private healthCheckUrl = 'https://www.google.com';

  constructor(executionId: string) {
    this.executionId = executionId;
  }

  /**
   * Add proxies to the manager
   */
  addProxies(newProxies: Array<Partial<Proxy>>) {
    const validProxies = newProxies.filter(p => p.host && p.port);
    
    const proxyId = (p: Partial<Proxy>) => `${p.host}:${p.port}`;
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
          successCount: 0,
          failureCount: 0,
          avgResponseTime: 0,
          status: 'active',
          country: proxyInfo.country,
          tags: proxyInfo.tags || []
        });
        existingIds.add(id);
        addedCount++;
      }
    });
    
    console.log(`Added ${addedCount} new proxies to rotation pool`);
    logExecution(this.executionId, 'proxy-add', { count: addedCount });
    
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
  }

  /**
   * Get a proxy configuration for the axios client
   */
  getProxyConfig(): AxiosRequestConfig {
    return this.applyProxy({});
  }

  /**
   * Check health of all proxies in the pool
   */
  async checkProxyHealth(): Promise<{ active: number, blocked: number, total: number }> {
    const checkResults = await Promise.allSettled(
      this.proxies.map(async proxy => {
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
          
          return { id: proxy.id, success: true, responseTime };
        } catch (error) {
          proxy.failureCount++;
          if (proxy.failureCount >= this.maxFailuresBeforeBlocking) {
            proxy.status = 'blocked';
          }
          return { id: proxy.id, success: false, error: (error as Error).message };
        }
      })
    );
    
    const active = this.proxies.filter(p => p.status === 'active').length;
    const blocked = this.proxies.filter(p => p.status === 'blocked').length;
    
    logExecution(this.executionId, 'proxy-health-check', { 
      active, blocked, total: this.proxies.length, results: checkResults 
    });
    
    return { active, blocked, total: this.proxies.length };
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
        successCount: p.successCount
      }));
      
    return {
      total: this.proxies.length,
      active,
      blocked,
      error,
      avgResponseTime: isNaN(avgResponseTime) ? 0 : avgResponseTime,
      topPerformers
    };
  }
}

// Load proxies from environment variables if available
export function loadProxiesFromEnv(): Partial<Proxy>[] {
  const proxyList: Partial<Proxy>[] = [];
  
  // PROXY_LIST format: protocol://user:pass@host:port,protocol://host:port,...
  const proxyListEnv = process.env.PROXY_LIST;
  
  if (proxyListEnv) {
    const proxyStrings = proxyListEnv.split(',');
    
    proxyStrings.forEach(proxyStr => {
      try {
        // Parse the proxy URL
        // protocol://user:pass@host:port
        const match = proxyStr.match(/^(https?|socks[45]):\/\/(?:([^:@]+):([^@]+)@)?([^:]+):(\d+)$/i);
        
        if (match) {
          const [, protocol, username, password, host, portStr] = match;
          const port = parseInt(portStr, 10);
          
          if (host && !isNaN(port)) {
            proxyList.push({
              protocol,
              host,
              port,
              username,
              password
            });
          }
        }
      } catch (error) {
        console.error(`Failed to parse proxy string: ${proxyStr}`, error);
      }
    });
  }
  
  return proxyList;
}