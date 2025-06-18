import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Loader2,
  Download,
  Search,
  Bookmark,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [maxResults, setMaxResults] = useState<number>(25);
  const [onlyDecisionMakers, setOnlyDecisionMakers] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [expandedBusinesses, setExpandedBusinesses] = useState<
    Record<string, boolean>
  >({});

  const { toast } = useToast();

  // Load saved results from session storage on component mount
  useEffect(() => {
    const savedSearch = window.sessionStorage.getItem("bulkLeadResults");
    if (savedSearch) {
      try {
        const parsedResults = JSON.parse(savedSearch);
        setResults(parsedResults);

        const savedSearchTerm =
          window.sessionStorage.getItem("bulkLeadSearchTerm");
        if (savedSearchTerm) setSearchTerm(savedSearchTerm);

        const savedLocations = window.sessionStorage.getItem(
          "bulkLeadSelectedLocations"
        );
        if (savedLocations) setSelectedLocations(JSON.parse(savedLocations));
      } catch (error) {
        console.error("Error parsing saved search results:", error);
      }
    }

    fetchLocations();
    fetchIndustries();
  }, []);

  // Toggle business expansion
  const toggleBusinessExpansion = (businessName: string) => {
    setExpandedBusinesses((prev) => ({
      ...prev,
      [businessName]: !prev[businessName],
    }));
  };

  // Fetch available locations from the backend
  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/bulk-leads/locations");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data && data.locations) {
        const formattedLocations = data.locations.map((loc: string) => ({
          name: loc,
          displayName: loc
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
        }));
        setLocations(formattedLocations);
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
      const response = await fetch("/api/bulk-leads/industries");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data && data.industries) {
        const formattedIndustries = data.industries.map((ind: string) => ({
          name: ind,
          displayName: ind
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
        }));
        setIndustries(formattedIndustries);
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
    const newLocations = selectedLocations.includes(locationName)
      ? selectedLocations.filter((loc) => loc !== locationName)
      : [...selectedLocations, locationName];
    setSelectedLocations(newLocations);
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
    setExpandedBusinesses({});

    try {
      const response = await fetch("/api/bulk-leads/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchTerm,
          locations: selectedLocations,
          maxPerLocation: maxResults,
          onlyDecisionMakers,
        }),
      });

      if (!response.ok) throw new Error("Failed to search for leads");

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResults(data);
      window.sessionStorage.setItem("bulkLeadResults", JSON.stringify(data));
      window.sessionStorage.setItem("bulkLeadSearchTerm", searchTerm);
      window.sessionStorage.setItem(
        "bulkLeadSelectedLocations",
        JSON.stringify(selectedLocations)
      );

      toast({
        title: "Search Complete",
        description: `Found ${data.totalBusinesses} businesses with ${data.totalContacts} contacts across ${data.totalLocations} locations.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error searching for leads:", error);
      toast({
        title: "Search Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to search for leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
      toast({
        title: "Preparing export...",
        description: "Creating CSV file for download",
        variant: "default",
      });

      setIsExporting(true);

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const sanitizedSearchTerm = (searchTerm || "leads")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const filename = `nexlead_${sanitizedSearchTerm}_${timestamp}.csv`;

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        handleIOSExport(filename);
      } else {
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
      let csvContent =
        "Company Name,Industry,Address,Phone,Website,Contact Name,Contact Position,Contact Email,Contact Phone,Is Decision Maker\n";

      if (results && results.businesses) {
        results.businesses.forEach((business) => {
          if (!business.contacts || business.contacts.length === 0) {
            csvContent +=
              [
                `"${business.name || ""}"`,
                `"${business.category || ""}"`,
                `"${business.address || ""}"`,
                `"${business.phoneNumber || ""}"`,
                `"${business.website || ""}"`,
                "",
                "",
                "",
                "",
                "",
              ].join(",") + "\n";
          } else {
            business.contacts.forEach((contact) => {
              csvContent +=
                [
                  `"${business.name || ""}"`,
                  `"${business.category || ""}"`,
                  `"${business.address || ""}"`,
                  `"${business.phoneNumber || ""}"`,
                  `"${business.website || ""}"`,
                  `"${contact.name || ""}"`,
                  `"${contact.position || ""}"`,
                  `"${contact.email || ""}"`,
                  `"${contact.phoneNumber || ""}"`,
                  contact.isDecisionMaker ? "Yes" : "No",
                ].join(",") + "\n";
            });
          }
        });
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const dataUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = dataUrl;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(dataUrl);
      }, 100);

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
      const response = await fetch("/api/bulk-leads/export-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchTerm: searchTerm,
          locations: selectedLocations,
          businesses: results?.businesses || [],
        }),
      });

      if (!response.ok) throw new Error("Failed to generate export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-8 px-0">
      {" "}
      {/* Changed px-4 to px-0 */}
      <motion.div
        className="max-w-full w-full mx-auto space-y-6 px-4 sm:px-6" // Modified this line
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          className="text-center"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-blue-800 mb-3">
            Bulk Lead Generator
          </h1>
          <p className="text-lg text-blue-600/90 max-w-2xl mx-auto">
            Discover and connect with multiple businesses at scale
          </p>
        </motion.div>

        {/* Search Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4 border-b border-blue-100">
              <div className="flex items-center space-x-3">
                <Search className="h-6 w-6 text-blue-600" />
                <div>
                  <CardTitle className="text-xl">Find Leads in Bulk</CardTitle>
                  <CardDescription>
                    Search across multiple locations simultaneously
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="space-y-6">
                {/* Search Term */}
                <div className="space-y-3">
                  <Label htmlFor="search-term" className="text-blue-800/90">
                    What type of businesses are you looking for?
                  </Label>
                  <Input
                    id="search-term"
                    placeholder="e.g. Restaurants, Law Firms, Software Companies"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isLoading}
                    className="h-12 text-base"
                  />
                </div>

                {/* Locations */}
                <div className="space-y-3">
                  <Label className="text-blue-800/90">Select Locations</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {locations.map((location) => (
                      <motion.div
                        key={location.name}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div
                          className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedLocations.includes(location.name)
                              ? "bg-blue-50 border-blue-300"
                              : "border-gray-200 hover:border-blue-200"
                          }`}
                          onClick={() => toggleLocation(location.name)}
                        >
                          <Checkbox
                            id={`location-${location.name}`}
                            checked={selectedLocations.includes(location.name)}
                            onCheckedChange={() => {}}
                            className="pointer-events-none"
                          />
                          <label
                            htmlFor={`location-${location.name}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {location.displayName}
                          </label>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Options Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Max Results */}
                  <div className="space-y-3">
                    <Label htmlFor="max-results" className="text-blue-800/90">
                      Results Per Location
                    </Label>
                    <Select
                      disabled={isLoading}
                      value={maxResults.toString()}
                      onValueChange={(value) => setMaxResults(parseInt(value))}
                    >
                      <SelectTrigger id="max-results" className="h-12">
                        <SelectValue placeholder="Select max results" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">
                          10 results per location
                        </SelectItem>
                        <SelectItem value="25">
                          25 results per location
                        </SelectItem>
                        <SelectItem value="50">
                          50 results per location
                        </SelectItem>
                        <SelectItem value="100">
                          100 results per location
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Decision Makers */}
                  <div className="space-y-3">
                    <Label className="text-blue-800/90">Contact Filters</Label>
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200">
                      <Checkbox
                        id="decision-makers"
                        checked={onlyDecisionMakers}
                        onCheckedChange={(checked) =>
                          setOnlyDecisionMakers(!!checked)
                        }
                        disabled={isLoading}
                      />
                      <div>
                        <label
                          htmlFor="decision-makers"
                          className="text-sm font-medium cursor-pointer"
                        >
                          Only show decision makers
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Filter to contacts with decision-making authority
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search Button */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-5 w-5" />
                        Find Leads
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center space-x-3">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-lg font-medium text-blue-800">
                    Searching for "{searchTerm}" in {selectedLocations.length}{" "}
                    locations...
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground">
                  This may take a moment as we gather comprehensive business
                  data
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Results Summary Card */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4 border-b border-blue-100">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl flex items-center space-x-2">
                        <Bookmark className="h-5 w-5 text-blue-600" />
                        <span>Search Results</span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Found {results.totalBusinesses} businesses with{" "}
                        {results.totalContacts} contacts
                      </CardDescription>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full md:w-auto bg-green-600 hover:bg-green-700"
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
                    </motion.div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  {/* Location Summary */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-blue-800 mb-4">
                      Results by Location
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.locationResults.map((locResult, index) => (
                        <motion.div
                          key={index}
                          whileHover={{ y: -2 }}
                          className="p-4 border rounded-lg bg-white shadow-sm"
                        >
                          <h4 className="font-medium">
                            {locResult.location
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </h4>
                          <div className="flex justify-between mt-2">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Businesses
                              </p>
                              <p className="font-medium">
                                {locResult.businessCount}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Contacts
                              </p>
                              <p className="font-medium">
                                {locResult.contactCount}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Density
                              </p>
                              <p className="font-medium">
                                {Math.round(
                                  (locResult.contactCount /
                                    locResult.businessCount) *
                                    10
                                ) / 10}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Business Results */}
                  <div>
                    <h3 className="text-lg font-medium text-blue-800 mb-4">
                      Business Details
                    </h3>
                    <div className="space-y-4">
                      {results.businesses
                        .slice(0, 10)
                        .map((business, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border rounded-lg overflow-hidden"
                          >
                            <div
                              className={`p-4 cursor-pointer ${
                                expandedBusinesses[business.name]
                                  ? "bg-blue-50 border-b border-blue-100"
                                  : "bg-white"
                              }`}
                              onClick={() =>
                                toggleBusinessExpansion(business.name)
                              }
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">
                                    {business.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {business.category}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                  {business.contacts &&
                                    business.contacts.length > 0 && (
                                      <Badge
                                        variant="outline"
                                        className="bg-blue-50 text-blue-700"
                                      >
                                        {business.contacts.length} contacts
                                      </Badge>
                                    )}
                                  <ChevronDown
                                    className={`h-5 w-5 text-blue-600 transition-transform ${
                                      expandedBusinesses[business.name]
                                        ? "rotate-180"
                                        : ""
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>

                            <AnimatePresence>
                              {expandedBusinesses[business.name] && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 bg-white border-t">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                          Address
                                        </p>
                                        <p>{business.address}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                          Phone
                                        </p>
                                        <p>{business.phoneNumber || "N/A"}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                          Website
                                        </p>
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
                                      </div>
                                    </div>

                                    {business.contacts &&
                                    business.contacts.length > 0 ? (
                                      <div>
                                        <h5 className="font-medium mb-3">
                                          Contacts
                                        </h5>
                                        <div className="space-y-3">
                                          {business.contacts.map(
                                            (contact, contactIndex) => (
                                              <div
                                                key={contactIndex}
                                                className="p-3 border rounded-lg bg-gray-50"
                                              >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                  <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                      Name
                                                    </p>
                                                    <p>{contact.name}</p>
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                      Position
                                                    </p>
                                                    <p>{contact.position}</p>
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                      Email
                                                    </p>
                                                    <p>
                                                      {contact.email || "N/A"}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                      Phone
                                                    </p>
                                                    <p>
                                                      {contact.phoneNumber ||
                                                        "N/A"}
                                                    </p>
                                                  </div>
                                                </div>
                                                {contact.isDecisionMaker && (
                                                  <div className="mt-2">
                                                    <Badge className="bg-green-100 text-green-800">
                                                      Decision Maker
                                                    </Badge>
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        No contact information available
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))}
                    </div>

                    {results.businesses.length > 10 && (
                      <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          Showing 10 of {results.businesses.length} businesses.
                          Export to CSV to view all results.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        <AnimatePresence>
          {!isLoading && !results && (
            <motion.div
              className="p-8 border rounded-xl text-center bg-white shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mx-auto max-w-md">
                <div className="flex justify-center">
                  <div className="p-4 bg-blue-50 rounded-full">
                    <Search className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-medium text-blue-800">
                  No Search Results Yet
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Enter your search criteria above to find business contacts
                  across multiple locations
                </p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg bg-blue-50/50">
                    <p className="font-medium">Example searches:</p>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                      <li>• "Restaurants in New York"</li>
                      <li>• "Tech startups"</li>
                      <li>• "Law firms in California"</li>
                    </ul>
                  </div>
                  <div className="p-3 border rounded-lg bg-blue-50/50">
                    <p className="font-medium">Search tips:</p>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                      <li>• Select multiple locations</li>
                      <li>• Try different industry keywords</li>
                      <li>• Export results to CSV</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default BulkLeadGenerator;
