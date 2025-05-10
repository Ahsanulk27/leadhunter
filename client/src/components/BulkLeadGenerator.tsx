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
import { saveAs } from 'file-saver';

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
  
  // State for data loading
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [results, setResults] = useState<any>(null);
  
  const { toast } = useToast();
  
  // Fetch available locations and industries on component mount
  useEffect(() => {
    const fetchLocationsAndIndustries = async () => {
      try {
        const [locationsResponse, industriesResponse] = await Promise.all([
          fetch('/api/bulk-leads/locations'),
          fetch('/api/bulk-leads/industries')
        ]);
        
        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          // Format locations for display
          const formattedLocations = locationsData.locations.map((loc: string) => ({
            name: loc,
            displayName: loc.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          }));
          setLocations(formattedLocations);
        }
        
        if (industriesResponse.ok) {
          const industriesData = await industriesResponse.json();
          // Format industries for display
          const formattedIndustries = industriesData.industries.map((ind: string) => ({
            name: ind,
            displayName: ind.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          }));
          setIndustries(formattedIndustries);
        }
      } catch (error) {
        console.error('Error fetching locations and industries:', error);
        toast({
          title: 'Failed to load options',
          description: 'Could not load available locations and industries.',
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
  
  const exportToCSV = () => {
    if (!results || !results.businesses) return;
    
    // Create CSV content
    let csvContent = 'Company Name,Industry,Address,Phone,Website,Contact Name,Contact Position,Contact Email,Contact Phone,Is Decision Maker\n';
    
    results.businesses.forEach((business: any) => {
      const businessRow = [
        `"${business.name || ''}"`,
        `"${business.category || ''}"`,
        `"${business.address || ''}"`,
        `"${business.phoneNumber || ''}"`,
        `"${business.website || ''}"`,
      ];
      
      if (business.contacts && business.contacts.length > 0) {
        // Add contact information
        business.contacts.forEach((contact: any) => {
          const contactRow = [
            ...businessRow,
            `"${contact.name || ''}"`,
            `"${contact.position || ''}"`,
            `"${contact.email || ''}"`,
            `"${contact.phoneNumber || ''}"`,
            `"${contact.isDecisionMaker ? 'Yes' : 'No'}"`,
          ];
          csvContent += contactRow.join(',') + '\n';
        });
      } else {
        // No contacts, add empty contact fields
        const emptyContactRow = [...businessRow, '""', '""', '""', '""', '""'];
        csvContent += emptyContactRow.join(',') + '\n';
      }
    });
    
    // Create a Blob and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    saveAs(blob, `leads_${searchTerm.replace(/\s+/g, '_')}_${timestamp}.csv`);
    
    toast({
      title: 'Export complete',
      description: 'Your leads have been exported to CSV.',
      variant: 'default'
    });
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
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
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