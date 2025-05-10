/**
 * Utilities for web scraping operations in NexLead
 * Provides helper functions for anti-bot measures, request randomization, and error handling
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Collection of user agents for rotation
const USER_AGENTS = [
  // Desktop browsers
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 Edg/92.0.902.67',
  
  // Mobile browsers
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Android 12; Mobile; rv:92.0) Gecko/92.0 Firefox/92.0',
  'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 199.0.0.32.135 (iPhone12,1; iOS 14_7_1; en_US; en-US; scale=2.00; 828x1792; 309866906)',
  
  // Web crawlers (legitimate ones)
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; Bing; +https://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)',
  'Mozilla/5.0 (compatible; AmazonBot/1.0; +http://www.amazon.com/gp/customer-content/processing/crawler.html)',
  'Mozilla/5.0 (compatible; DuckDuckBot-Https/1.1; https://duckduckgo.com/duckduckbot)'
];

// Headers to simulate a real browser
const COMMON_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Referer': 'https://www.google.com/'
};

/**
 * Get a random user agent from the list
 */
export function getRandomUserAgent(): string {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[index];
}

/**
 * Get standard headers with a random user agent
 */
export function getRandomizedHeaders(): Record<string, string> {
  return {
    ...COMMON_HEADERS,
    'User-Agent': getRandomUserAgent()
  };
}

/**
 * Get a random delay time (in milliseconds)
 * Used to mimic human browsing behavior and avoid rate limiting
 */
export function randomDelay(min = 1000, max = 5000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for the specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a standardized search-safe query string
 */
export function formatSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
}

/**
 * Check if a page contains CAPTCHA based on common patterns
 */
export function detectCaptcha(html: string): boolean {
  const captchaPatterns = [
    'captcha',
    'robot',
    'verify you are human',
    'prove you are human',
    'security check',
    'i\'m not a robot',
    'recaptcha',
    'hcaptcha',
    'cloudflare',
    'access denied',
    'automated requests',
    'blocked',
    'banned',
    'bot detected',
    'unusual traffic'
  ];
  
  const lowerHtml = html.toLowerCase();
  return captchaPatterns.some(pattern => lowerHtml.includes(pattern));
}

/**
 * Save HTML snapshot for debugging
 */
export function saveHtmlSnapshot(html: string, source: string, query: string): string {
  const logsDir = path.join(process.cwd(), 'logs', 'snapshots');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const filename = `${source}-${formatSearchQuery(query)}-${Date.now()}.html`;
  const filePath = path.join(logsDir, filename);
  
  fs.writeFileSync(filePath, html);
  return filePath;
}

/**
 * Extract contact information from text using regex patterns
 */
export function extractContactInfo(text: string): {
  emails: string[];
  phones: string[];
  possibleNames: string[];
} {
  // Email regex
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  
  // Phone regex - matches various formats
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  
  // Name patterns (approximate)
  const nameRegex = /(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?(?:\s[A-Z][a-z]+)?)/g;
  
  const emails = [...new Set(text.match(emailRegex) || [])];
  const phones = [...new Set(text.match(phoneRegex) || [])].map(phone => 
    phone.replace(/[^\d]/g, '').replace(/^1?(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
  );
  const possibleNames = [...new Set(text.match(nameRegex) || [])];
  
  return {
    emails,
    phones,
    possibleNames
  };
}

/**
 * Check if a job title is likely to be a decision maker
 */
export function isDecisionMakerTitle(title: string = ""): boolean {
  const decisionMakerPatterns = [
    'owner',
    'ceo',
    'chief',
    'president',
    'founder',
    'director',
    'manager',
    'head',
    'executive',
    'principal',
    'partner',
    'officer',
    'board',
    'chairman',
    'chairwoman',
    'chairperson',
    'vp',
    'vice president',
    'senior',
    'lead'
  ];
  
  const lowerTitle = title.toLowerCase();
  return decisionMakerPatterns.some(pattern => lowerTitle.includes(pattern));
}

/**
 * Calculate exponential backoff time for retries
 */
export function calculateBackoff(attempt: number, baseDelay = 1000, maxDelay = 60000): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to avoid thundering herd problem
  return delay + (Math.random() * delay * 0.1);
}

/**
 * Log execution details to file
 */
export function logExecution(executionId: string, action: string, details: any): void {
  const logsDir = path.join(process.cwd(), 'logs', 'executions');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const logFile = path.join(logsDir, `${executionId}.log`);
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    action,
    details
  };
  
  try {
    if (fs.existsSync(logFile)) {
      const existingLog = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      existingLog.push(logEntry);
      fs.writeFileSync(logFile, JSON.stringify(existingLog, null, 2));
    } else {
      fs.writeFileSync(logFile, JSON.stringify([logEntry], null, 2));
    }
  } catch (error) {
    console.error(`Error writing to execution log: ${error}`);
  }
}

/**
 * Generate a unique execution ID
 */
export function generateExecutionId(): string {
  return uuidv4().substring(0, 8);
}