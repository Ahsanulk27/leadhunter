import * as puppeteer from 'puppeteer';
import { getRandomUserAgent, getRandomDelay } from './scraper-utils';

/**
 * A wrapper around Puppeteer with additional utilities for scraping
 * Provides anti-ban features and helper methods
 */
export class PuppeteerWrapper {
  /**
   * Launch a browser with proper configuration for scraping
   */
  async launch(): Promise<puppeteer.Browser> {
    return await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
      ignoreHTTPSErrors: true
    });
  }
  
  /**
   * Create a new page with a random user agent
   */
  async createPage(browser: puppeteer.Browser): Promise<puppeteer.Page> {
    const page = await browser.newPage();
    
    // Set a random user agent
    await page.setUserAgent(getRandomUserAgent());
    
    // Add a method to wait for a timeout
    (page as any).waitForTimeout = async (timeout: number) => {
      return new Promise(resolve => setTimeout(resolve, timeout));
    };
    
    // Add methods to handle captchas if needed
    (page as any).checkForCaptcha = async () => {
      const captchaSelectors = [
        'iframe[src*="captcha"]',
        'iframe[src*="recaptcha"]',
        '.g-recaptcha',
        'form[action*="captcha"]',
        'input[name*="captcha"]',
        'img[src*="captcha"]',
        'div:contains("captcha")',
        'div:contains("Verify you are a human")',
        'div:contains("Please verify")'
      ];
      
      for (const selector of captchaSelectors) {
        if (await page.$(selector)) {
          return true;
        }
      }
      
      return false;
    };
    
    return page;
  }
  
  /**
   * Navigate to a URL with randomized timing
   */
  async navigate(page: puppeteer.Page, url: string, options?: puppeteer.WaitForOptions): Promise<puppeteer.HTTPResponse | null> {
    try {
      // Add a small random delay before navigation
      await (page as any).waitForTimeout(getRandomDelay(500, 2000));
      
      // Navigate to the URL
      return await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 20000,
        ...options
      });
    } catch (error) {
      console.error(`Navigation error to ${url}:`, error);
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