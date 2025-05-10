import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

export default function SearchHistory() {
  const [searchTerm, setSearchTerm] = useState("");

  // Get search history
  const { data: searchHistory, isLoading } = useQuery({
    queryKey: ['/api/search-history'],
  });

  // Filter history based on search term
  const filteredHistory = searchHistory?.filter((item: any) => {
    const searchTermLower = searchTerm.toLowerCase();
    return item.query.toLowerCase().includes(searchTermLower);
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Search History</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search history..."
                  className="pl-8 w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-6">Loading search history...</div>
            ) : filteredHistory && filteredHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Search Query</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Results</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((item: any) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.query}</TableCell>
                        <TableCell className="text-gray-500">
                          {new Date(item.searchDate).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {item.resultsCount} leads found
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No search history found. Start searching to see your history.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
