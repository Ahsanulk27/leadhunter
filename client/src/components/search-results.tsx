import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import IndustryLoadingSpinner from "@/components/industry-loading-spinner";
import {
  Building,
  UserRoundCheck,
  CheckCircle,
  Award,
  Clock,
  Filter,
  ArrowDownUp,
  Download,
  Star,
  Clipboard,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin
} from "lucide-react";

interface SearchResultsProps {
  results: any;
  isLoading: boolean;
  onSaveLead: (contactId: number) => void;
  onExport: () => void;
}

export default function SearchResults({ results, isLoading, onSaveLead, onExport }: SearchResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterDecisionMakers, setFilterDecisionMakers] = useState(false);
  const [pageLoadTimes, setPageLoadTimes] = useState<{[key: number]: number}>({});
  
  // Increased to 50 items per page as requested
  const itemsPerPage = 50;
  
  // Debugging: log the entire results object
  console.log("DEBUG SearchResults component - received results:", results);
  
  // Safely extract data with fallbacks to prevent rendering errors
  const company = results?.company || {};
  const rawContacts = results?.contacts || [];
  console.log("DEBUG SearchResults component - extracted company:", company);
  console.log("DEBUG SearchResults component - extracted contacts:", rawContacts);
  
  // Ensure contacts is always an array
  const contacts = Array.isArray(rawContacts) ? rawContacts : [];
  
  // Filter contacts based on decision maker status if the filter is active
  const filteredContacts = filterDecisionMakers 
    ? contacts.filter((contact: any) => contact.isDecisionMaker) 
    : contacts;
  
  console.log("DEBUG SearchResults component - filtered contacts:", filteredContacts);
  
  // Sort the contacts
  const sortedContacts = [...filteredContacts].sort((a: any, b: any) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  console.log("DEBUG SearchResults component - sorted contacts:", sortedContacts);
  
  // Paginate the results
  const totalPages = Math.ceil(sortedContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContacts = sortedContacts.slice(startIndex, startIndex + itemsPerPage);
  
  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending when changing sort field
    }
  };
  
  // Use effect to track page load times
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Update the page load time for the current page
      setPageLoadTimes(prev => ({
        ...prev,
        [currentPage]: loadTime
      }));
      
      console.log(`DEBUG: Page ${currentPage} load time: ${loadTime}ms`);
      console.log(`DEBUG: All page load times:`, pageLoadTimes);
    };
  }, [currentPage]);
  
  // Handle pagination with performance tracking
  const goToPage = (page: number) => {
    const validPage = Math.min(Math.max(1, page), totalPages);
    
    // Only change if it's a different page
    if (validPage !== currentPage) {
      console.log(`DEBUG: Navigating from page ${currentPage} to page ${validPage}`);
      const startTime = performance.now();
      
      // Log the current page before changing
      if (pageLoadTimes[currentPage]) {
        console.log(`DEBUG: Page ${currentPage} load time was ${pageLoadTimes[currentPage]}ms`);
      }
      
      setCurrentPage(validPage);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Search Results</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{filteredContacts.length} leads found</span>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={filterDecisionMakers ? "bg-blue-50 text-primary" : ""}
                onClick={() => setFilterDecisionMakers(!filterDecisionMakers)}
              >
                <Filter className="mr-1 h-4 w-4" />
                {filterDecisionMakers ? "All Contacts" : "Decision Makers"}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSort('name')}
            >
              <ArrowDownUp className="mr-1 h-4 w-4" />
              Sort
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="bg-amber-500 hover:bg-amber-600"
              onClick={onExport}
            >
              <Download className="mr-1 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <IndustryLoadingSpinner 
              industry={company?.industry || undefined} 
              size="lg"
              showText={true}
            />
          </div>
        ) : paginatedContacts.length > 0 ? (
          <>
            
            {paginatedContacts.map((contact: any) => (
              <div 
                key={contact.id} 
                className="bg-white border border-gray-200 rounded-md shadow-sm p-4 mb-4 hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <div className="flex items-start space-x-3">
                      <div className="bg-gray-100 rounded-full h-10 w-10 flex items-center justify-center text-gray-500">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-500">{company.industry || "Unknown Industry"}</p>
                        <div className="mt-1 flex items-center">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            <CheckCircle className="mr-1 h-3 w-3 text-blue-500" />
                            Verified
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="flex items-start space-x-3">
                      <div className="bg-primary bg-opacity-10 rounded-full h-10 w-10 flex items-center justify-center text-primary">
                        <UserRoundCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{contact.name}</h3>
                        <p className="text-sm text-gray-500">{contact.position || "Unknown Position"}</p>
                        {contact.isDecisionMaker && (
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <Award className="text-amber-500 mr-1 h-4 w-4" />
                            <span>Top Decision Maker</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center text-gray-500">
                        <Mail className="w-5 text-center mr-2 h-4" />
                        <span>{contact.email || "No email available"}</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Phone className="w-5 text-center mr-2 h-4" />
                        <span>{contact.phoneNumber || contact.companyPhone || contact.personalPhone || "No phone available"}</span>
                      </div>
                      {contact.personalPhone && contact.companyPhone && (
                        <div className="flex items-center text-gray-500 ml-7">
                          <span className="text-xs font-medium text-blue-600">+Personal: {contact.personalPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center text-gray-500">
                        <MapPin className="w-5 text-center mr-2 h-4" />
                        <span>{company.address || "No address available"}</span>
                      </div>
                      {contact.homeAddress && (
                        <div className="flex items-center text-gray-500 ml-7">
                          <span className="text-xs font-medium text-blue-600">Home: {contact.homeAddress}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end space-x-2">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-400 hover:text-gray-500">
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-400 hover:text-gray-500">
                        <Clipboard className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        className="px-3"
                        onClick={() => onSaveLead(contact.id)}
                        disabled={contact.saved}
                      >
                        {contact.saved ? "Saved" : "Save Lead"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-2">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredContacts.length)}</span> of{" "}
                    <span className="font-medium">{filteredContacts.length}</span> results
                  </p>
                  {Object.keys(pageLoadTimes).length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Current page load time: {pageLoadTimes[currentPage] ? `${Math.round(pageLoadTimes[currentPage])}ms` : 'Calculating...'}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2 py-2"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Pagination with ellipsis for many pages */}
                  {(() => {
                    const pageNumbers = [];
                    const maxVisiblePages = 5;
                    
                    if (totalPages <= maxVisiblePages) {
                      // Show all pages if there are few
                      for (let i = 1; i <= totalPages; i++) {
                        pageNumbers.push(i);
                      }
                    } else {
                      // Show first page
                      pageNumbers.push(1);
                      
                      // Show ellipsis and pages around current
                      if (currentPage > 3) {
                        pageNumbers.push('ellipsis1');
                      }
                      
                      // Pages around current
                      const startPage = Math.max(2, currentPage - 1);
                      const endPage = Math.min(totalPages - 1, currentPage + 1);
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pageNumbers.push(i);
                      }
                      
                      // Show ellipsis and last page
                      if (currentPage < totalPages - 2) {
                        pageNumbers.push('ellipsis2');
                      }
                      
                      // Last page
                      if (totalPages > 1) {
                        pageNumbers.push(totalPages);
                      }
                    }
                    
                    return pageNumbers.map((page, index) => {
                      if (page === 'ellipsis1' || page === 'ellipsis2') {
                        return (
                          <span key={`ellipsis-${index}`} className="px-2">
                            ...
                          </span>
                        );
                      }
                      
                      return (
                        <Button
                          key={`page-${page}`}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className="px-4 py-2"
                          onClick={() => goToPage(page as number)}
                        >
                          {page}
                        </Button>
                      );
                    });
                  })()}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2 py-2"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No leads found. Try adjusting your search criteria.
          </div>
        )}
      </CardContent>
    </Card>
  );
}