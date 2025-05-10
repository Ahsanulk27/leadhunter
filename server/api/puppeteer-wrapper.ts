/**
 * Puppeteer wrapper service to handle browser management and anti-detection techniques
 * This centralizes all Puppeteer usage and provides utilities for managing browser instances
 */

import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

// Define interface for managing browser instances
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
    
    // Schedule browser cleanup to run every 5 minutes
    setInterval(() => {
      this.cleanupBrowsers();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Create a new browser instance
   */
  async createBrowser(userAgent?: string): Promise<BrowserInstance> {
    try {
      // Generate a random identifier for this browser instance
      const id = `browser-${Date.now()}-${randomBytes(4).toString('hex')}`;
      
      // Generate random viewport dimensions to vary fingerprint
      const width = 1366 + Math.floor(Math.random() * 300);
      const height = 768 + Math.floor(Math.random() * 200);
      
      console.log(`🌐 PuppeteerWrapper: Creating new browser (ID: ${id})`);
      
      // Launch a new browser with stealth mode settings
      const browser = await puppeteer.launch({
        headless: 'new', // Use the new headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-web-security',
          `--window-size=${width},${height}`,
          '--disable-features=IsolateOrigins,site-per-process',
          '--blink-settings=imagesEnabled=true'
        ],
        ignoreHTTPSErrors: true,
        defaultViewport: {
          width,
          height,
          deviceScaleFactor: Math.random() < 0.5 ? 1 : 2,
          hasTouch: Math.random() < 0.2,
          isLandscape: Math.random() < 0.9,
          isMobile: Math.random() < 0.1
        }
      });
      
      // Create a browser instance object to track this browser
      const instance: BrowserInstance = {
        browser,
        pages: new Set(),
        lastUsed: new Date(),
        userAgent,
        id
      };
      
      // Store the instance in our map
      this.browsers.set(id, instance);
      
      // Clean up old browsers if we have too many
      if (this.browsers.size > this.maxBrowsers) {
        await this.cleanupOldestBrowser();
      }
      
      return instance;
    } catch (error) {
      console.error('❌ PuppeteerWrapper: Error creating browser:', error);
      throw error;
    }
  }
  
  /**
   * Get an existing browser or create a new one
   */
  async getBrowser(userAgent?: string): Promise<BrowserInstance> {
    // Look for existing browser with the same user agent
    for (const instance of this.browsers.values()) {
      if ((!userAgent && !instance.userAgent) || 
          (userAgent && instance.userAgent === userAgent)) {
        // Update last used time
        instance.lastUsed = new Date();
        return instance;
      }
    }
    
    // No matching browser found, create a new one
    return this.createBrowser(userAgent);
  }
  
  /**
   * Create a new page in a browser with specified user agent
   */
  async newPage(userAgent?: string): Promise<puppeteer.Page> {
    try {
      // Get or create a browser instance
      const instance = await this.getBrowser(userAgent);
      
      // Create a new page
      const page = await instance.browser.newPage();
      
      // Set user agent if provided
      if (userAgent) {
        await page.setUserAgent(userAgent);
      }
      
      // Apply stealth mode settings
      await this.applyStealthMode(page);
      
      // Add this page to the tracked pages for this browser
      instance.pages.add(page);
      
      // Update last used time for this browser
      instance.lastUsed = new Date();
      
      // When the page is closed, remove it from our set
      page.once('close', () => {
        instance.pages.delete(page);
      });
      
      return page;
    } catch (error) {
      console.error('❌ PuppeteerWrapper: Error creating page:', error);
      throw error;
    }
  }
  
  /**
   * Apply stealth mode settings to avoid detection
   */
  private async applyStealthMode(page: puppeteer.Page): Promise<void> {
    try {
      // Randomize some WebGL fingerprinting data
      await page.evaluateOnNewDocument(() => {
        // Canvas fingerprint randomization
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        
        HTMLCanvasElement.prototype.toDataURL = function(type) {
          if (type === 'image/png' && this.width === 16 && this.height === 16) {
            // This is likely a fingerprint attempt, return a slightly different value
            const noise = Math.floor(Math.random() * 10) - 5;
            // Call the original, but add some noise to the output
            const dataURL = originalToDataURL.apply(this, [type]);
            return dataURL.replace(/.$/, (parseInt(dataURL.slice(-1), 36) + noise).toString(36));
          }
          return originalToDataURL.apply(this, arguments);
        };
        
        CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
          const imageData = originalGetImageData.apply(this, [sx, sy, sw, sh]);
          
          // Add slight random noise to fingerprinting attempts
          if ((sw === 16 && sh === 16) || // Common fingerprinting size
              (sw === 200 && sh === 50)) { // Another common fingerprinting size
            for (let i = 0; i < imageData.data.length; i += 4) {
              if (Math.random() < 0.01) { // Only modify some pixels
                const noise = Math.floor(Math.random() * 4) - 2;
                imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
                imageData.data[i+1] = Math.max(0, Math.min(255, imageData.data[i+1] + noise));
                imageData.data[i+2] = Math.max(0, Math.min(255, imageData.data[i+2] + noise));
              }
            }
          }
          
          return imageData;
        };
        
        // Override navigator properties
        const originalNavigator = window.navigator;
        
        // Override navigator permissions API
        const originalPermissions = navigator.permissions;
        if (originalPermissions) {
          navigator.permissions.query = async (parameters) => {
            if (parameters.name === 'notifications' || 
                parameters.name === 'clipboard-read' || 
                parameters.name === 'clipboard-write') {
              return { state: 'prompt', onchange: null };
            }
            
            // Fall back to original behavior
            // @ts-ignore
            return originalPermissions.query(parameters);
          };
        }
        
        // Override navigator plugins and MIME types
        Object.defineProperty(Navigator.prototype, 'plugins', {
          get: () => {
            // Return a non-empty array of plugins
            const fakePlugins = {
              length: 3,
              item: (index: number) => fakePlugins[index],
              0: {
                name: 'Chrome PDF Viewer',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format'
              },
              1: {
                name: 'Chrome PDF Plugin',
                filename: 'internal-pdf-plugin',
                description: 'Portable Document Format'
              },
              2: {
                name: 'Native Client',
                filename: 'internal-nacl-plugin',
                description: 'Native Client Executable'
              }
            };
            return fakePlugins;
          }
        });
        
        // Override webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false
        });
        
        // Override language properties with realistic values
        Object.defineProperty(navigator, 'language', {
          get: () => 'en-US'
        });
        
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en', 'es']
        });
        
        // Override hardware concurrency (CPU cores)
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => 8
        });
        
        // Override device memory
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => 8
        });
      });
      
      // Set default headers to mimic a real browser
      const headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Upgrade-Insecure-Requests': '1'
      };
      
      await page.setExtraHTTPHeaders(headers);
      
      // Set realistic viewport if not already set
      const viewport = page.viewport();
      if (!viewport) {
        await page.setViewport({
          width: 1366 + Math.floor(Math.random() * 300),
          height: 768 + Math.floor(Math.random() * 200),
          deviceScaleFactor: Math.random() < 0.5 ? 1 : 2
        });
      }
      
      // Disable features that make automation detectable
      await page.evaluateOnNewDocument(() => {
        // Remove webdriver flag
        delete (window as any).navigator.__proto__.webdriver;
        
        // Fake webRTC stack
        Object.defineProperty(navigator, 'mediaDevices', {
          get: () => undefined
        });
        
        // Remove Chrome automation flag
        delete (window as any).chrome;
      });
      
    } catch (error) {
      console.error('❌ PuppeteerWrapper: Error applying stealth mode:', error);
    }
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
    const filepath = path.join(screenshotDir, filename);
    
    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }
  
  /**
   * Close a specific browser instance
   */
  async closeBrowser(browserId: string): Promise<void> {
    const instance = this.browsers.get(browserId);
    if (instance) {
      console.log(`🌐 PuppeteerWrapper: Closing browser (ID: ${browserId})`);
      try {
        await instance.browser.close();
      } catch (error) {
        console.error(`❌ PuppeteerWrapper: Error closing browser ${browserId}:`, error);
      }
      this.browsers.delete(browserId);
    }
  }
  
  /**
   * Clean up browser instances that have been running for too long
   */
  private async cleanupBrowsers(): Promise<void> {
    console.log(`🌐 PuppeteerWrapper: Checking for browsers to cleanup (current count: ${this.browsers.size})`);
    
    const now = new Date().getTime();
    
    for (const [id, instance] of this.browsers.entries()) {
      const browserAge = now - instance.lastUsed.getTime();
      
      if (browserAge > this.browserLifetime) {
        console.log(`🌐 PuppeteerWrapper: Closing old browser (ID: ${id}, age: ${browserAge / 1000}s)`);
        await this.closeBrowser(id);
      }
    }
  }
  
  /**
   * Close the oldest browser instance to make room for new ones
   */
  private async cleanupOldestBrowser(): Promise<void> {
    let oldestId: string | null = null;
    let oldestTime = Date.now();
    
    for (const [id, instance] of this.browsers.entries()) {
      if (instance.lastUsed.getTime() < oldestTime) {
        oldestTime = instance.lastUsed.getTime();
        oldestId = id;
      }
    }
    
    if (oldestId) {
      console.log(`🌐 PuppeteerWrapper: Closing oldest browser (ID: ${oldestId})`);
      await this.closeBrowser(oldestId);
    }
  }
  
  /**
   * Bypass Cloudflare or other protection systems if detected
   */
  async bypassProtection(page: puppeteer.Page, url: string): Promise<boolean> {
    try {
      // Navigate to the URL
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Check if we're dealing with Cloudflare or similar protection
      const isCloudflare = await page.evaluate(() => {
        return document.querySelector('title')?.textContent?.includes('Cloudflare') || 
               document.querySelector('body')?.textContent?.includes('Checking your browser') ||
               document.querySelector('body')?.textContent?.includes('human verification') ||
               document.querySelector('body')?.textContent?.includes('DDoS protection') ||
               document.querySelector('body')?.textContent?.includes('security challenge');
      });
      
      if (isCloudflare) {
        console.log('🛡️ PuppeteerWrapper: Detected protection system, attempting to bypass...');
        
        // Take a screenshot for debugging
        await this.saveScreenshot(page, 'cloudflare-challenge');
        
        // Wait some time for the challenge to process
        await new Promise(r => setTimeout(r, 10000));
        
        // Sometimes we need to perform actions to pass the challenge
        try {
          // Try clicking any visible buttons or checkboxes
          const clickedSomething = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="checkbox"], .ray-id'));
            for (const button of buttons) {
              if (button.getBoundingClientRect().width > 0 && button.getBoundingClientRect().height > 0) {
                // @ts-ignore
                button.click();
                return true;
              }
            }
            return false;
          });
          
          if (clickedSomething) {
            console.log('🛡️ PuppeteerWrapper: Clicked on an element to try to bypass protection');
            await new Promise(r => setTimeout(r, 8000));
          }
        } catch (e) {
          console.error('❌ PuppeteerWrapper: Error when trying to click elements:', e);
        }
        
        // Move the mouse randomly to simulate human behavior
        const viewportWidth = page.viewport()?.width || 1366;
        const viewportHeight = page.viewport()?.height || 768;
        
        // Perform some random mouse movements
        for (let i = 0; i < 5; i++) {
          await page.mouse.move(
            Math.floor(Math.random() * viewportWidth), 
            Math.floor(Math.random() * viewportHeight),
            { steps: 25 }
          );
          await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
        }
        
        // Wait for navigation to complete
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
          .catch(() => console.log('🛡️ PuppeteerWrapper: Timeout waiting for navigation after protection'));
        
        // Take another screenshot to see if we passed
        await this.saveScreenshot(page, 'after-cloudflare');
        
        // Check if we're still on the protection page
        const stillProtected = await page.evaluate(() => {
          return document.querySelector('title')?.textContent?.includes('Cloudflare') || 
                 document.querySelector('body')?.textContent?.includes('Checking your browser') ||
                 document.querySelector('body')?.textContent?.includes('human verification') ||
                 document.querySelector('body')?.textContent?.includes('DDoS protection') ||
                 document.querySelector('body')?.textContent?.includes('security challenge');
        });
        
        if (stillProtected) {
          console.log('❌ PuppeteerWrapper: Failed to bypass protection system');
          return false;
        } else {
          console.log('✅ PuppeteerWrapper: Successfully bypassed protection system');
          return true;
        }
      }
      
      return true; // No protection detected
    } catch (error) {
      console.error(`❌ PuppeteerWrapper: Error navigating to ${url}:`, error);
      return false;
    }
  }
  
  /**
   * Execute health check to verify Puppeteer is working
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error', details: any }> {
    try {
      console.log('🌐 PuppeteerWrapper: Running health check...');
      
      // Create a new page for testing
      const page = await this.newPage();
      
      // Try to navigate to a simple URL
      await page.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Take a screenshot as evidence
      const screenshotPath = await this.saveScreenshot(page, 'health-check');
      
      // Check if we got the expected page title
      const title = await page.title();
      const isSuccess = title.includes('Example');
      
      // Close the page
      await page.close();
      
      if (isSuccess) {
        console.log('✅ PuppeteerWrapper: Health check passed');
        return { 
          status: 'ok', 
          details: { title, screenshotPath } 
        };
      } else {
        console.error('❌ PuppeteerWrapper: Health check failed - wrong page title');
        return { 
          status: 'error', 
          details: { title, screenshotPath, error: 'Wrong page title' } 
        };
      }
    } catch (error) {
      console.error('❌ PuppeteerWrapper: Health check failed with error:', error);
      return { 
        status: 'error', 
        details: { error: (error as Error).message, stack: (error as Error).stack } 
      };
    }
  }
}

export const puppeteerWrapper = new PuppeteerWrapper();