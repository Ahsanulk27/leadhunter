import * as puppeteer from 'puppeteer';
import { getRandomUserAgent, getRandomDelay } from './scraper-utils';

/**
 * A wrapper around Puppeteer with additional utilities for scraping
 * Provides anti-ban features and helper methods
 */
export class PuppeteerWrapper {
  /**
   * Improved method to check if the page contains a CAPTCHA
   * This analyzes both DOM elements and page content
   */
  private async checkForCaptcha(page: puppeteer.Page): Promise<boolean> {
    try {
      console.log(`📍 PuppeteerWrapper: Checking for CAPTCHA presence`);
      
      // More comprehensive list of captcha selectors
      const captchaSelectors = [
        'div[data-captcha]',
        'div.g-recaptcha',
        'iframe[src*="recaptcha"]',
        'iframe[src*="captcha"]',
        'div.rc-anchor',
        'form#captcha',
        'img[src*="captcha"]',
        'form[action*="captcha"]',
        'input[name*="captcha"]',
        'div.captcha',
        '#captcha',
        '.recaptcha'
      ];
      
      for (const selector of captchaSelectors) {
        try {
          const foundCaptcha = await page.$(selector);
          if (foundCaptcha) {
            console.log(`Found CAPTCHA with selector: ${selector}`);
            return true;
          }
        } catch (e) {
          // Ignore errors for individual selectors
        }
      }
      
      // Check page title and content for CAPTCHA-related terms
      const pageTitle = await page.title();
      const bodyContent = await page.evaluate(() => document.body.innerText);
      
      const captchaTerms = [
        'captcha', 
        'robot', 
        'verify', 
        'human', 
        'suspicious', 
        'security check',
        'prove you\'re not',
        'unusual traffic',
        'automated access',
        'blocked',
        'challenge'
      ];
      
      for (const term of captchaTerms) {
        if (
          pageTitle.toLowerCase().includes(term) ||
          bodyContent.toLowerCase().includes(term)
        ) {
          console.log(`CAPTCHA detected based on term: ${term}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for CAPTCHA:', error);
      return false;
    }
  }
  
  /**
   * Launch a browser with proper configuration for scraping
   */
  async launch(): Promise<puppeteer.Browser> {
    console.log('🤖 Launching browser with anti-detection measures...');
    return await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--lang=en-US,en',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-dev-shm-usage',
        '--enable-features=NetworkService',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--use-gl=swiftshader',
        '--window-size=1920,1080'
      ],
      // @ts-ignore - ignoreHTTPSErrors exists but TypeScript definition may be outdated
      ignoreHTTPSErrors: true,
      headless: true
    });
  }
  
  /**
   * Create a new page with a random user agent and anti-detection measures
   */
  async createPage(browser: puppeteer.Browser): Promise<puppeteer.Page> {
    const page = await browser.newPage();
    
    // Get random user agent
    const userAgent = getRandomUserAgent();
    console.log(`🤖 Setting user agent: ${userAgent}`);
    
    // Set a random user agent
    await page.setUserAgent(userAgent);
    
    // Set viewport to a common desktop resolution
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set language to English
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });
    
    // Add more sophisticated browser fingerprinting evasion
    await page.evaluateOnNewDocument(() => {
      // Overwrite the 'plugins' property to use a custom getter
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          // Create a plugins array with common plugins
          return [
            {
              0: {
                type: 'application/pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format'
              },
              name: 'Chrome PDF Plugin',
              filename: 'internal-pdf-viewer',
              description: 'Portable Document Format',
              length: 1
            },
            {
              0: {
                type: 'application/x-google-chrome-pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format'
              },
              name: 'Chrome PDF Viewer',
              filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
              description: 'Portable Document Format',
              length: 1
            }
          ];
        }
      });
      
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });
      
      // Override languages property
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      
      // Override platform property
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32'
      });
    });
    
    // Add a method to wait for a timeout
    (page as any).waitForTimeout = async (timeout: number) => {
      return new Promise(resolve => setTimeout(resolve, timeout));
    };
    
    // Add methods to handle captchas if needed - use our improved implementation
    (page as any).checkForCaptcha = async () => {
      return await this.checkForCaptcha(page);
    };
    
    // Add a method to log the page HTML for debugging purposes
    (page as any).logHtml = async () => {
      const html = await page.content();
      console.log('📄 PAGE HTML:', html.substring(0, 500) + '... [truncated]');
      return html;
    };
    
    return page;
  }
  
  /**
   * Navigate to a URL with randomized timing and ensure complete page load
   */
  async navigate(page: puppeteer.Page, url: string, options?: puppeteer.WaitForOptions): Promise<puppeteer.HTTPResponse | null> {
    try {
      console.log(`🌐 Navigating to: ${url}`);
      
      // Add a small random delay before navigation to simulate human behavior
      const preDelay = getRandomDelay(1000, 3000);
      console.log(`⏱️ Pre-navigation delay: ${preDelay}ms`);
      await (page as any).waitForTimeout(preDelay);
      
      // Log the navigation start
      console.log(`🔄 Starting navigation to ${url}...`);
      
      try {
        // Navigate to the URL with longer timeout and networkidle0 for complete page load
        const response = await page.goto(url, {
          waitUntil: 'networkidle0', // Wait until there are no network connections for at least 500ms
          timeout: 30000, // Increased timeout to 30 seconds
          ...options
        });
        
        // Check response status code
        if (response) {
          const status = response.status();
          if (status >= 400) {
            console.error(`❌ Navigation to ${url} failed with status code ${status}`);
            
            // Log response headers for debugging
            console.log('Response headers:', await response.headers());
            
            // Get and log response body for error diagnosis
            const responseBody = await response.text();
            console.log(`Response body (first 1000 chars): ${responseBody.substring(0, 1000)}`);
            
            if (status === 403) {
              console.error(`🚫 BLOCKED: Access to ${url} is forbidden - likely blocked by the server`);
            }
          }
        }
        
        return response;
      } catch (error) {
        const navigationError = error as Error;
        console.error(`❌ Navigation failed: ${navigationError.message}`);
        return null;
      }
      
      // Random post-navigation delay to simulate reading the page
      const postDelay = getRandomDelay(2000, 5000);
      console.log(`⏱️ Post-navigation delay: ${postDelay}ms`);
      await (page as any).waitForTimeout(postDelay);
      
      // Log the full HTML for verification
      await (page as any).logHtml();
      
      return response;
    } catch (error) {
      console.error(`❌ Navigation error to ${url}:`, error);
      return null;
    }
  }
  
  /**
   * Wait for a selector with a timeout
   */
  async waitForSelector(page: puppeteer.Page, selector: string, timeout: number = 10000): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Wait for a randomized delay
   */
  async randomDelay(page: puppeteer.Page, min: number = 1000, max: number = 3000): Promise<void> {
    await (page as any).waitForTimeout(getRandomDelay(min, max));
  }
  
  /**
   * Extract text from an element safely
   */
  async getElementText(page: puppeteer.Page, selector: string): Promise<string> {
    try {
      return await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        return element ? element.textContent?.trim() || '' : '';
      }, selector);
    } catch (error) {
      return '';
    }
  }
  
  /**
   * Get attribute value from an element safely
   */
  async getElementAttribute(page: puppeteer.Page, selector: string, attribute: string): Promise<string> {
    try {
      return await page.evaluate((sel, attr) => {
        const element = document.querySelector(sel);
        return element ? element.getAttribute(attr) || '' : '';
      }, selector, attribute);
    } catch (error) {
      return '';
    }
  }
  
  /**
   * Click an element with randomized timing
   */
  async clickElement(page: puppeteer.Page, selector: string): Promise<boolean> {
    try {
      await this.randomDelay(page, 500, 1500);
      await page.click(selector);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Type text with human-like delays between keystrokes
   */
  async typeText(page: puppeteer.Page, selector: string, text: string): Promise<boolean> {
    try {
      await page.click(selector);
      
      // Clear existing text first
      await page.evaluate((sel) => {
        const element = document.querySelector(sel) as HTMLInputElement;
        if (element) element.value = '';
      }, selector);
      
      // Type with random delays between keystrokes
      for (const char of text) {
        await page.type(selector, char, { delay: getRandomDelay(50, 150) });
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export a singleton instance
export const puppeteerWrapper = new PuppeteerWrapper();