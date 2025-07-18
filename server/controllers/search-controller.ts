/**
 * Search Controller for NexLead
 * Coordinates business data scraping across multiple sources
 * Implements retry logic, results merging, and export functionality
 */

import { v4 as uuidv4 } from "uuid";
import {
  BusinessData,
  SearchParams,
  ScrapingResult,
} from "../models/business-data";

// Import the Google Places API service
import { googlePlacesService } from "../api/google-places-service";

interface SearchControllerOptions {
  maxRetries?: number;
  timeout?: number;
  saveHtml?: boolean;
  logExecutionDetails?: boolean;
}

export class SearchController {
  private defaultOptions: SearchControllerOptions = {
    maxRetries: 3,
    timeout: 60000, // 60 seconds
    saveHtml: false,
    logExecutionDetails: true,
  };

  constructor() {}

  /**
   * Search for business data
   */
  async searchBusinessData(
    params: SearchParams,
    options: SearchControllerOptions = {}
  ): Promise<ScrapingResult & { error?: { code: string; message: string } }> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const executionId = uuidv4();
    const timestamp = new Date().toISOString();

    console.log(
      `🔍 SearchController: Starting search for "${params.query}" in ${
        params.location || "any location"
      }`
    );

    try {
      // Execute search with retry logic
      let businesses: BusinessData[] = [];
      let sources: string[] = [];
      let retryCount = 0;

      while (retryCount <= mergedOptions.maxRetries!) {
        try {
          const result = await this.executeSearch(
            params,
            executionId,
            retryCount
          );
          businesses = result.businesses;
          sources = result.sources;

          // If we got results, stop retrying
          if (businesses.length > 0) {
            break;
          }

          // Otherwise increment retry counter
          retryCount++;

          if (retryCount <= mergedOptions.maxRetries!) {
            console.log(
              `🔄 SearchController: Retry ${retryCount}/${mergedOptions.maxRetries} for "${params.query}"`
            );
          }
        } catch (error) {
          console.error(
            `❌ SearchController: Search failed (Attempt ${retryCount + 1}/${
              mergedOptions.maxRetries! + 1
            })`,
            error
          );
          retryCount++;

          if (retryCount > mergedOptions.maxRetries!) {
            throw error;
          }
        }
      }

      // Enrich the businesses data with additional information
      for (const business of businesses) {
        this.enrichBusinessData(business, params.query);
      }

      // Calculate pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedBusinesses = businesses.slice(startIndex, endIndex);
      const totalPages = Math.ceil(businesses.length / limit);

      // Check if we have an API error from the last execution attempt
      const lastExecution = await this.executeSearch(
        params,
        executionId,
        retryCount
      );
      const apiError = (lastExecution as any).error;

      // Create result object
      const result: ScrapingResult & {
        error?: { code: string; message: string };
      } = {
        businesses: paginatedBusinesses,
        meta: {
          sources,
          query: params.query,
          location: params.location,
          timestamp,
          execution_id: executionId,
          total_count: businesses.length,
          page,
          limit,
          total_pages: totalPages,
        },
      };

      // Add error information if present
      if (apiError) {
        result.error = apiError;
      }

      return result;
    } catch (error) {
      console.error(
        "❌ SearchController: Search failed after all retries",
        error
      );
      throw error;
    }
  }

  /**
   * Execute search using Google Places API
   */
  private async executeSearch(
    params: SearchParams,
    executionId: string,
    retryCount: number
  ): Promise<{
    businesses: BusinessData[];
    sources: string[];
    error?: {
      code: string;
      message: string;
    };
  }> {
    const query = params.query;
    const location = params.location;

    try {
      // Check if Google Places API is properly configured
      if (!googlePlacesService.isServiceConfigured()) {
        console.error(
          "❌ SearchController: Google Places API is not properly configured"
        );
        return {
          businesses: [],
          sources: [],
          error: {
            code: "PLACES_API_NOT_CONFIGURED",
            message:
              "Google Places API is not properly configured. Please check your environment configuration and ensure GOOGLE_API_KEY is set correctly.",
          },
        };
      }

      // Execute search using Google Places API
      console.log(
        `🔍 SearchController: Searching using Google Places API for "${query}" in ${
          location || "any location"
        }`
      );
      const result = await googlePlacesService.searchBusinesses(
        query,
        location
      );
      const { businesses, sources } = result;

      // Check if there was an API error
      if ((result as any).error) {
        console.log(
          `❌ SearchController: API error - ${(result as any).error.code}`
        );
        return {
          businesses: [],
          sources: [],
          error: (result as any).error,
        };
      }

      if (businesses.length > 0) {
        console.log(
          `✅ SearchController: Found ${businesses.length} businesses from Google Places API`
        );
        return { businesses, sources };
      }

      console.log(
        `❌ SearchController: No businesses found from Google Places API`
      );

      // Return empty result if no businesses found - no fallback to sample data
      return { businesses: [], sources: [] };
    } catch (error) {
      console.error(`❌ SearchController error during execution:`, error);

      // Return empty result on error
      return { businesses: [], sources: [] };
    }
  }

  /**
   * Enrich business data with additional information
   */
  private enrichBusinessData(business: BusinessData, query: string): void {
    // Add decision maker flag if contacts include high-level positions
    if (business.contacts && business.contacts.length > 0) {
      const decisionMakerTitles = [
        "owner",
        "ceo",
        "president",
        "manager",
        "director",
        "vp",
        "vice president",
        "chief",
        "founder",
        "partner",
      ];

      business.isDecisionMaker = business.contacts.some((contact) => {
        if (!contact.position) return false;

        const position = contact.position.toLowerCase();
        return decisionMakerTitles.some((title) => position.includes(title));
      });
    }
  }
}

export const searchController = new SearchController();
