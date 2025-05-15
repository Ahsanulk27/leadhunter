import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download } from "lucide-react";
import { SearchX } from "lucide-react";

interface Location {
  name: string;
  displayName: string;
}

interface Industry {
  name: string;
  displayName: string;
}

interface Business {
  name: string;
  category: string;
  address: string;
  phoneNumber: string;
  website: string;
  contacts: Contact[];
}

interface Contact {
  name: string;
  position: string;
  email: string;
  phoneNumber: string;
  isDecisionMaker: boolean;
}

interface SearchResults {
  searchTerm: string;
  totalLocations: number;
  totalBusinesses: number;
  totalContacts: number;
  locationResults: any[];
  businesses: Business[];
}

const BulkLeadGenerator: React.FC = () => {
  // State for form inputs
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [maxResults, setMaxResults] = useState<number>(25);
  const [onlyDecisionMakers, setOnlyDecisionMakers] = useState(true);

  // State for data loading and exporting
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [results, setResults] = useState<SearchResults | null>(null);

  const { toast } = useToast();

  // Load saved results from session storage on component mount
  useEffect(() => {
    const savedSearch = window.sessionStorage.getItem("bulkLeadResults");
    if (savedSearch) {
      try {
        const parsedResults = JSON.parse(savedSearch);
        console.log(
          "Loaded saved search results from session storage:",
          parsedResults
        );
        setResults(parsedResults);

        // Also restore the search term
        const savedSearchTerm =
          window.sessionStorage.getItem("bulkLeadSearchTerm");
        if (savedSearchTerm) {
          setSearchTerm(savedSearchTerm);
        }

        // Restore selected locations
        const savedLocations = window.sessionStorage.getItem(
          "bulkLeadSelectedLocations"
        );
        if (savedLocations) {
          setSelectedLocations(JSON.parse(savedLocations));
        }
      } catch (error) {
        console.error("Error parsing saved search results:", error);
      }
    }

    // Load available locations
    fetchLocations();

    // Load available industries
    fetchIndustries();
  }, []);

  // Fetch available locations from the backend
  const fetchLocations = async () => {
    try {
      console.log("Fetching locations...");
      const response = await fetch("/api/bulk-leads/locations");
      console.log("Locations response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Locations response data:", data);

      if (data && data.locations) {
        // Format location names for display
        const formattedLocations = data.locations.map((loc: string) => ({
          name: loc,
          displayName: loc
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
        }));

        setLocations(formattedLocations);
        console.log("Loaded locations:", formattedLocations);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast({
        title: "Error",
        description: "Failed to load available locations. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch available industries from the backend
  const fetchIndustries = async () => {
    try {
      console.log("Fetching industries...");
      const response = await fetch("/api/bulk-leads/industries");
      console.log("Industries response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Industries response data:", data);

      if (data && data.industries) {
        // Format industry names for display
        const formattedIndustries = data.industries.map((ind: string) => ({
          name: ind,
          displayName: ind
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
        }));

        setIndustries(formattedIndustries);
        console.log("Loaded industries:", formattedIndustries);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching industries:", error);
      toast({
        title: "Error",
        description: "Failed to load available industries. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Toggle location selection
  const toggleLocation = (locationName: string) => {
    if (selectedLocations.includes(locationName)) {
      setSelectedLocations(
        selectedLocations.filter((loc) => loc !== locationName)
      );
    } else {
      setSelectedLocations([...selectedLocations, locationName]);
    }
  };

  // Handle form submission to search for leads
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchTerm) {
      toast({
        title: "Missing Input",
        description: "Please enter a search term.",
        variant: "destructive",
      });
      return;
    }

    if (selectedLocations.length === 0) {
      toast({
        title: "Missing Input",
        description: "Please select at least one location.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      // Call the custom bulk lead search endpoint
      const response = await fetch("/api/bulk-leads/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchTerm,
          locations: selectedLocations,
          maxPerLocation: maxResults,
          onlyDecisionMakers,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to search for leads");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Update state with search results
      setResults(data);

      // Save search results to session storage
      window.sessionStorage.setItem("bulkLeadResults", JSON.stringify(data));
      window.sessionStorage.setItem("bulkLeadSearchTerm", searchTerm);
      window.sessionStorage.setItem(
        "bulkLeadSelectedLocations",
        JSON.stringify(selectedLocations)
      );

      // Show success toast
      toast({
        title: "Search Complete",
        description: `Found ${data.totalBusinesses} businesses with ${data.totalContacts} contacts across ${data.totalLocations} locations.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error searching for leads:", error);
      toast({
        title: "Search Failed",
        description: "Failed to search for leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Utility function to properly escape CSV values
  const escapeCsvValue = (value: string) => {
    if (!value) return '""';

    // If value contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  };

  // Handle exporting search results as CSV
  const handleExport = async () => {
    if (!results || results.businesses.length === 0) {
      toast({
        title: "No Results",
        description:
          "There are no results to export. Please perform a search first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Show loading toast
      toast({
        title: "Preparing export...",
        description: "Creating CSV file for download",
        variant: "default",
      });

      setIsExporting(true);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const sanitizedSearchTerm = (searchTerm || "leads")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const filename = `nexlead_${sanitizedSearchTerm}_${timestamp}.csv`;

      // Detect iOS devices
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // iOS-specific export logic
        handleIOSExport(filename);
      } else {
        // Standard export for other devices
        handleStandardExport(filename);
      }
    } catch (error) {
      console.error("Error exporting results:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export results. Please try again.",
        variant: "destructive",
      });
      setIsExporting(false);
    }
  };

  // Handle CSV export specifically for iOS devices
  const handleIOSExport = (filename: string) => {
    try {
      console.log(
        "iOS device detected, using pure client-side download approach"
      );

      // Generate CSV content
      let csvContent =
        "Company Name,Industry,Address,Phone,Website,Contact Name,Contact Position,Contact Email,Contact Phone,Is Decision Maker\n";

      // Add data rows from results
      if (results && results.businesses) {
        results.businesses.forEach((business) => {
          if (!business.contacts || business.contacts.length === 0) {
            // If no contacts, add one row with just business info
            csvContent +=
              [
                escapeCsvValue(business.name || ""),
                escapeCsvValue(business.category || ""),
                escapeCsvValue(business.address || ""),
                escapeCsvValue(business.phoneNumber || ""),
                escapeCsvValue(business.website || ""),
                "",
                "",
                "",
                "",
                "",
              ].join(",") + "\n";
          } else {
            // Add a row for each contact
            business.contacts.forEach((contact) => {
              csvContent +=
                [
                  escapeCsvValue(business.name || ""),
                  escapeCsvValue(business.category || ""),
                  escapeCsvValue(business.address || ""),
                  escapeCsvValue(business.phoneNumber || ""),
                  escapeCsvValue(business.website || ""),
                  escapeCsvValue(contact.name || ""),
                  escapeCsvValue(contact.position || ""),
                  escapeCsvValue(contact.email || ""),
                  escapeCsvValue(contact.phoneNumber || ""),
                  escapeCsvValue(contact.isDecisionMaker ? "Yes" : "No"),
                ].join(",") + "\n";
            });
          }
        });
      }

      // Create a Blob with the CSV content
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

      // Create a data URL for the file
      const dataUrl = URL.createObjectURL(blob);

      // Create an anchor element to trigger the download
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = dataUrl;
      a.download = filename;

      // For iOS, we need to open in a new tab
      a.target = "_blank";
      a.rel = "noopener";

      // Add to DOM, click, and clean up
      document.body.appendChild(a);
      a.click();

      // Cleanup after a short delay
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(dataUrl);
      }, 100);

      // Show success message
      toast({
        title: "Download Started",
        description:
          "Your file is being downloaded. Check your browser or Files app.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error with iOS export:", error);
      toast({
        title: "Export Failed",
        description: "Could not create export file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle CSV export for standard browsers
  const handleStandardExport = async (filename: string) => {
    try {
      // For standard browsers, we can use the server endpoint
      const response = await fetch("/api/bulk-leads/export-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerm: searchTerm,
          locations: selectedLocations,
          businesses: results?.businesses || [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate export");
      }

      // Get the response as a blob
      const blob = await response.blob();

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create an anchor element to trigger the download
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;

      // Add to DOM, click, and clean up
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      // Show success message
      toast({
        title: "Export Successful",
        description: "Your leads have been exported successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error with standard export:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bulk-lead-generator">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Bulk Lead Generator</CardTitle>
          <CardDescription>
            Search for leads across multiple locations simultaneously
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-term">What are you looking for?</Label>
              <Input
                id="search-term"
                placeholder="e.g. Restaurants, Law Firms, Software Companies"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                Enter any business type, industry, or specific search term
              </p>
            </div>

            <div className="space-y-2">
              <Label>Select Locations</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {locations.map((location) => (
                  <div
                    key={location.name}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`location-${location.name}`}
                      checked={selectedLocations.includes(location.name)}
                      onCheckedChange={() => toggleLocation(location.name)}
                      disabled={isLoading}
                    />
                    <label
                      htmlFor={`location-${location.name}`}
                      className="text-sm cursor-pointer"
                    >
                      {location.displayName}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-results">
                  Maximum Results Per Location
                </Label>
                <Select
                  disabled={isLoading}
                  value={maxResults.toString()}
                  onValueChange={(value) => setMaxResults(parseInt(value))}
                >
                  <SelectTrigger id="max-results">
                    <SelectValue placeholder="Select max results" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 results per location</SelectItem>
                    <SelectItem value="25">25 results per location</SelectItem>
                    <SelectItem value="50">50 results per location</SelectItem>
                    <SelectItem value="100">
                      100 results per location
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex items-end">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="decision-makers"
                    checked={onlyDecisionMakers}
                    onCheckedChange={(checked) =>
                      setOnlyDecisionMakers(!!checked)
                    }
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="decision-makers"
                    className="text-sm cursor-pointer leading-tight"
                  >
                    Only show decision makers
                    <p className="text-xs text-muted-foreground mt-1">
                      Filter contacts to only include people with
                      decision-making authority
                    </p>
                  </label>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search for Leads"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results && (
        <Card className="mt-8 w-full">
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              Found {results.totalBusinesses} businesses with{" "}
              {results.totalContacts} contacts across {results.totalLocations}{" "}
              locations
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                <div>
                  <h3 className="text-lg font-medium">
                    Search: "{searchTerm}"
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Locations:{" "}
                    {selectedLocations
                      .map((loc) =>
                        loc
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())
                      )
                      .join(", ")}
                  </p>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full md:w-auto"
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

              {/* Location Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.locationResults.map((locResult, index) => (
                  <div key={index} className="p-4 border rounded-md">
                    <h4 className="font-medium">
                      {locResult.location
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h4>
                    <p className="text-sm">
                      {locResult.businessCount} businesses
                    </p>
                    <p className="text-sm">{locResult.contactCount} contacts</p>
                  </div>
                ))}
              </div>

              {/* Business Results */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Businesses Found</h3>

                <div className="space-y-4">
                  {results.businesses.slice(0, 20).map((business, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-md space-y-2"
                    >
                      <h4 className="font-medium">{business.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <p>
                            <strong>Category:</strong> {business.category}
                          </p>
                          <p>
                            <strong>Address:</strong> {business.address}
                          </p>
                        </div>
                        <div>
                          <p>
                            <strong>Phone:</strong> {business.phoneNumber}
                          </p>
                          <p>
                            <strong>Website:</strong>{" "}
                            {business.website ? (
                              <a
                                href={business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {business.website.replace(
                                  /^https?:\/\/(www\.)?/i,
                                  ""
                                )}
                              </a>
                            ) : (
                              "N/A"
                            )}
                          </p>
                        </div>
                      </div>

                      {business.contacts && business.contacts.length > 0 ? (
                        <div className="mt-3">
                          <p className="font-medium">Contacts:</p>
                          <div className="divide-y">
                            {business.contacts.map((contact, contactIndex) => (
                              <div key={contactIndex} className="py-2 text-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                  <p>
                                    <strong>Name:</strong> {contact.name}
                                  </p>
                                  <p>
                                    <strong>Position:</strong>{" "}
                                    {contact.position}
                                  </p>
                                  <p>
                                    <strong>Email:</strong>{" "}
                                    {contact.email || "N/A"}
                                  </p>
                                  <p>
                                    <strong>Phone:</strong>{" "}
                                    {contact.phoneNumber || "N/A"}
                                  </p>
                                </div>
                                {contact.isDecisionMaker && (
                                  <p className="mt-1 font-medium text-green-600">
                                    Decision Maker
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No contact information available
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {results.businesses.length > 20 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Showing 20 of {results.businesses.length} businesses. Export
                    to CSV to view all results.
                  </p>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Data quality score:{" "}
              {Math.round(
                (results.totalContacts / results.totalBusinesses) * 10
              ) / 10}{" "}
              contacts per business
            </p>
          </CardFooter>
        </Card>
      )}

      {!isLoading && !results && (
        <div className="mt-8 p-8 border rounded-md text-center">
          <SearchX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Search Results</h3>
          <p className="text-muted-foreground">
            Fill in the search form and click "Search for Leads" to find
            business contacts
          </p>
        </div>
      )}
    </div>
  );
};

export default BulkLeadGenerator;
