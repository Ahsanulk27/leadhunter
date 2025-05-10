/**
 * Utility functions for web scraping
 */

// List of modern user agents for web scraping
const userAgents = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36',
  
  // Chrome on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36',
  
  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0',
  
  // Firefox on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:90.0) Gecko/20100101 Firefox/90.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 11.5; rv:92.0) Gecko/20100101 Firefox/92.0',
  
  // Safari on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
  
  // Edge on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36 Edg/92.0.902.62',
  
  // Mobile User Agents
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Mobile Safari/537.36',
];

/**
 * Get a random user agent from the list
 */
export function getRandomUserAgent(): string {
  const randomIndex = Math.floor(Math.random() * userAgents.length);
  return userAgents[randomIndex];
}

/**
 * Generate a random delay between min and max milliseconds
 */
export function randomDelay(min = 1000, max = 5000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Wait for a random amount of time
 */
export async function waitRandomTime(min = 1000, max = 5000): Promise<void> {
  const delay = randomDelay(min, max);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Extract phone number from text using regex
 */
export function extractPhoneNumber(text: string): string | null {
  // Common US phone number formats
  const patterns = [
    /\((\d{3})\)[ -]?(\d{3})[ -]?(\d{4})/,  // (555) 555-5555 or (555)555-5555
    /(\d{3})[ -](\d{3})[ -](\d{4})/,        // 555-555-5555 or 555 555 5555
    /(\d{3})\.(\d{3})\.(\d{4})/             // 555.555.5555
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Return formatted phone number
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  
  return null;
}

/**
 * Extract email address from text using regex
 */
export function extractEmail(text: string): string | null {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailPattern);
  return match ? match[0] : null;
}

/**
 * Clean and format address
 */
export function formatAddress(address: string): string {
  // Remove extra whitespace
  let cleaned = address.replace(/\s+/g, ' ').trim();
  
  // Remove any trailing commas
  cleaned = cleaned.replace(/,+$/, '').trim();
  
  return cleaned;
}

/**
 * Determine if a title indicates a decision-maker
 */
export function isDecisionMakerTitle(title: string = ""): boolean {
  const decisionMakerKeywords = [
    'ceo', 'chief executive', 'president', 'owner', 'founder', 
    'managing director', 'director', 'coo', 'chief operating', 
    'cfo', 'chief financial', 'vp', 'vice president',
    'principal', 'partner', 'head of', 'manager', 'executive',
    'operations', 'finance', 'procurement'
  ];
  
  const lowerTitle = title.toLowerCase();
  return decisionMakerKeywords.some(keyword => lowerTitle.includes(keyword));
}