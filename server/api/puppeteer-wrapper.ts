/**
 * Puppeteer wrapper service to handle browser management and anti-detection techniques
 * This centralizes all Puppeteer usage and provides utilities for managing browser instances
 */

import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

interface BrowserInstance {
  browser: puppeteer.Browser;
  pages: Set<puppeteer.Page>;
  lastUsed: Date;
  userAgent?: string;
  id: string;
}

export class PuppeteerWrapper {
  private browsers: Map<string, BrowserInstance> = new Map();
  private maxBrowsers: number = 3;
  private browserLifetime: number = 60 * 60 * 1000; // 1 hour in milliseconds
  private logsDir = path.join(process.cwd(), 'logs');
  
  constructor() {
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // Set up a cleanup interval to manage browser instances
    setInterval(() => this.cleanupBrowsers(), 5 * 60 * 1000); // Check every 5 minutes
  }
  
  /**
   * Create a new browser instance
   */
  async createBrowser(userAgent?: string): Promise<BrowserInstance> {
    try {
      // Clean up old browsers if we're at capacity
      if (this.browsers.size >= this.maxBrowsers) {
        this.cleanupOldestBrowser();
      }
      
      // Launch browser with stealth settings
      const browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--window-position=0,0',
          '--ignore-certificate-errors',
          '--ignore-certificate-errors-spki-list',
          '--disable-extensions',
          '--disable-dev-shm-usage'
        ],
        defaultViewport: {
          width: 1366,
          height: 768
        },
        headless: true
      });
      
      // Track the browser instance
      const browserId = `browser-${Date.now()}-${randomBytes(4).toString('hex')}`;
      const instance: BrowserInstance = {
        browser,
        pages: new Set(),
        lastUsed: new Date(),
        userAgent,
        id: browserId
      };
      
      this.browsers.set(browserId, instance);
      
      console.log(`🔧 PuppeteerWrapper: Created new browser instance ${browserId}`);
      
      return instance;
    } catch (error) {
      console.error('❌ Error creating browser:', error);
      throw error;
    }
  }
  
  /**
   * Get an existing browser or create a new one
   */
  async getBrowser(userAgent?: string): Promise<BrowserInstance> {
    let bestMatch: BrowserInstance | null = null;
    
    // Try to find an existing browser with matching userAgent
    if (userAgent) {
      for (const instance of this.browsers.values()) {
        if (instance.userAgent === userAgent) {
          bestMatch = instance;
          break;
        }
      }
    }
    
    // If no matching browser, choose any available browser
    if (!bestMatch && this.browsers.size > 0) {
      bestMatch = Array.from(this.browsers.values())[0];
    }
    
    // If we found a suitable browser, update its last used time
    if (bestMatch) {
      bestMatch.lastUsed = new Date();
      return bestMatch;
    }
    
    // Otherwise create a new browser
    return this.createBrowser(userAgent);
  }
  
  /**
   * Create a new page in a browser with specified user agent
   */
  async newPage(userAgent?: string): Promise<puppeteer.Page> {
    try {
      const instance = await this.getBrowser(userAgent);
      const page = await instance.browser.newPage();
      
      // Set user agent if provided
      if (userAgent) {
        await page.setUserAgent(userAgent);
      }
      
      // Apply anti-detection measures
      await this.applyStealthMode(page);
      
      // Track the page in the browser instance
      instance.pages.add(page);
      
      // Set up cleanup when page closes
      page.once('close', () => {
        instance.pages.delete(page);
      });
      
      return page;
    } catch (error) {
      console.error('❌ Error creating page:', error);
      throw error;
    }
  }
  
  /**
   * Apply stealth mode settings to avoid detection
   */
  private async applyStealthMode(page: puppeteer.Page): Promise<void> {
    // Randomize WebGL details to avoid fingerprinting
    await page.evaluateOnNewDocument(() => {
      // Override WebGL fingerprinting
      const getParameterProto = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return 'Intel Open Source Technology Center';
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return 'Mesa DRI Intel(R) Iris(TM) Plus Graphics (ICL GT2)';
        }
        return getParameterProto.call(this, parameter);
      };
      
      // Override navigator properties
      const createGetter = (prop: string, value: any) => {
        Object.defineProperty(navigator, prop, {
          get: () => value
        });
      };
      
      // Modify navigator properties to appear more like a regular browser
      createGetter('webdriver', false);
      createGetter('plugins', {
        length: 3,
        refresh: () => {},
        item: (i: number) => ({name: `Plugin ${i}`, filename: `plugin-${i}.dll`})
      });
      
      // Try to prevent detection of automation
      createGetter('languages', ['en-US', 'en']);
      
      // Override the permissions API
      const permissionsProto = Permissions.prototype;
      const oldQuery = permissionsProto.query;
      permissionsProto.query = function(parameters) {
        return Promise.resolve({state: 'prompt', onchange: null});
      };
    });
    
    // Set default browser viewport
    await page.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
    });
    
    // Set tracking/privacy settings
    await page.evaluateOnNewDocument(() => {
      // Set browser details that might be used for fingerprinting
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
      Object.defineProperty(navigator, 'connection', { 
        get: () => ({
          effectiveType: '4g',
          rtt: 50,
          downlink: 10.0,
          saveData: false
        })
      });
    });
  }
  
  /**
   * Take a screenshot and save it to the logs directory
   */
  async saveScreenshot(page: puppeteer.Page, name: string): Promise<string> {
    const screenshotDir = path.join(this.logsDir, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const filename = `${name}-${Date.now()}.png`;
    const filePath = path.join(screenshotDir, filename);
    
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  }
  
  /**
   * Close a specific browser instance
   */
  async closeBrowser(browserId: string): Promise<void> {
    const instance = this.browsers.get(browserId);
    if (instance) {
      try {
        await instance.browser.close();
        this.browsers.delete(browserId);
        console.log(`🔧 PuppeteerWrapper: Closed browser instance ${browserId}`);
      } catch (error) {
        console.error(`❌ Error closing browser ${browserId}:`, error);
        // Clean up the instance even if there was an error
        this.browsers.delete(browserId);
      }
    }
  }
  
  /**
   * Clean up browser instances that have been running for too long
   */
  private async cleanupBrowsers(): Promise<void> {
    const now = new Date();
    const browsersToClose: string[] = [];
    
    for (const [id, instance] of this.browsers.entries()) {
      const age = now.getTime() - instance.lastUsed.getTime();
      if (age > this.browserLifetime) {
        browsersToClose.push(id);
      }
    }
    
    for (const id of browsersToClose) {
      await this.closeBrowser(id);
    }
    
    if (browsersToClose.length > 0) {
      console.log(`🧹 PuppeteerWrapper: Cleaned up ${browsersToClose.length} browser instances`);
    }
  }
  
  /**
   * Close the oldest browser instance to make room for new ones
   */
  private async cleanupOldestBrowser(): Promise<void> {
    if (this.browsers.size === 0) return;
    
    let oldestId: string | null = null;
    let oldestTime = Date.now();
    
    for (const [id, instance] of this.browsers.entries()) {
      if (instance.lastUsed.getTime() < oldestTime) {
        oldestTime = instance.lastUsed.getTime();
        oldestId = id;
      }
    }
    
    if (oldestId) {
      await this.closeBrowser(oldestId);
    }
  }
  
  /**
   * Bypass Cloudflare or other protection systems if detected
   */
  async bypassProtection(page: puppeteer.Page, url: string): Promise<boolean> {
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      if (!response) {
        console.warn('⚠️ No response received from page');
        return false;
      }
      
      const html = await page.content();
      
      // Check if we've hit Cloudflare or similar protection
      if (
        html.includes('challenge-running') || 
        html.includes('challenge-form') || 
        html.includes('captcha') ||
        html.includes('cf-browser-verification') ||
        html.includes('Just a moment') ||
        html.includes('security check')
      ) {
        console.log('🛡️ Protection system detected, attempting to bypass...');
        
        // Take a screenshot for debugging
        await this.saveScreenshot(page, 'protection-detected');
        
        // Wait a while to see if the challenge resolves automatically
        await page.waitForTimeout(5000);
        
        // Sometimes Cloudflare auto-resolves after a few seconds
        const newHtml = await page.content();
        if (
          !newHtml.includes('challenge-running') && 
          !newHtml.includes('challenge-form') && 
          !newHtml.includes('captcha') &&
          !newHtml.includes('cf-browser-verification') &&
          !newHtml.includes('Just a moment') &&
          !newHtml.includes('security check')
        ) {
          console.log('🎉 Protection was bypassed automatically');
          return true;
        }
        
        // Try to find and click the checkbox or verification button
        try {
          // Look for common protection elements
          const selectors = [
            'input[type="checkbox"]',
            'form .button',
            '.captcha-container',
            '#challenge-stage button',
            '.ray-id'
          ];
          
          for (const selector of selectors) {
            const exists = await page.$(selector);
            if (exists) {
              console.log(`Found ${selector}, attempting to interact...`);
              await page.click(selector);
              await page.waitForTimeout(2000);
            }
          }
          
          // Wait for navigation after interaction
          await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
          
          // Check if we passed the protection
          const finalHtml = await page.content();
          const passed = !finalHtml.includes('challenge-running') && 
                         !finalHtml.includes('challenge-form') && 
                         !finalHtml.includes('captcha') &&
                         !finalHtml.includes('cf-browser-verification') &&
                         !finalHtml.includes('Just a moment') &&
                         !finalHtml.includes('security check');
          
          if (passed) {
            console.log('🎉 Successfully bypassed protection');
            return true;
          } else {
            console.warn('⚠️ Failed to bypass protection');
            return false;
          }
        } catch (error) {
          console.error('❌ Error trying to bypass protection:', error);
          return false;
        }
      }
      
      // No protection detected
      return true;
    } catch (error) {
      console.error('❌ Error in bypassProtection:', error);
      return false;
    }
  }
  
  /**
   * Execute health check to verify Puppeteer is working
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error', details: any }> {
    try {
      const testStart = Date.now();
      
      // Create a test browser and page
      const instance = await this.createBrowser();
      const page = await instance.browser.newPage();
      
      // Visit a simple site
      await page.goto('https://example.com', { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Take a screenshot for verification
      const screenshotPath = await this.saveScreenshot(page, 'health-check');
      
      // Get page title
      const title = await page.title();
      
      // Close the page and browser
      await page.close();
      await this.closeBrowser(instance.id);
      
      return {
        status: 'ok',
        details: {
          title,
          executionTimeMs: Date.now() - testStart,
          screenshotPath,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Puppeteer health check failed:', error);
      
      return {
        status: 'error',
        details: {
          error: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

// Export singleton instance
export const puppeteerWrapper = new PuppeteerWrapper();