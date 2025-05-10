/**
 * Utilities for web scraping with anti-ban protections
 * These help with rotating user agents and adding delays
 */

// Collection of realistic user agents to rotate through
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/108.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
];

/**
 * Get a random user agent from the list
 * This helps prevent blocking by rotating identities
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Generate a random delay between two values
 * This introduces natural variations in request timing to avoid detection
 * @param min Minimum delay in milliseconds
 * @param max Maximum delay in milliseconds
 */
export function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Generate a random jitter to add to a base delay
 * @param baseDelay The base delay to add jitter to
 * @param jitterPercent Maximum percentage variation (e.g. 0.2 for 20%)
 */
export function addJitter(baseDelay: number, jitterPercent: number = 0.2): number {
  const jitterAmount = baseDelay * jitterPercent;
  return baseDelay + (Math.random() * jitterAmount * 2 - jitterAmount);
}

/**
 * Handle common scraping errors including CAPTCHA detection
 * @param error The error that occurred
 * @param sourceName Name of the source being scraped (for logging)
 */
export function handleScrapingError(error: any, sourceName: string): void {
  // Check for common blocking/CAPTCHA patterns
  const errorText = error.toString().toLowerCase();
  
  if (errorText.includes('captcha') || 
      errorText.includes('403') || 
      errorText.includes('forbidden') ||
      errorText.includes('access denied') ||
      errorText.includes('blocked')) {
    
    console.error(`BLOCKED/CAPTCHA detected from ${sourceName}: ${error}`);
    // Log detailed info for debugging
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Headers: ${JSON.stringify(error.response.headers)}`);
    }
  } else if (errorText.includes('timeout') || 
            errorText.includes('socket hang up') ||
            errorText.includes('econnreset')) {
    console.error(`Connection issue with ${sourceName}: ${error}`);
  } else {
    console.error(`Error scraping ${sourceName}: ${error}`);
  }
}

/**
 * Extract valid email addresses from text 
 * Only extracts business-like emails (not personal-looking ones)
 * @param text Text to extract emails from
 */
export function extractBusinessEmails(text: string): string[] {
  // Basic email regex
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const matches = text.match(emailRegex) || [];
  
  // Business emails are more likely to have these patterns
  const businessEmails = matches.filter(email => {
    const prefix = email.split('@')[0].toLowerCase();
    return prefix.includes('info') ||
           prefix.includes('contact') ||
           prefix.includes('sales') ||
           prefix.includes('support') ||
           prefix.includes('hello') ||
           prefix.includes('admin') ||
           prefix.includes('office') ||
           prefix.includes('service') ||
           prefix.includes('business') ||
           prefix.includes('inquir') ||
           prefix.includes('help');
  });
  
  // Remove duplicates
  const uniqueSet = new Set<string>(businessEmails);
  return Array.from(uniqueSet);
}

/**
 * Extract phone numbers from text
 * @param text Text to extract phone numbers from
 */
export function extractPhoneNumbers(text: string): string[] {
  // This regex covers most common US phone formats
  const phoneRegex = /(?:\+?1[-\s.]?)?\(?([0-9]{3})\)?[-\s.]?([0-9]{3})[-\s.]?([0-9]{4})/g;
  const matches = text.match(phoneRegex) || [];
  
  // Remove duplicates
  const uniqueSet = new Set<string>(matches);
  return Array.from(uniqueSet);
}

/**
 * Checks if job title likely represents a decision maker
 * @param title Job title to check
 */
export function isDecisionMakerTitle(title: string = ""): boolean {
  const titleLower = title.toLowerCase();
  return titleLower.includes('ceo') ||
         titleLower.includes('cto') ||
         titleLower.includes('cfo') ||
         titleLower.includes('coo') ||
         titleLower.includes('chief') ||
         titleLower.includes('president') ||
         titleLower.includes('vp') ||
         titleLower.includes('vice president') ||
         titleLower.includes('director') ||
         titleLower.includes('head of') ||
         titleLower.includes('founder') ||
         titleLower.includes('owner') ||
         titleLower.includes('partner') ||
         titleLower.includes('principal');
}