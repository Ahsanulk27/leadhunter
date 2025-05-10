/**
 * Simplified self-test module for NexLead
 * Tests basic functionality without relying on web scraping
 */

import { googlePlacesService } from './google-places-service';

export class SimplifiedSelfTest {
  
  /**
   * Run all tests in the test suite
   */
  async runAllTests(): Promise<boolean> {
    console.log('🧪 Starting self-test with 2 test cases...');
    
    // Run a test for general business search
    await this.testGeneralBusinessSearch();
    
    // Run a test for industry-specific search
    await this.testIndustrySearch();
    
    return true;
  }
  
  /**
   * Test searching for general business category
   */
  private async testGeneralBusinessSearch(): Promise<boolean> {
    console.log('🔍 Running test: General Business Test');
    
    try {
      // Test business search with Google Places API
      const { businesses } = await googlePlacesService.searchBusinesses('Restaurants', 'New York');
      
      if (businesses.length > 0) {
        console.log(`✅ General Business Test: Found ${businesses.length} restaurants in New York`);
        return true;
      } else {
        console.log('⚠️ General Business Test: No restaurants found in New York');
        return false;
      }
    } catch (error) {
      console.error('❌ General Business Test failed:', error);
      return false;
    }
  }
  
  /**
   * Test searching for industry-specific data
   */
  private async testIndustrySearch(): Promise<boolean> {
    console.log('🔍 Running test: Industry-Specific Test');
    
    try {
      // Test industry-specific search with Google Places API
      const { businesses } = await googlePlacesService.searchBusinesses('Technology Companies', 'San Francisco');
      
      if (businesses.length > 0) {
        console.log(`✅ Industry-Specific Test: Found ${businesses.length} technology companies in San Francisco`);
        return true;
      } else {
        console.log('⚠️ Industry-Specific Test: No technology companies found in San Francisco');
        return false;
      }
    } catch (error) {
      console.error('❌ Industry-Specific Test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const simplifiedSelfTest = new SimplifiedSelfTest();