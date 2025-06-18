import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertCircle, Loader2, Download, Bookmark, ChevronRight } from "lucide-react";
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
    queryKey: ["/api/saved-leads"],
    refetchOnWindowFocus: true,
  });

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (searchData: any) => {
      setIsLoading(true);
      setSearchError(null);

      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(searchData),
        });

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
          if (!data.contacts || !Array.isArray(data.contacts)) {
            data.contacts = [];
          }
          return data;
        } catch (e) {
          throw new Error(`Invalid response from server: ${responseText}`);
        }
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setSearchError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/saved-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search-history"] });
    },
    onError: (error) => {
      setSearchResults(null);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to search for leads";
      setSearchError(errorMessage);

      toast({
        title: "Search Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Save lead mutation
  const saveMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/save-lead/${contactId}`,
        {}
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-leads"] });
      toast({
        title: "Success",
        description: "Lead saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save lead",
        variant: "destructive",
      });
    },
  });

  const handleSearch = (formData: any) => {
    setSearchParams({
      industry: formData.industry || undefined,
      company: formData.company || undefined,
    });
    searchMutation.mutate(formData);
  };

  const handleSaveLead = (contactId: number) => {
    saveMutation.mutate(contactId);
  };

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10">
      <motion.div
        className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Header Section */}
        <motion.div 
          className="mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.h1 
            className="text-3xl md:text-4xl font-bold text-blue-800 mb-3"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Find Your Perfect Leads
          </motion.h1>
          <motion.p 
            className="text-lg text-blue-600/90 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Discover verified business contacts with our powerful search engine
          </motion.p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        </motion.div>

        {/* Loading State */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="bg-white border border-blue-100 rounded-xl shadow-sm mb-8 overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SearchLoadingState
                industry={searchParams.industry}
                company={searchParams.company}
                isVisible={isLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {!isLoading && searchError && (
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-red-800 mb-2">
                      Search Error
                    </h3>
                    <div className="text-red-700 space-y-3">
                      <p>{searchError}</p>
                      {searchError.includes("Google Places API") ? (
                        <div className="space-y-2">
                          <p>
                            <strong>API Access Issue:</strong> We're currently experiencing an issue with our data provider connection.
                          </p>
                          <div className="bg-red-100/50 p-3 rounded-lg border border-red-200/50">
                            <p className="font-medium text-sm">What you can do:</p>
                            <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                              <li>Try again later</li>
                              <li>Contact support if the issue persists</li>
                              <li>Try a different search query</li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <p className="font-medium text-blue-800 text-sm">Search tips:</p>
                            <ul className="list-disc pl-5 mt-1 space-y-1 text-sm text-blue-700">
                              <li>Use specific company names</li>
                              <li>Include location for better results</li>
                              <li>Try different industry keywords</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results */}
        <AnimatePresence>
          {!isLoading && searchResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SearchResults
                results={searchResults}
                isLoading={false}
                onSaveLead={handleSaveLead}
                onExport={handleExport}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* API Status Dashboard */}
        <motion.div 
          className="mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <ApiStatusDashboard />
        </motion.div>

        {/* Saved Leads */}
        {savedLeads && Array.isArray(savedLeads) && savedLeads.length > 0 && (
          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-blue-800 flex items-center">
                <Bookmark className="h-5 w-5 text-blue-600 mr-2" />
                Your Saved Leads
              </h2>
              <button 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Back to search <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <SavedLeads leads={savedLeads} isLoading={savedLeadsLoading} />
          </motion.div>
        )}

        {/* Export Modal */}
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          leads={searchResults?.contacts || []}
          company={searchResults?.company}
        />
      </motion.div>
    </div>
  );
}