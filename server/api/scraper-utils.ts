/**
 * Utility functions to support web scraping operations
 */

// Common user agents to rotate through to avoid detection
const USER_AGENTS = [
  // Windows Chrome
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  
  // Windows Firefox
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  
  // Windows Edge
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  
  // macOS Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  
  // macOS Chrome
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  
  // Linux Chrome
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  
  // Mobile User Agents (use sparingly, as these are less common for business searches)
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
];

/**
 * Get a random user agent from the list
 * This helps prevent blocking by rotating identities
 */
export function getRandomUserAgent(): string {
  const randomIndex = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[randomIndex];
}

/**
 * Generate a random delay between two values
 * This introduces natural variations in request timing to avoid detection
 * @param min Minimum delay in milliseconds
 * @param max Maximum delay in milliseconds
 */
export function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random jitter to add to a base delay
 * @param baseDelay The base delay to add jitter to
 * @param jitterPercent Maximum percentage variation (e.g. 0.2 for 20%)
 */
export function addJitter(baseDelay: number, jitterPercent: number = 0.2): number {
  const jitterAmount = baseDelay * jitterPercent;
  return baseDelay + getRandomDelay(-jitterAmount, jitterAmount);
}

/**
 * Handle common scraping errors including CAPTCHA detection
 * @param error The error that occurred
 * @param sourceName Name of the source being scraped (for logging)
 */
export function handleScrapingError(error: any, sourceName: string): void {
  console.error(`Error scraping ${sourceName}:`, error.message || error);
  
  // Check for common error types to provide better logging
  if (error.message && (
    error.message.includes('captcha') || 
    error.message.includes('CAPTCHA') ||
    error.message.includes('robot') ||
    error.message.includes('verify') ||
    error.message.includes('unusual activity') ||
    error.message.includes('blocked')
  )) {
    console.error(`⚠️ Detected possible CAPTCHA or blocking on ${sourceName}`);
  } else if (error.message && (
    error.message.includes('timeout') ||
    error.message.includes('Timeout') ||
    error.message.includes('timed out')
  )) {
    console.error(`⚠️ Request timed out when scraping ${sourceName}`);
  } else if (error.message && (
    error.message.includes('429') ||
    error.message.includes('too many requests')
  )) {
    console.error(`⚠️ Rate limited by ${sourceName}`);
  }
}

/**
 * Extract valid email addresses from text 
 * Only extracts business-like emails (not personal-looking ones)
 * @param text Text to extract emails from
 */
export function extractBusinessEmails(text: string): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex) || [];
  
  // Filter out likely personal emails
  const businessEmails = emails.filter(email => {
    const lowercasedEmail = email.toLowerCase();
    // Exclude common personal email domains
    if (lowercasedEmail.endsWith('@gmail.com') || 
        lowercasedEmail.endsWith('@hotmail.com') || 
        lowercasedEmail.endsWith('@yahoo.com') ||
        lowercasedEmail.endsWith('@aol.com') ||
        lowercasedEmail.endsWith('@outlook.com')) {
      return false;
    }
    
    // Exclude likely personal email usernames
    const username = lowercasedEmail.split('@')[0];
    if (username.length < 3) {
      return false;
    }
    
    return true;
  });
  
  // Return unique emails
  return [...new Set(businessEmails)];
}

/**
 * Extract phone numbers from text
 * @param text Text to extract phone numbers from
 */
export function extractPhoneNumbers(text: string): string[] {
  // Different phone number formats
  const phonePatterns = [
    // (123) 456-7890
    /\((\d{3})\)\s*(\d{3})[-. ]?(\d{4})/g,
    // 123-456-7890
    /(\d{3})[-. ](\d{3})[-. ](\d{4})/g,
    // 123.456.7890
    /(\d{3})[.](\d{3})[.](\d{4})/g,
    // 1234567890 (10 digits straight)
    /(?<!\d)(\d{10})(?!\d)/g,
    // +1 123 456 7890 (international format)
    /\+\d{1,3}[-. ]?(\d{3})[-. ]?(\d{3})[-. ]?(\d{4})/g
  ];
  
  const phoneNumbers: string[] = [];
  
  // Extract phone numbers using different patterns
  for (const pattern of phonePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      phoneNumbers.push(match[0]);
    }
  }
  
  // Return unique phone numbers
  return [...new Set(phoneNumbers)];
}

/**
 * Checks if job title likely represents a decision maker
 * @param title Job title to check
 */
export function isDecisionMakerTitle(title: string = ""): boolean {
  const lowerTitle = title.toLowerCase();
  
  // C-level executives
  if (
    lowerTitle.includes("ceo") ||
    lowerTitle.includes("cto") ||
    lowerTitle.includes("cfo") ||
    lowerTitle.includes("coo") ||
    lowerTitle.includes("chief") ||
    lowerTitle.includes("president") ||
    lowerTitle.includes("founder") ||
    lowerTitle.includes("owner")
  ) {
    return true;
  }
  
  // Directors and VPs
  if (
    lowerTitle.includes("director") ||
    lowerTitle.includes("vice president") ||
    lowerTitle.includes("vp ") ||
    lowerTitle.includes("head of")
  ) {
    return true;
  }
  
  // Managers
  if (
    lowerTitle.includes("manager") ||
    lowerTitle.includes("supervisor") ||
    lowerTitle.includes("lead")
  ) {
    return true;
  }
  
  return false;
}