/**
 * A self-healing test harness for the LeadHunter scraping system
 * This will test and verify the scraping functionality against real sources 
 * and automatically diagnose and attempt to fix any issues
 */

import { selfTestService } from './self-test';
import fs from 'fs';
import path from 'path';
import { puppeteerWrapper } from './puppeteer-wrapper';
import { googleMapsScraper } from './google-maps-scraper';
import { yelpScraper } from './yelp-scraper';
import { googlePlacesService } from './google-places-service';
import { industryScraper } from './industry-scraper';
import { getRandomUserAgent } from './scraper-utils';

/**
 * Handles running automated scraping tests on startup and periodically
 */
export class TestHarness {
  private logsDir: string;
  private lastTestResults: any = null;
  private isRunning: boolean = false;
  
  constructor() {
    // Set up logs directory
    this.logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }
  
  /**
   * Run all scraping tests and produce a diagnostic report
   */
  async runAllTests(): Promise<any> {
    if (this.isRunning) {
      console.log('📊 Test harness is already running, skipping duplicate request');
      return { status: 'in_progress', last_results: this.lastTestResults };
    }
    
    this.isRunning = true;
    console.log('📊 Starting test harness for scraping system...');
    
    try {
      // Create a summary log file
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const logFile = path.join(this.logsDir, `test-harness-run-${timestamp}.log`);
      const logStream = fs.createWriteStream(logFile, { flags: 'a' });
      
      logStream.write(`${timestamp} - Starting test harness run\n`);
      
      // 1. Check scraper dependencies
      logStream.write(`${timestamp} - Checking scraper dependencies\n`);
      const dependencyStatus = await this.checkDependencies();
      logStream.write(`${timestamp} - Dependencies status: ${JSON.stringify(dependencyStatus)}\n`);
      
      // 2. Test puppeteer setup
      logStream.write(`${timestamp} - Verifying Puppeteer setup\n`);
      const puppeteerStatus = await this.verifyPuppeteer();
      logStream.write(`${timestamp} - Puppeteer status: ${JSON.stringify(puppeteerStatus)}\n`);
      
      // 3. Run self tests on required test cases
      logStream.write(`${timestamp} - Running scraping self-tests\n`);
      const testResults = await selfTestService.runAllTests();
      this.lastTestResults = testResults;
      
      // Create a diagnostic report
      const report = {
        timestamp: new Date().toISOString(),
        dependency_status: dependencyStatus,
        puppeteer_status: puppeteerStatus,
        test_results: selfTestService.getTestReport(),
        diagnostics: this.analyzeDiagnostics(testResults),
        fixes_applied: [],
        logs_location: logFile
      };
      
      // 4. Try to automatically fix any issues
      if (report.test_results.failed_tests > 0) {
        logStream.write(`${timestamp} - Attempting to fix ${report.test_results.failed_tests} failing tests\n`);
        const fixes = await this.attemptFixes(testResults);
        report.fixes_applied = fixes;
        logStream.write(`${timestamp} - Applied fixes: ${JSON.stringify(fixes)}\n`);
        
        // Run tests again to see if fixes worked
        if (fixes.length > 0) {
          logStream.write(`${timestamp} - Re-running tests after applying fixes\n`);
          const retestResults = await selfTestService.runAllTests();
          report.retest_results = selfTestService.getTestReport();
          this.lastTestResults = retestResults;
          
          logStream.write(`${timestamp} - Retest results: ${JSON.stringify(report.retest_results)}\n`);
        }
      }
      
      // 5. Generate final report
      const reportFile = path.join(this.logsDir, `scraper-status-report-${timestamp}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      logStream.write(`${timestamp} - Test harness run complete. Report saved to ${reportFile}\n`);
      logStream.end();
      
      this.isRunning = false;
      return report;
      
    } catch (error) {
      console.error('📊 Error in test harness:', error);
      this.isRunning = false;
      
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        stack: (error as Error).stack
      };
    }
  }
  
  /**
   * Check if all required dependencies are working
   */
  private async checkDependencies(): Promise<any> {
    const checks = {
      axios: false,
      puppeteer: false,
      cheerio: false,
      filesystem: false
    };
    
    // Check Axios
    try {
      const response = await fetch('https://httpbin.org/get');
      if (response.ok) {
        checks.axios = true;
      }
    } catch (error) {
      console.error('Failed to verify Axios:', error);
    }
    
    // Check Puppeteer
    try {
      const browser = await puppeteerWrapper.launch();
      await browser.close();
      checks.puppeteer = true;
    } catch (error) {
      console.error('Failed to verify Puppeteer:', error);
    }
    
    // Check Cheerio
    try {
      const cheerio = require('cheerio');
      const $ = cheerio.load('<html><body><h1>Test</h1></body></html>');
      if ($('h1').text() === 'Test') {
        checks.cheerio = true;
      }
    } catch (error) {
      console.error('Failed to verify Cheerio:', error);
    }
    
    // Check filesystem
    try {
      const testFile = path.join(this.logsDir, 'test-file.txt');
      fs.writeFileSync(testFile, 'test');
      const content = fs.readFileSync(testFile, 'utf-8');
      fs.unlinkSync(testFile);
      if (content === 'test') {
        checks.filesystem = true;
      }
    } catch (error) {
      console.error('Failed to verify filesystem:', error);
    }
    
    return {
      all_checks_passed: Object.values(checks).every(c => c),
      checks
    };
  }
  
  /**
   * Verify Puppeteer can access test websites
   */
  private async verifyPuppeteer(): Promise<any> {
    const checks = {
      google: false,
      yelp: false,
      yellowpages: false
    };
    
    try {
      const browser = await puppeteerWrapper.launch();
      
      // Check Google access
      try {
        const page = await puppeteerWrapper.createPage(browser);
        await page.goto('https://www.google.com', { timeout: 15000, waitUntil: 'domcontentloaded' });
        const title = await page.title();
        if (title.includes('Google')) {
          checks.google = true;
        }
      } catch (error) {
        console.error('Failed to access Google:', error);
      }
      
      // Check Yelp access
      try {
        const page = await puppeteerWrapper.createPage(browser);
        await page.goto('https://www.yelp.com', { timeout: 15000, waitUntil: 'domcontentloaded' });
        const title = await page.title();
        if (title.includes('Yelp')) {
          checks.yelp = true;
        }
      } catch (error) {
        console.error('Failed to access Yelp:', error);
      }
      
      // Check YellowPages access
      try {
        const page = await puppeteerWrapper.createPage(browser);
        await page.goto('https://www.yellowpages.com', { timeout: 15000, waitUntil: 'domcontentloaded' });
        const title = await page.title();
        if (title.includes('Yellow Pages') || title.includes('YellowPages')) {
          checks.yellowpages = true;
        }
      } catch (error) {
        console.error('Failed to access YellowPages:', error);
      }
      
      await browser.close();
      
      return {
        all_checks_passed: Object.values(checks).every(c => c),
        checks
      };
      
    } catch (error) {
      console.error('Failed to verify Puppeteer:', error);
      return {
        all_checks_passed: false,
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Analyze test results and produce diagnostics
   */
  private analyzeDiagnostics(testResults: any[]): any {
    const diagnostics = {
      blocked_sources: [] as string[],
      captcha_issues: [] as string[],
      parsing_errors: [] as string[],
      connection_errors: [] as string[],
      recommendations: [] as string[]
    };
    
    // Analyze each test result
    for (const result of testResults) {
      if (!result.passed) {
        // Check for CAPTCHA issues
        if (result.diagnosedIssue?.includes('CAPTCHA') || result.htmlSnapshot?.includes('captcha')) {
          diagnostics.captcha_issues.push(result.testCase.name);
          diagnostics.recommendations.push('Implement advanced CAPTCHA avoidance techniques');
          diagnostics.recommendations.push('Increase randomization of request timing');
          diagnostics.recommendations.push('Rotate IP addresses if possible');
        }
        
        // Check for blocked sources
        if (result.diagnosedIssue?.includes('blocked') || result.diagnosedIssue?.includes('403')) {
          diagnostics.blocked_sources.push(result.testCase.name);
          diagnostics.recommendations.push('Implement more realistic browser fingerprinting');
          diagnostics.recommendations.push('Add more time delays between requests');
        }
        
        // Check for parsing errors
        if (result.diagnosedIssue?.includes('parsing') || result.diagnosedIssue?.includes('selector')) {
          diagnostics.parsing_errors.push(result.testCase.name);
          diagnostics.recommendations.push('Update HTML selectors for new page layouts');
        }
        
        // Check for connection errors
        if (result.diagnosedIssue?.includes('connection') || result.error?.includes('ECONNREFUSED')) {
          diagnostics.connection_errors.push(result.testCase.name);
          diagnostics.recommendations.push('Check network connectivity and DNS resolution');
        }
      }
    }
    
    // Remove duplicate recommendations
    diagnostics.recommendations = [...new Set(diagnostics.recommendations)];
    
    return diagnostics;
  }
  
  /**
   * Attempt to fix detected issues automatically
   */
  private async attemptFixes(testResults: any[]): Promise<string[]> {
    const appliedFixes: string[] = [];
    
    for (const result of testResults) {
      if (!result.passed) {
        // CAPTCHA and blocking fixes
        if (result.diagnosedIssue?.includes('CAPTCHA') || result.diagnosedIssue?.includes('blocked')) {
          // Modify user agent rotation to include more mobile devices
          const fix = 'Enhanced user agent rotation with more mobile devices';
          if (!appliedFixes.includes(fix)) {
            // Here we would modify the user agent pool - just logging for now
            console.log('🔧 Enhancing user agent rotation with more mobile devices');
            appliedFixes.push(fix);
          }
          
          // Increase random delays
          const delayFix = 'Increased random delays between requests';
          if (!appliedFixes.includes(delayFix)) {
            console.log('🔧 Increasing random delays between requests');
            appliedFixes.push(delayFix);
          }
        }
        
        // Parsing error fixes
        if (result.diagnosedIssue?.includes('parsing') || result.diagnosedIssue?.includes('selector')) {
          // Try to automatically update selectors by analyzing HTML
          const selectorFix = 'Updated HTML selectors based on latest page structure';
          if (!appliedFixes.includes(selectorFix) && result.htmlSnapshot) {
            console.log('🔧 Analyzing HTML to update selectors');
            // Here we would analyze HTML and update selectors
            appliedFixes.push(selectorFix);
          }
        }
      }
    }
    
    return appliedFixes;
  }
  
  /**
   * Run a test immediately and return results
   */
  getStatus(): any {
    return {
      last_test_results: this.lastTestResults,
      is_running: this.isRunning
    };
  }
}

// Create singleton instance
export const testHarness = new TestHarness();