import React, { useState, useEffect } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Loader2,
  Download,
  Eye,
  Search,
  Shield,
  Settings,
  List,
  RotateCw,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Interfaces
interface Contact {
  contactId: string;
  name: string;
  position?: string;
  email?: string;
  phoneNumber?: string;
  isDecisionMaker?: boolean;
  location?: string;
}

interface Business {
  id: string;
  name: string;
  source: string;
  contacts?: Contact[];
}

interface SearchResults {
  query: string;
  location?: string;
  businesses: Business[];
  proxyStats?: {
    totalRequests: number;
    blockedRequests: number;
    averageDelay: number;
  };
}

interface Location {
  id: string;
  name: string;
}

const B2CLeadGenerator: React.FC = () => {
  // State declarations
  const [searchTerm, setSearchTerm] = useState("");
  const [maxResults, setMaxResults] = useState(25);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [onlyDecisionMakers, setOnlyDecisionMakers] = useState(true);
  const [useProxies, setUseProxies] = useState(true);
  const [proxyDelay, setProxyDelay] = useState<[number]>([2000]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Sample locations - replace with API call in production
  const locations: Location[] = [
    { id: "1", name: "New York" },
    { id: "2", name: "Los Angeles" },
    { id: "3", name: "Chicago" },
    { id: "4", name: "Houston" },
    { id: "5", name: "Phoenix" },
    { id: "6", name: "Philadelphia" },
    { id: "7", name: "San Antonio" },
    { id: "8", name: "San Diego" },
  ];

  // Utility functions
  const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/b2c/search", {
        query: searchTerm,
        maxResults,
        locations: selectedLocations,
        onlyDecisionMakers,
        useProxies,
        proxyDelay: proxyDelay[0],
      });

      setResults(response.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred during search";
      setError(errorMessage);
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!results) return;

    setIsExporting(true);
    try {
      const response = await axios.post(
        "/api/b2c/export",
        {
          results,
          format: "csv",
        },
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "text/csv" });
      saveAs(blob, `b2c-leads-${new Date().toISOString().split("T")[0]}.csv`);

      toast({
        title: "Success",
        description: "Leads exported successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Export failed";
      toast({
        title: "Export Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Error display component
  const ErrorDisplay = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <Shield className="w-5 h-5" />
            <p className="font-medium">Error</p>
          </div>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with animation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            B2C Lead Generator
          </h1>
          <p className="text-muted-foreground">
            Find consumer leads with{" "}
            <span className="font-medium">advanced proxy protection</span>
          </p>
        </div>
      </motion.div>

      {/* Search Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              <span>B2C Lead Search</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Search for consumer leads with intelligent proxy rotation
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="searchTerm">What are you looking for?</Label>
                  <Input
                    id="searchTerm"
                    placeholder="e.g., Luxury car owners, Tech enthusiasts, Yoga practitioners"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div>
                  <Label htmlFor="maxResults">Max Results</Label>
                  <Select
                    value={maxResults.toString()}
                    onValueChange={(value) => setMaxResults(parseInt(value))}
                  >
                    <SelectTrigger id="maxResults" className="h-12">
                      <SelectValue placeholder="Select max results" />
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
                <Label>Target Locations</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                  {locations.map((location) => (
                    <motion.div
                      key={location.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant={
                          selectedLocations.includes(location.name)
                            ? "default"
                            : "outline"
                        }
                        className="w-full justify-start truncate"
                        onClick={() => {
                          if (selectedLocations.includes(location.name)) {
                            setSelectedLocations(
                              selectedLocations.filter(
                                (loc) => loc !== location.name
                              )
                            );
                          } else {
                            setSelectedLocations([
                              ...selectedLocations,
                              location.name,
                            ]);
                          }
                        }}
                      >
                        {location.name}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between space-x-4 p-3 rounded-lg border">
                  <div>
                    <Label htmlFor="decisionMakers">Only Decision Makers</Label>
                    <p className="text-sm text-muted-foreground">
                      Filter to key decision makers
                    </p>
                  </div>
                  <Switch
                    id="decisionMakers"
                    checked={onlyDecisionMakers}
                    onCheckedChange={setOnlyDecisionMakers}
                  />
                </div>

                <div className="flex items-center justify-between space-x-4 p-3 rounded-lg border">
                  <div>
                    <Label htmlFor="useProxies">Proxy Protection</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent IP blocking
                    </p>
                  </div>
                  <Switch
                    id="useProxies"
                    checked={useProxies}
                    onCheckedChange={setUseProxies}
                  />
                </div>
              </div>

              {useProxies && (
                <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100">
                  <div className="flex justify-between mb-2">
                    <Label className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Request Delay
                    </Label>
                    <Badge variant="outline" className="px-3 py-1">
                      {proxyDelay[0]}ms
                    </Badge>
                  </div>
                  <Slider
                    value={proxyDelay}
                    min={1000}
                    max={10000}
                    step={500}
                    onValueChange={(value) => setProxyDelay(value as [number])}
                    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                  />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Faster (1s)</span>
                    <span>Safer (10s)</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearchTerm("");
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

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="h-12 px-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Find B2C Leads
                  </>
                )}
              </Button>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>{error && <ErrorDisplay />}</AnimatePresence>

      {/* Results Section */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <List className="w-5 h-5 text-blue-600" />
                      <span>Search Results</span>
                    </CardTitle>
                    <CardDescription>
                      Found {results.businesses.length} B2C leads for "
                      {results.query}"
                      {results.location && ` in ${results.location}`}
                    </CardDescription>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="default"
                      onClick={handleExport}
                      disabled={isExporting || results.businesses.length === 0}
                      className="h-10"
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
                <Tabs defaultValue="businesses">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="businesses" className="gap-2">
                      <List className="w-4 h-4" />
                      Businesses
                      <Badge variant="secondary" className="ml-1">
                        {results.businesses.length}
                      </Badge>
                    </TabsTrigger>
                    {useProxies && (
                      <TabsTrigger value="proxy" className="gap-2">
                        <Shield className="w-4 h-4" />
                        Proxy Stats
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="insights" className="gap-2">
                      <Eye className="w-4 h-4" />
                      Insights
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="businesses" className="pt-4">
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="w-[200px]">
                              Business
                            </TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.businesses.map((business) =>
                            business.contacts &&
                            business.contacts.length > 0 ? (
                              business.contacts.map((contact) => (
                                <TableRow
                                  key={`${business.id}-${contact.contactId}`}
                                >
                                  <TableCell className="font-medium">
                                    {business.name}
                                  </TableCell>
                                  <TableCell>{contact.name}</TableCell>
                                  <TableCell>
                                    {contact.position || "N/A"}
                                    {contact.isDecisionMaker && (
                                      <Badge variant="outline" className="ml-2">
                                        Decision Maker
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {contact.email ? (
                                      <a
                                        href={`mailto:${contact.email}`}
                                        className="text-blue-600 hover:underline"
                                      >
                                        {contact.email}
                                      </a>
                                    ) : (
                                      "N/A"
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {contact.phoneNumber ? (
                                      <a
                                        href={`tel:${contact.phoneNumber}`}
                                        className="text-blue-600 hover:underline"
                                      >
                                        {formatPhone(contact.phoneNumber)}
                                      </a>
                                    ) : (
                                      "N/A"
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {business.source}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow key={business.id}>
                                <TableCell className="font-medium">
                                  {business.name}
                                </TableCell>
                                <TableCell
                                  colSpan={5}
                                  className="text-muted-foreground"
                                >
                                  No contact information available
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="proxy" className="pt-4">
                    {results.proxyStats && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                              Total Requests
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {results.proxyStats.totalRequests}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                              Blocked Requests
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                              {results.proxyStats.blockedRequests}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                              Average Delay
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {results.proxyStats.averageDelay}ms
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="insights" className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Location Distribution
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {selectedLocations.map((location) => {
                              const count = results.businesses.filter((b) =>
                                b.contacts?.some((c) => c.location === location)
                              ).length;
                              return (
                                <div
                                  key={location}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-sm text-muted-foreground">
                                    {location}
                                  </span>
                                  <Badge variant="secondary">
                                    {count} leads
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Decision Maker Stats
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Total Decision Makers
                              </span>
                              <Badge variant="secondary">
                                {
                                  results.businesses.filter((b) =>
                                    b.contacts?.some((c) => c.isDecisionMaker)
                                  ).length
                                }
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Average Contacts per Business
                              </span>
                              <Badge variant="secondary">
                                {(
                                  results.businesses.reduce(
                                    (acc, b) => acc + (b.contacts?.length || 0),
                                    0
                                  ) / results.businesses.length
                                ).toFixed(1)}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results State */}
      <AnimatePresence>
        {results && results.businesses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-center">No Results Found</CardTitle>
                <CardDescription className="text-center">
                  Your search for "{results.query}"{" "}
                  {results.location && `in ${results.location}`} returned no
                  results.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or expanding your location
                    filters.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedLocations([]);
                    }}
                    className="mt-4"
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    Start New Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default B2CLeadGenerator;
