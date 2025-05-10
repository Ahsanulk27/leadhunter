/**
 * B2C Lead Generator component for LeadHunter
 * Provides interface for searching B2C leads with proxy support
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Eye, Search, Shield, Settings, List } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Location {
  id: string;
  name: string;
  code: string;
}

interface Industry {
  id: string;
  name: string;
  code: string;
}

interface Contact {
  contactId: string;
  name: string;
  position?: string;
  email?: string;
  phoneNumber?: string;
  isDecisionMaker: boolean;
  companyName: string;
}

interface Business {
  id: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  category?: string;
  contacts?: Contact[];
  source: string;
}

interface SearchResults {
  businesses: Business[];
  sources: string[];
  query: string;
  location?: string;
  executionTime?: number;
  dataQualityScore?: number;
  sessionId?: string;
  type?: string;
}

interface ProxyStats {
  total: number;
  active: number;
  blocked: number;
  error: number;
  avgResponseTime: number;
  topPerformers: Array<{
    id: string;
    avgResponseTime: number;
    successCount: number;
  }>;
}

const B2CLeadGenerator: React.FC = () => {
  // State for form inputs
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [maxResults, setMaxResults] = useState<number>(25);
  const [onlyDecisionMakers, setOnlyDecisionMakers] = useState(true);
  const [useProxies, setUseProxies] = useState(true);
  const [proxyDelay, setProxyDelay] = useState<[number]>([3000]);
  
  // State for data loading and exporting
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [proxyStats, setProxyStats] = useState<ProxyStats | null>(null);
  const [locations] = useState<Location[]>([
    { id: '1', name: 'United States', code: 'US' },
    { id: '2', name: 'California', code: 'CA' },
    { id: '3', name: 'New York', code: 'NY' },
    { id: '4', name: 'Texas', code: 'TX' },
    { id: '5', name: 'Florida', code: 'FL' },
    { id: '6', name: 'Illinois', code: 'IL' },
    { id: '7', name: 'United Kingdom', code: 'UK' },
    { id: '8', name: 'Canada', code: 'CA' },
    { id: '9', name: 'Australia', code: 'AU' },
  ]);
  
  const { toast } = useToast();
  
  // Load saved results from session storage on component mount
  useEffect(() => {
    const savedSearch = window.sessionStorage.getItem('b2cLeadResults');
    if (savedSearch) {
      try {
        const parsedResults = JSON.parse(savedSearch);
        console.log("Loaded saved B2C search results from session storage:", parsedResults);
        setResults(parsedResults);
        
        // Also restore the search term and session ID
        const savedSearchTerm = window.sessionStorage.getItem('b2cLeadSearchTerm');
        if (savedSearchTerm) {
          setSearchTerm(savedSearchTerm);
        }
        
        const savedSessionId = window.sessionStorage.getItem('b2cLeadSessionId');
        if (savedSessionId) {
          setSessionId(savedSessionId);
          // Fetch proxy stats for this session
          fetchProxyStats(savedSessionId);
        }
        
        // Restore selected locations
        const savedLocations = window.sessionStorage.getItem('b2cLeadSelectedLocations');
        if (savedLocations) {
          setSelectedLocations(JSON.parse(savedLocations));
        }
      } catch (error) {
        console.error("Error loading saved B2C search:", error);
      }
    }
  }, []);
  
  // Fetch proxy stats for a session
  const fetchProxyStats = async (sid: string) => {
    if (!sid) return;
    
    try {
      const response = await axios.get(`/api/b2c/proxy-stats/${sid}`);
      if (response.data && !response.data.error) {
        setProxyStats(response.data);
      }
    } catch (error) {
      console.error("Error fetching proxy stats:", error);
    }
  };
  
  // Handle the search submission
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search term required",
        description: "Please enter a search term to find B2C leads",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare search parameters
      const params = {
        query: searchTerm,
        location: selectedLocations.length > 0 ? selectedLocations.join(', ') : undefined,
        maxResults,
        onlyDecisionMakers,
        useProxies,
        delayMin: proxyDelay[0] * 0.8, // Add some randomness to delay
        delayMax: proxyDelay[0] * 1.2,
        sessionId // Re-use session if it exists
      };
      
      // Execute the search
      const response = await axios.post('/api/b2c/search', params);
      
      if (response.data) {
        setResults(response.data);
        setSessionId(response.data.sessionId);
        
        // Save to session storage
        window.sessionStorage.setItem('b2cLeadResults', JSON.stringify(response.data));
        window.sessionStorage.setItem('b2cLeadSearchTerm', searchTerm);
        window.sessionStorage.setItem('b2cLeadSessionId', response.data.sessionId);
        window.sessionStorage.setItem('b2cLeadSelectedLocations', JSON.stringify(selectedLocations));
        
        // Fetch proxy stats
        if (response.data.sessionId) {
          fetchProxyStats(response.data.sessionId);
        }
        
        toast({
          title: "Search completed",
          description: `Found ${response.data.businesses.length} B2C leads in ${(response.data.executionTime || 0) / 1000} seconds`,
        });
      }
    } catch (error) {
      console.error("Error during B2C search:", error);
      toast({
        title: "Search error",
        description: "An error occurred while searching for B2C leads. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle export to CSV
  const handleExport = async () => {
    if (!results || !results.businesses || results.businesses.length === 0) {
      toast({
        title: "No results to export",
        description: "Please search for leads first before exporting",
        variant: "destructive"
      });
      return;
    }
    
    setIsExporting(true);
    
    try {
      // Get the CSV data
      const response = await axios.post('/api/b2c/export', { 
        businesses: results.businesses 
      }, {
        responseType: 'blob'
      });
      
      // Create a download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      saveAs(blob, `b2c-leads-${new Date().toISOString().split('T')[0]}.csv`);
      
      toast({
        title: "Export successful",
        description: `${results.businesses.length} leads exported to CSV`,
      });
    } catch (error) {
      console.error("Error exporting B2C leads:", error);
      toast({
        title: "Export error",
        description: "An error occurred while exporting leads to CSV. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Format phone number for display
  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    
    // Simple formatting for US numbers
    if (phone.length === 10) {
      return `(${phone.substring(0, 3)}) ${phone.substring(3, 6)}-${phone.substring(6)}`;
    }
    
    return phone;
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">B2C Lead Generator</h1>
          <p className="text-muted-foreground">
            Find consumer leads with proxy protection to avoid IP blocking
          </p>
        </div>
      </div>
      
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>B2C Lead Search</CardTitle>
          <CardDescription>
            Search for consumer leads with intelligent proxy rotation to protect your searches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="searchTerm">Search Term</Label>
                <Input
                  id="searchTerm"
                  placeholder="Enter product, service, or consumer interest"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="maxResults">Max Results</Label>
                <Select 
                  value={maxResults.toString()} 
                  onValueChange={(value) => setMaxResults(parseInt(value))}
                >
                  <SelectTrigger id="maxResults">
                    <SelectValue placeholder="Max results" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 results</SelectItem>
                    <SelectItem value="25">25 results</SelectItem>
                    <SelectItem value="50">50 results</SelectItem>
                    <SelectItem value="100">100 results</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="locations">Locations</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                {locations.map((location) => (
                  <Button
                    key={location.id}
                    variant={selectedLocations.includes(location.name) ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => {
                      if (selectedLocations.includes(location.name)) {
                        setSelectedLocations(selectedLocations.filter(loc => loc !== location.name));
                      } else {
                        setSelectedLocations([...selectedLocations, location.name]);
                      }
                    }}
                  >
                    {location.name}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="decisionMakers" className="flex-1">Only Decision Makers</Label>
                <Switch
                  id="decisionMakers"
                  checked={onlyDecisionMakers}
                  onCheckedChange={setOnlyDecisionMakers}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="useProxies" className="flex-1">Use Proxy Protection</Label>
                <Switch
                  id="useProxies"
                  checked={useProxies}
                  onCheckedChange={setUseProxies}
                />
              </div>
            </div>
            
            {useProxies && (
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Request Delay (ms)</Label>
                  <span className="text-sm text-muted-foreground">{proxyDelay[0]}ms</span>
                </div>
                <Slider
                  value={proxyDelay}
                  min={1000}
                  max={10000}
                  step={500}
                  onValueChange={(value) => setProxyDelay(value as [number])}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Faster (1s)</span>
                  <span className="text-xs text-muted-foreground">Safer (10s)</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedLocations([]);
                      setMaxResults(25);
                      setOnlyDecisionMakers(true);
                    }}
                    disabled={isLoading}
                  >
                    Reset
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear all search parameters</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search B2C Leads
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Results Section */}
      {results && results.businesses && results.businesses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Found {results.businesses.length} B2C leads for "{results.query}"
                  {results.location && ` in ${results.location}`}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export to CSV
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="businesses">
              <TabsList className="mb-4">
                <TabsTrigger value="businesses">
                  <List className="mr-2 h-4 w-4" />
                  Businesses ({results.businesses.length})
                </TabsTrigger>
                {useProxies && (
                  <TabsTrigger value="proxy">
                    <Shield className="mr-2 h-4 w-4" />
                    Proxy Stats
                  </TabsTrigger>
                )}
                <TabsTrigger value="insights">
                  <Eye className="mr-2 h-4 w-4" />
                  Insights
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="businesses">
                <Table>
                  <TableCaption>List of B2C leads found through proxy-protected searches</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.businesses.map((business) => (
                      business.contacts && business.contacts.length > 0 ? (
                        // Render each contact as a row
                        business.contacts.map((contact) => (
                          <TableRow key={`${business.id}-${contact.contactId}`}>
                            <TableCell className="font-medium">{business.name}</TableCell>
                            <TableCell>{contact.name}</TableCell>
                            <TableCell>{contact.position || 'N/A'}</TableCell>
                            <TableCell>{contact.email || 'N/A'}</TableCell>
                            <TableCell>{formatPhone(contact.phoneNumber) || 'N/A'}</TableCell>
                            <TableCell>{business.address || 'N/A'}</TableCell>
                            <TableCell className="text-right">{business.source}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        // Render a single row for businesses without contacts
                        <TableRow key={business.id}>
                          <TableCell className="font-medium">{business.name}</TableCell>
                          <TableCell>No contact</TableCell>
                          <TableCell>N/A</TableCell>
                          <TableCell>{business.email || 'N/A'}</TableCell>
                          <TableCell>{formatPhone(business.phoneNumber) || 'N/A'}</TableCell>
                          <TableCell>{business.address || 'N/A'}</TableCell>
                          <TableCell className="text-right">{business.source}</TableCell>
                        </TableRow>
                      )
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              
              {useProxies && (
                <TabsContent value="proxy">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {proxyStats ? (
                        <>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">Active Proxies</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-3xl font-bold">{proxyStats.active} / {proxyStats.total}</div>
                              <p className="text-sm text-muted-foreground">Available for rotation</p>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">Blocked Proxies</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-3xl font-bold">{proxyStats.blocked}</div>
                              <p className="text-sm text-muted-foreground">Temporarily unavailable</p>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">Avg Response Time</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-3xl font-bold">{Math.round(proxyStats.avgResponseTime)}ms</div>
                              <p className="text-sm text-muted-foreground">Across all active proxies</p>
                            </CardContent>
                          </Card>
                          
                          {proxyStats.topPerformers && proxyStats.topPerformers.length > 0 && (
                            <div className="md:col-span-3">
                              <h3 className="text-lg font-semibold mb-2">Top Performing Proxies</h3>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Proxy ID</TableHead>
                                    <TableHead>Response Time</TableHead>
                                    <TableHead>Success Count</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {proxyStats.topPerformers.map((proxy) => (
                                    <TableRow key={proxy.id}>
                                      <TableCell className="font-mono">{proxy.id}</TableCell>
                                      <TableCell>{Math.round(proxy.avgResponseTime)}ms</TableCell>
                                      <TableCell>{proxy.successCount}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="md:col-span-3 py-8 text-center">
                          <p>No proxy statistics available yet.</p>
                          {sessionId && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => fetchProxyStats(sessionId)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Refresh Proxy Stats
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              )}
              
              <TabsContent value="insights">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Data Quality Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{results.dataQualityScore || 0}%</div>
                        <p className="text-sm text-muted-foreground">
                          {results.dataQualityScore && results.dataQualityScore > 70 
                            ? 'Excellent data quality' 
                            : results.dataQualityScore && results.dataQualityScore > 40
                              ? 'Good data quality'
                              : 'Basic data quality'}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Sources</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{results.sources?.length || 0}</div>
                        <p className="text-sm text-muted-foreground">
                          {results.sources?.join(', ') || 'No sources available'}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Execution Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {results.executionTime 
                            ? `${(results.executionTime / 1000).toFixed(2)}s` 
                            : 'N/A'}
                        </div>
                        <p className="text-sm text-muted-foreground">Total search time</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Source Distribution</h3>
                    <div className="h-[200px] bg-background p-4 rounded-lg border flex items-center justify-center">
                      <p className="text-muted-foreground">Source distribution visualization would appear here</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      
      {/* No Results State */}
      {results && results.businesses && results.businesses.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Results Found</CardTitle>
            <CardDescription>
              Your search for "{results.query}" {results.location && `in ${results.location}`} returned no results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Try adjusting your search terms or location to get better results.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default B2CLeadGenerator;