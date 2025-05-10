import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import SearchForm from "@/components/search-form";
import SearchResults from "@/components/search-results";
import SavedLeads from "@/components/saved-leads";
import ExportModal from "@/components/export-modal";
import SearchLoadingState from "@/components/search-loading-state";
import ApiStatusDashboard from "@/components/api-status-dashboard";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function LeadFinder() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<{
    industry?: string;
    company?: string;
  }>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get saved leads
  const { data: savedLeads, isLoading: savedLeadsLoading } = useQuery({
    queryKey: ['/api/saved-leads'],
    refetchOnWindowFocus: true,
  });

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (searchData: any) => {
      setIsLoading(true);
      setSearchError(null);
      
      try {
        // Note: We're using fetch directly here instead of apiRequest to handle response errors manually
        console.log("DEBUG: Sending search request with data:", searchData);
        
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchData)
        });
        
        console.log(`DEBUG: Response status: ${response.status} ${response.statusText}`);
        
        // Parse the response data
        const responseText = await response.text();
        console.log("DEBUG: Raw response:", responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
          console.log("DEBUG: Parsed JSON data:", data);
          
          // Log important pieces of the data structure to debug rendering issues
          if (data && data.company) {
            console.log("DEBUG: Company data:", data.company);
          }
          
          if (data && data.contacts) {
            console.log("DEBUG: Contacts data:", data.contacts);
            console.log("DEBUG: Contacts array length:", data.contacts.length);
          }
        } catch (e) {
          console.error("DEBUG: Failed to parse JSON response:", e);
          throw new Error(`Invalid response from server: ${responseText}`);
        }
        
        // Check for error in the response
        if (!response.ok) {
          console.error("DEBUG: Search error - status:", response.status, "data:", data);
          
          // Handle specific error types
          if (data && data.error) {
            if (typeof data.error === 'object' && data.error.code) {
              if (data.error.code === 'PLACES_API_REQUEST_DENIED') {
                throw new Error(
                  "Google Places API access is currently unavailable. Please enable the Places API for your Google API key."
                );
              } else if (data.error.code === 'PLACES_API_QUERY_LIMIT') {
                throw new Error(
                  "We've reached our daily search limit. Please try again tomorrow."
                );
              } else {
                throw new Error(data.error.message || "API error: " + data.error.code);
              }
            } else {
              throw new Error(typeof data.error === 'string' ? data.error : "An error occurred during search");
            }
          } else {
            throw new Error(`API error (${response.status}): ${response.statusText}`);
          }
        }
        
        // Ensure data structure is as expected to prevent rendering errors
        if (!data || typeof data !== 'object') {
          console.error("DEBUG: Data is not a valid object:", data);
          throw new Error("Invalid data format received from server");
        }
        
        if (!data.company || typeof data.company !== 'object') {
          console.error("DEBUG: Missing or invalid company data:", data);
          throw new Error("Missing company information in search results");
        }
        
        // Ensure contacts exists and is an array, even if empty
        if (!data.contacts || !Array.isArray(data.contacts)) {
          console.log("DEBUG: Creating empty contacts array for data:", data);
          data.contacts = [];
        }
        
        // Verify other required fields for rendering
        console.log("DEBUG: Data ready for return:", data);
        return data;
      } catch (error) {
        console.error("DEBUG: Search request failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      console.log("DEBUG: Search successful, got data:", data);
      // Explicitly log the structure needed for rendering
      console.log("DEBUG: Company data for rendering:", data.company);
      console.log("DEBUG: Contacts data for rendering:", data.contacts);
      
      // Make sure search results is properly set
      setSearchResults(data);
      setSearchError(null);
      
      // Invalidate saved leads query in case we've updated them
      queryClient.invalidateQueries({ queryKey: ['/api/saved-leads'] });
      // Invalidate search history
      queryClient.invalidateQueries({ queryKey: ['/api/search-history'] });
    },
    onError: (error) => {
      console.error("DEBUG: Search mutation error:", error);
      setSearchResults(null);
      const errorMessage = error instanceof Error ? error.message : "Failed to search for leads";
      setSearchError(errorMessage);
      
      toast({
        title: "Search Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Save lead mutation
  const saveMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const response = await apiRequest('POST', `/api/save-lead/${contactId}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-leads'] });
      toast({
        title: "Success",
        description: "Lead saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save lead",
        variant: "destructive",
      });
    }
  });

  // Handle search form submission
  const handleSearch = (formData: any) => {
    // Save the search parameters for the loading screen
    setSearchParams({
      industry: formData.industry || undefined,
      company: formData.company || undefined
    });
    
    searchMutation.mutate(formData);
  };

  // Handle save lead
  const handleSaveLead = (contactId: number) => {
    saveMutation.mutate(contactId);
  };

  // Handle export button click
  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        
        {isLoading && (
          <div className="bg-white border border-gray-200 rounded-md shadow-sm mb-6">
            <SearchLoadingState 
              industry={searchParams.industry}
              company={searchParams.company}
              isVisible={isLoading}
            />
          </div>
        )}
        
        {!isLoading && searchError ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Search Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{searchError}</p>
                  {searchError.includes("Google Places API") ? (
                    <div>
                      <p className="mt-2">
                        <strong>API Access Issue:</strong> We're currently experiencing an issue with our data provider connection. 
                        The application can only show real business data from Google Places API, and this service is temporarily unavailable.
                      </p>
                      <p className="mt-2">
                        <strong>Technical Details:</strong> {searchError.includes("enable") ? 
                          "The Google Places API needs to be enabled for the API key being used." : 
                          "There's an issue with the Google Places API configuration."}
                      </p>
                      <p className="mt-2">
                        <strong>What you can do:</strong> This is a server configuration issue that requires administrator attention.
                        Please try again later once the API access has been properly configured.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="mt-2">
                        <strong>Tips:</strong> For best results, try searching for a specific company name that has publicly available information.
                        Our system only returns 100% real data from publicly available sources.
                      </p>
                      <p className="mt-2">
                        Example searches: "Google in California", "Microsoft in Seattle", "Apple Inc"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : !isLoading && searchResults ? (
          // Log the data before attempting to render it
          (() => {
            console.log("DEBUG: About to render search results with data:", searchResults);
            return (
              <SearchResults 
                results={searchResults} 
                isLoading={false}
                onSaveLead={handleSaveLead}
                onExport={handleExport}
              />
            );
          })()
        ) : null}
        
        {/* API Status Dashboard */}
        <div className="mt-6">
          <ApiStatusDashboard />
        </div>
        
        {savedLeads && Array.isArray(savedLeads) && savedLeads.length > 0 && (
          <SavedLeads leads={savedLeads} isLoading={savedLeadsLoading} />
        )}
        
        <ExportModal 
          isOpen={isExportModalOpen} 
          onClose={() => setIsExportModalOpen(false)}
          leads={searchResults?.contacts || []}
          company={searchResults?.company}
        />
      </div>
    </Layout>
  );
}
