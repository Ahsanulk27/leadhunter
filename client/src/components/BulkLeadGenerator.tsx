import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download } from 'lucide-react';
import { SearchX } from 'lucide-react';
// Remove file-saver import as we'll use native browser download

interface Location {
  name: string;
  displayName: string;
}

interface Industry {
  name: string;
  displayName: string;
}

const BulkLeadGenerator: React.FC = () => {
  // State for form inputs
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [maxResults, setMaxResults] = useState<number>(25);
  const [onlyDecisionMakers, setOnlyDecisionMakers] = useState(true);
  
  // State for data loading and exporting
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [results, setResults] = useState<any>(null);
  
  // Load saved results from session storage on component mount
  useEffect(() => {
    const savedSearch = window.sessionStorage.getItem('bulkLeadResults');
    if (savedSearch) {
      try {
        const parsedResults = JSON.parse(savedSearch);
        console.log("Loaded saved search results from session storage:", parsedResults);
        setResults(parsedResults);
        
        // Also restore the search term
        const savedSearchTerm = window.sessionStorage.getItem('bulkLeadSearchTerm');
        if (savedSearchTerm) {
          setSearchTerm(savedSearchTerm);
        }
        
        // Restore selected locations
        const savedLocations = window.sessionStorage.getItem('bulkLeadSelectedLocations');
        if (savedLocations) {
          setSelectedLocations(JSON.parse(savedLocations));
        }
      } catch (err) {
        console.error("Error restoring saved search:", err);
        // Clear corrupted data
        window.sessionStorage.removeItem('bulkLeadResults');
      }
    }
  }, []);
  
  const { toast } = useToast();
  
  // Fetch available locations and industries on component mount
  useEffect(() => {
    const fetchLocationsAndIndustries = async () => {
      try {
        // Add a timestamp to prevent caching issues
        const timestamp = new Date().getTime();
        console.log("Fetching locations and industries...");
        
        // Fetch locations
        const locationsUrl = `/api/bulk-leads/locations?_=${timestamp}`;
        console.log("Locations URL:", locationsUrl);
        const locationsResponse = await fetch(locationsUrl);
        console.log("Locations response status:", locationsResponse.status);
        
        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          console.log("Received locations data:", locationsData);
          
          if (locationsData.locations && Array.isArray(locationsData.locations)) {
            // Format locations for display
            const formattedLocations = locationsData.locations.map((loc: string) => ({
              name: loc,
              displayName: loc.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            }));
            console.log("Formatted locations:", formattedLocations);
            setLocations(formattedLocations);
          } else {
            console.error("Invalid locations data format:", locationsData);
          }
        } else {
          console.error("Failed to fetch locations:", await locationsResponse.text());
        }
        
        // Fetch industries
        const industriesUrl = `/api/bulk-leads/industries?_=${timestamp}`;
        const industriesResponse = await fetch(industriesUrl);
        console.log("Industries response status:", industriesResponse.status);
        
        if (industriesResponse.ok) {
          const industriesData = await industriesResponse.json();
          console.log("Received industries data:", industriesData);
          
          if (industriesData.industries && Array.isArray(industriesData.industries)) {
            // Format industries for display
            const formattedIndustries = industriesData.industries.map((ind: string) => ({
              name: ind,
              displayName: ind.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            }));
            setIndustries(formattedIndustries);
          } else {
            console.error("Invalid industries data format:", industriesData);
          }
        } else {
          console.error("Failed to fetch industries:", await industriesResponse.text());
        }
      } catch (error) {
        console.error('Error fetching locations and industries:', error);
        toast({
          title: 'Failed to load options',
          description: 'Could not load available locations and industries. Please refresh the page.',
          variant: 'destructive'
        });
      }
    };
    
    fetchLocationsAndIndustries();
  }, [toast]);
  
  const handleLocationToggle = (location: string) => {
    setSelectedLocations(prev => {
      if (prev.includes(location)) {
        return prev.filter(loc => loc !== location);
      } else {
        return [...prev, location];
      }
    });
  };
  
  const handleSearch = async () => {
    if (!searchTerm) {
      toast({
        title: 'Search term required',
        description: 'Please enter a business type, service, or industry to search for.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setResults(null);
      
      const response = await fetch('/api/bulk-leads/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchTerm,
          locations: selectedLocations.length > 0 ? selectedLocations : undefined,
          maxPerLocation: maxResults,
          onlyDecisionMakers
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate leads');
      }
      
      const data = await response.json();
      setResults(data);
      
      // Save results to session storage for persistence between tab navigation
      try {
        // Save the results
        window.sessionStorage.setItem('bulkLeadResults', JSON.stringify(data));
        // Save the search term
        window.sessionStorage.setItem('bulkLeadSearchTerm', searchTerm);
        // Save selected locations
        window.sessionStorage.setItem('bulkLeadSelectedLocations', JSON.stringify(selectedLocations));
        
        console.log("Saved search results to session storage");
      } catch (err) {
        console.error("Error saving search results to session storage:", err);
        // Non-critical error, don't show to user
      }
      
      // Save to database using the API
      try {
        fetch('/api/bulk-leads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            searchTerm,
            locations: selectedLocations,
            businesses: data.businesses
          })
        });
        // This is a non-blocking operation, we don't need to await it
      } catch (err) {
        console.error("Error saving to database:", err);
        // Non-critical error, don't show to user
      }
      
      // Show success message
      toast({
        title: 'Lead generation complete',
        description: `Found ${data.totalBusinesses} businesses with ${data.totalContacts} contacts.`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error generating leads:', error);
      toast({
        title: 'Failed to generate leads',
        description: 'An error occurred while generating leads. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Export for direct iPhone download
  const exportToCSV = async () => {
    if (!results || !results.businesses || results.businesses.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Please generate leads first before exporting.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // Show a loading toast
      toast({
        title: 'Preparing your export...',
        description: 'Creating CSV file for direct download to your device.',
        variant: 'default'
      });
      
      setIsExporting(true);
      
      // Generate the timestamp for the filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedSearchTerm = (searchTerm || 'leads').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `nexlead_${sanitizedSearchTerm}_${timestamp}.csv`;
      
      // For iPhone, we'll use a special approach to trigger download directly to Files app
      // First, post the data to our server where it can be temporarily stored
      const dataResponse = await fetch('/api/bulk-leads/export-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm,
          locations: selectedLocations,
          businesses: results.businesses
        })
      });
      
      if (!dataResponse.ok) {
        throw new Error('Failed to prepare data for download');
      }
      
      // Now create a direct download URL to our server endpoint
      const downloadUrl = `/api/direct-download/csv?filename=${encodeURIComponent(filename)}&searchTerm=${encodeURIComponent(searchTerm)}`;
      
      // Open this URL in the current window to trigger the download
      // This will open the browser's native save dialog
      window.open(downloadUrl, '_blank');
      
      // Reset the exporting state and show success message
      // Use a slightly longer timeout since we're redirecting
      setTimeout(() => {
        setIsExporting(false);
        
        toast({
          title: 'Download initiated!',
          description: 'Your CSV file should now be downloading to your device.',
          variant: 'default'
        });
      }, 500);
    } catch (error) {
      console.error('Error initiating CSV download:', error);
      setIsExporting(false);
      
      toast({
        title: 'Download failed',
        description: 'There was a problem creating your export file. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Bulk Lead Generator</CardTitle>
          <CardDescription>
            Generate leads for any business type across multiple locations at once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="searchTerm">What type of businesses are you looking for?</Label>
              <Input
                id="searchTerm"
                placeholder="E.g., dentists, restaurants, plumbers, law firms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Locations to search in (select multiple)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                {locations.map((location) => (
                  <div key={location.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location.name}`}
                      checked={selectedLocations.includes(location.name)}
                      onCheckedChange={() => handleLocationToggle(location.name)}
                    />
                    <Label htmlFor={`location-${location.name}`} className="cursor-pointer">
                      {location.displayName}
                    </Label>
                  </div>
                ))}
              </div>
              {locations.length === 0 && (
                <div className="text-sm text-gray-500 italic">Loading available locations...</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {selectedLocations.length === 0 
                  ? "If no locations are selected, we'll search across all major areas" 
                  : `Searching in ${selectedLocations.length} location(s)`}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxResults">Max results per location</Label>
                <Input
                  id="maxResults"
                  type="number"
                  min={1}
                  max={100}
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-center space-x-2 mt-8">
                <Checkbox
                  id="decisionMakers"
                  checked={onlyDecisionMakers}
                  onCheckedChange={(checked) => setOnlyDecisionMakers(!!checked)}
                />
                <Label htmlFor="decisionMakers">Only include decision makers</Label>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating leads...
              </>
            ) : (
              'Generate Leads'
            )}
          </Button>
          
          {results && (
            <Button onClick={exportToCSV} variant="outline" disabled={isExporting}>
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
          )}
        </CardFooter>
      </Card>
      
      {results && (
        <Card className="w-full mt-6">
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              Found {results.totalBusinesses} unique businesses with {results.totalContacts} contacts
              across {results.totalLocations} locations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-medium mb-2">Results by Location</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {results.locationResults.map((result: any, index: number) => (
                <div key={index} className="p-2 border rounded">
                  <div className="font-medium">
                    {result.location.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </div>
                  <div className="text-sm">{result.businessCount} businesses</div>
                </div>
              ))}
            </div>
            
            <h3 className="text-lg font-medium mt-4 mb-2">Business Results (First 10)</h3>
            {results.businesses.length > 0 ? (
              <div className="space-y-3">
                {results.businesses.slice(0, 10).map((business: any, index: number) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="font-bold">{business.name}</div>
                    <div className="text-sm text-gray-600">{business.category}</div>
                    <div className="text-sm">{business.address}</div>
                    {business.contacts && business.contacts.length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <div className="text-sm font-medium">Primary Contact:</div>
                        <div>
                          {business.contacts[0].name} • {business.contacts[0].position}
                        </div>
                        <div className="text-sm">
                          {business.contacts[0].email && (
                            <span className="mr-2">{business.contacts[0].email}</span>
                          )}
                          {business.contacts[0].phoneNumber && (
                            <span>{business.contacts[0].phoneNumber}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <SearchX className="h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium">No results found</h3>
                <p className="text-gray-500">
                  Try adjusting your search terms or selecting different locations.
                </p>
              </div>
            )}
            
            {results.businesses.length > 10 && (
              <div className="mt-4 text-center text-gray-500">
                {results.businesses.length - 10} more businesses not shown.
                Export to CSV to see all results.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkLeadGenerator;