import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import SearchForm from "@/components/search-form";
import SearchResults from "@/components/search-results";
import SavedLeads from "@/components/saved-leads";
import ExportModal from "@/components/export-modal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function LeadFinder() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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
        
        {searchResults && (
          <SearchResults 
            results={searchResults} 
            isLoading={isLoading}
            onSaveLead={handleSaveLead}
            onExport={handleExport}
          />
        )}
        
        {savedLeads && savedLeads.length > 0 && (
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
