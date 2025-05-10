import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileDown, FilePlus, Filter, Search, User, ShieldCheck } from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import LeadValidationIndicator from "@/components/LeadValidationIndicator";

// Consumer lead type definition
interface ConsumerLead {
  id: string;
  name: string;
  jobTitle: string;
  phoneNumber: string;
  email: string;
  address: string;
  propertyType: string;
  propertySize: string;
  cleaningNeed: string;
  budget: string;
  inquiryDate: string;
  leadScore: number;
  isHotLead: boolean;
  notes: string;
}

// File type definition for bulk leads
interface LeadFile {
  id: string;
  location: string;
  totalLeads: number;
  hotLeads: number;
  filePath: string;
  createdAt: string;
  fileType: 'csv' | 'json';
}

// Mock function to simulate loading the lead files
// In a real implementation, this would be an API call
const fetchLeadFiles = async (): Promise<LeadFile[]> => {
  // This would be replaced with an actual API call
  // For now, we'll simulate with data based on our generated files
  
  const locations = [
    'Miami, Florida',
    'Orlando, Florida',
    'Tampa, Florida',
    'Brooklyn, New York',
    'Queens, New York',
    'Dallas, Texas',
    'Austin, Texas'
  ];
  
  return locations.map((location, index) => {
    const locationSlug = location.replace(/,?\s+/g, '_').toLowerCase();
    const hotLeads = Math.floor(Math.random() * 10) + 3; // Random number of hot leads
    const totalLeads = Math.floor(Math.random() * 30) + 20; // Random total number of leads
    
    return {
      id: `file-${index + 1}`,
      location,
      totalLeads,
      hotLeads,
      filePath: `/consumer_leads/${locationSlug}_consumer_leads.csv`,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      fileType: 'csv'
    };
  });
};

// Mock function to load leads from a file
// In a real implementation, this would be an API call
const fetchLeadsFromFile = async (fileId: string): Promise<ConsumerLead[]> => {
  // This would be replaced with an actual API call
  // For now, we'll simulate with random data
  
  // Find the file based on ID
  const files = await fetchLeadFiles();
  const file = files.find(f => f.id === fileId);
  
  if (!file) {
    return [];
  }
  
  // Generate mock consumer leads based on the file's location
  const result: ConsumerLead[] = [];
  const count = file.totalLeads;
  const location = file.location;
  
  // First names and last names for generating random leads
  const firstNames = [
    'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Susan', 'Richard', 'Jessica', 'Joseph', 'Sarah'
  ];
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'
  ];
  
  // Property types and cleaning needs
  const propertyTypes = ['Apartment', 'Condo', 'House', 'Townhouse', 'Studio'];
  const propertySizes = [
    'Studio apartment (~500 sq ft)',
    '1 bedroom apartment (~750 sq ft)',
    '2 bedroom apartment (~1000 sq ft)',
    '2 bedroom house (~1200 sq ft)',
    '3 bedroom condo (~1500 sq ft)',
    '3 bedroom house (~1800 sq ft)',
    '4 bedroom house (~2200 sq ft)',
    '4+ bedroom house (2500+ sq ft)'
  ];
  const cleaningNeeds = [
    'Regular weekly cleaning',
    'Bi-weekly cleaning service',
    'Monthly deep cleaning',
    'One-time move-in cleaning',
    'One-time move-out cleaning',
    'Post-renovation cleaning',
    'Same-day emergency cleaning',
    'Weekend cleaning'
  ];
  const budgets = [
    'Under $100',
    '$100-$150',
    '$150-$200',
    '$200-$250',
    '$250-$300',
    '$300-$400',
    '$400+'
  ];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    
    const leadScore = Math.floor(Math.random() * 100) + 1;
    const isHotLead = leadScore > 70;
    
    const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const propertySize = propertySizes[Math.floor(Math.random() * propertySizes.length)];
    const cleaningNeed = cleaningNeeds[Math.floor(Math.random() * cleaningNeeds.length)];
    const budget = budgets[Math.floor(Math.random() * budgets.length)];
    
    // Generate a random date within the last month
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const inquiryDate = new Date();
    inquiryDate.setDate(inquiryDate.getDate() - daysAgo);
    
    result.push({
      id: `lead-${fileId}-${i + 1}`,
      name,
      phoneNumber: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@example.com`,
      address: `${Math.floor(Math.random() * 9000) + 1000} Main St, ${location}`,
      propertyType,
      propertySize,
      cleaningNeed,
      budget,
      inquiryDate: inquiryDate.toISOString().split('T')[0],
      leadScore,
      isHotLead,
      notes: `${name} is looking for ${cleaningNeed.toLowerCase()} for their ${propertyType.toLowerCase()}. Prefers ${Math.random() > 0.5 ? 'weekends' : 'weekdays'}.`
    });
  }
  
  return result;
};

const ConsumerBulkLeads: React.FC = () => {
  // State for file list and currently selected file
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState('all'); // 'all', 'hot', 'recent'
  const leadsPerPage = 10;
  
  // Fetch lead files
  const filesQuery = useQuery({
    queryKey: ['leadFiles'],
    queryFn: fetchLeadFiles
  });
  
  // Fetch leads for selected file
  const leadsQuery = useQuery({
    queryKey: ['fileLeads', selectedFileId],
    queryFn: () => selectedFileId ? fetchLeadsFromFile(selectedFileId) : Promise.resolve([]),
    enabled: !!selectedFileId
  });
  
  // Select the first file by default when files load
  useEffect(() => {
    if (filesQuery.data && filesQuery.data.length > 0 && !selectedFileId) {
      setSelectedFileId(filesQuery.data[0].id);
    }
  }, [filesQuery.data, selectedFileId]);
  
  // Filter and search leads
  const filteredLeads = leadsQuery.data?.filter(lead => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesFilter = 
      filterOption === 'all' ||
      (filterOption === 'hot' && lead.isHotLead) ||
      (filterOption === 'recent' && new Date(lead.inquiryDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesFilter;
  }) || [];
  
  // Pagination logic
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
  const startIndex = (currentPage - 1) * leadsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + leadsPerPage);
  
  // Get the selected file details
  const selectedFile = filesQuery.data?.find(file => file.id === selectedFileId);
  
  // Handle file download
  const handleDownload = (fileType: 'csv' | 'json') => {
    if (!selectedFile) return;
    
    const fileName = selectedFile.location.replace(/,?\s+/g, '_').toLowerCase();
    const fileExtension = fileType === 'csv' ? 'csv' : 'json';
    
    // In a real application, this would trigger a download from your server
    alert(`Downloading ${fileName}_consumer_leads.${fileExtension}`);
    
    // Example of how you would handle the download in a real application:
    // window.location.href = `/api/download/${fileName}_consumer_leads.${fileExtension}`;
  };
  
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Consumer Bulk Leads</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* File List */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Lead Files</CardTitle>
              <CardDescription>Select a file to view leads</CardDescription>
            </CardHeader>
            <CardContent>
              {filesQuery.isLoading ? (
                <div className="text-center p-4">Loading files...</div>
              ) : filesQuery.error ? (
                <div className="text-center p-4 text-red-500">Error loading files</div>
              ) : (
                <div className="space-y-4">
                  {filesQuery.data?.map(file => (
                    <div 
                      key={file.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedFileId === file.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => setSelectedFileId(file.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileSpreadsheet className="h-5 w-5" />
                          <div>
                            <div className="font-medium">{file.location}</div>
                            <div className="text-sm opacity-90">
                              {file.totalLeads} leads ({file.hotLeads} hot)
                            </div>
                          </div>
                        </div>
                        <div className="text-xs opacity-70">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between border-t pt-4">
              <Button variant="outline" size="sm">
                <FilePlus className="h-4 w-4 mr-2" />
                New Batch
              </Button>
              <div className="text-sm text-muted-foreground">
                {filesQuery.data?.length || 0} files
              </div>
            </CardFooter>
          </Card>
        </div>
        
        {/* Lead Viewer */}
        <div className="md:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {selectedFile ? `Leads for ${selectedFile.location}` : 'Select a file'}
                  </CardTitle>
                  <CardDescription>
                    {selectedFile 
                      ? `${filteredLeads.length} leads matching your filters` 
                      : 'Choose a file from the list to view leads'
                    }
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownload('csv')}
                    disabled={!selectedFile}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownload('json')}
                    disabled={!selectedFile}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>
              
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search leads..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1); // Reset to first page on search
                    }}
                  />
                </div>
                <Select
                  value={filterOption}
                  onValueChange={(value) => {
                    setFilterOption(value);
                    setCurrentPage(1); // Reset to first page on filter change
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter leads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Filter</SelectLabel>
                      <SelectItem value="all">All Leads</SelectItem>
                      <SelectItem value="hot">Hot Leads</SelectItem>
                      <SelectItem value="recent">Recent (7 days)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-auto">
              {!selectedFileId ? (
                <div className="text-center p-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Select a file to view consumer leads</p>
                </div>
              ) : leadsQuery.isLoading ? (
                <div className="text-center p-8">Loading leads...</div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <p>No leads match your search criteria</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Cleaning Need</TableHead>
                      <TableHead>Validation</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeads.map((lead) => (
                      <TableRow key={lead.id} className={lead.isHotLead ? "bg-orange-50 dark:bg-orange-950/20" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {lead.name} 
                            {lead.isHotLead && <span className="text-orange-500 ml-1">🔥</span>}
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">{lead.address}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{lead.phoneNumber}</div>
                          <div className="text-sm text-muted-foreground">{lead.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{lead.cleaningNeed}</div>
                          <div className="text-xs text-muted-foreground">
                            {lead.propertyType} • {lead.budget}
                          </div>
                        </TableCell>
                        <TableCell>
                          <LeadValidationIndicator 
                            lead={lead} 
                            size="sm"
                            showStatus={false}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div 
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              lead.leadScore > 70 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                : lead.leadScore > 40 
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {lead.leadScore}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            
            {/* Pagination */}
            {filteredLeads.length > leadsPerPage && (
              <CardFooter className="border-t pt-4">
                <Pagination className="w-full">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {/* First page */}
                    {currentPage > 2 && (
                      <PaginationItem>
                        <PaginationLink onClick={() => setCurrentPage(1)}>
                          1
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Ellipsis if needed */}
                    {currentPage > 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    {/* Previous page if not on first page */}
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationLink onClick={() => setCurrentPage(currentPage - 1)}>
                          {currentPage - 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Current page */}
                    <PaginationItem>
                      <PaginationLink isActive onClick={() => {}}>
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>
                    
                    {/* Next page if not on last page */}
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationLink onClick={() => setCurrentPage(currentPage + 1)}>
                          {currentPage + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Ellipsis if needed */}
                    {currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    {/* Last page if not already shown */}
                    {currentPage < totalPages - 1 && (
                      <PaginationItem>
                        <PaginationLink onClick={() => setCurrentPage(totalPages)}>
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConsumerBulkLeads;