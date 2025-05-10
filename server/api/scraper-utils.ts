/**
 * Utility functions for the scraper
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Log execution events to a file
 */
export function logExecution(executionId: string, event: string, data: any) {
  try {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs', 'executions');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Create or append to log file
    const logFile = path.join(logsDir, `${executionId}.json`);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data
    };
    
    let logs: any[] = [];
    
    // Read existing logs if file exists
    if (fs.existsSync(logFile)) {
      try {
        const content = fs.readFileSync(logFile, 'utf-8');
        logs = JSON.parse(content);
      } catch (error) {
        console.error(`Error reading log file ${logFile}:`, error);
      }
    }
    
    // Add new log entry
    logs.push(logEntry);
    
    // Write back to file
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error logging execution:', error);
    return false;
  }
}

/**
 * Generate a unique execution ID
 */
export function generateExecutionId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Save HTML content to cache
 */
export function saveHtmlCache(executionId: string, type: string, html: string): string {
  try {
    // Create cache directory if it doesn't exist
    const cacheDir = path.join(process.cwd(), 'logs', 'html-cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    // Generate filename
    const filename = `${type}-${executionId}.html`;
    const filePath = path.join(cacheDir, filename);
    
    // Write HTML to file
    fs.writeFileSync(filePath, html);
    
    return filename;
  } catch (error) {
    console.error('Error saving HTML cache:', error);
    return '';
  }
}

/**
 * Read HTML content from cache
 */
export function readHtmlCache(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), 'logs', 'html-cache', filename);
    
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    
    return '';
  } catch (error) {
    console.error('Error reading HTML cache:', error);
    return '';
  }
}

/**
 * Create a proxy-protected scraper
 */
export function createProxyScraper(executionId: string, proxyManager: any) {
  return {
    executionId,
    proxyManager,
    
    /**
     * Fetch a URL with proxy protection
     */
    async fetch(url: string, options: any = {}) {
      // Implementation will be added
    }
  };
}