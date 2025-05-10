import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import SearchForm from "@/components/search-form";
import SearchResults from "@/components/search-results";
import SavedLeads from "@/components/saved-leads";
import ExportModal from "@/components/export-modal";
import SearchLoadingState from "@/components/search-loading-state";
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
        const response = await apiRequest('POST', '/api/search', searchData);
        const data = await response.json();
        
        // Check if the response contains an error
        if (!response.ok || (data && data.error)) {
          const errorMessage = data.message || "Failed to search for leads";
          throw new Error(errorMessage);
        }
        
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setSearchError(null);
      // Invalidate saved leads query in case we've updated them
      queryClient.invalidateQueries({ queryKey: ['/api/saved-leads'] });
      // Invalidate search history
      queryClient.invalidateQueries({ queryKey: ['/api/search-history'] });
    },
    onError: (error) => {
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
                  <p className="mt-2">
                    <strong>Tips:</strong> For best results, try searching for a specific company name that has publicly available information.
                    Our system only returns 100% real data from publicly available sources.
                  </p>
                  <p className="mt-2">
                    Example searches: "Google in California", "Microsoft in Seattle", "Apple Inc"
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : !isLoading && searchResults && (
          <SearchResults 
            results={searchResults} 
            isLoading={false}
            onSaveLead={handleSaveLead}
            onExport={handleExport}
          />
        )}
        
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
