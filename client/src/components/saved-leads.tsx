import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, MoreVertical } from "lucide-react";

interface SavedLeadsProps {
  leads: any[];
  isLoading: boolean;
}

export default function SavedLeads({ leads, isLoading }: SavedLeadsProps) {
  // Take only the first 5 leads for the preview
  const previewLeads = leads.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Recently Saved Leads</CardTitle>
        <Link href="/my-leads">
          <Button variant="link" className="text-primary text-sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6">Loading saved leads...</div>
        ) : previewLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewLeads.map((lead) => (
                  <TableRow key={lead.contact.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{lead.company.name}</TableCell>
                    <TableCell>{lead.contact.name}</TableCell>
                    <TableCell className="text-gray-500">{lead.contact.position}</TableCell>
                    <TableCell className="text-gray-500">{lead.contact.email}</TableCell>
                    <TableCell className="text-gray-500">{lead.contact.phone}</TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(lead.contact.searchDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={`
                          ${lead.contact.status === 'contacted' ? 'bg-green-100 text-green-800' : 
                            lead.contact.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-blue-100 text-blue-800'}
                        `}
                      >
                        {lead.contact.status === 'new' ? 'New' : 
                         lead.contact.status === 'contacted' ? 'Contacted' : 
                         lead.contact.status === 'qualified' ? 'Qualified' : 
                         lead.contact.status === 'not-interested' ? 'Not Interested' : 
                         'New'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-primary h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-500 h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            No saved leads found. Start searching to add leads.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
