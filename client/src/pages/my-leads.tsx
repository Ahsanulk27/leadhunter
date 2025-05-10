import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ExportModal from "@/components/export-modal";
import { Search, Filter, SortDesc, Download, Star, Edit, MoreVertical } from "lucide-react";

export default function MyLeads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [contactStatus, setContactStatus] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get saved leads
  const { data: savedLeads, isLoading } = useQuery({
    queryKey: ['/api/saved-leads'],
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number, status: string, notes: string }) => {
      const response = await apiRequest('POST', `/api/update-contact/${id}`, { status, notes });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-leads'] });
      setIsUpdateModalOpen(false);
      toast({
        title: "Contact Updated",
        description: "Contact information has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Error",
        description: error instanceof Error ? error.message : "Failed to update contact",
        variant: "destructive",
      });
    }
  });

  // Filter leads based on search term
  const filteredLeads = savedLeads?.filter((lead: any) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      lead.contact.name.toLowerCase().includes(searchTermLower) ||
      lead.company.name.toLowerCase().includes(searchTermLower) ||
      (lead.contact.position && lead.contact.position.toLowerCase().includes(searchTermLower)) ||
      (lead.contact.email && lead.contact.email.toLowerCase().includes(searchTermLower))
    );
  });

  // Handle contact update
  const handleUpdateContact = () => {
    if (selectedContact && contactStatus) {
      updateContactMutation.mutate({
        id: selectedContact.id,
        status: contactStatus,
        notes: contactNotes
      });
    }
  };

  // Open update dialog
  const openUpdateDialog = (contact: any) => {
    setSelectedContact(contact);
    setContactStatus(contact.status || "new");
    setContactNotes(contact.notes || "");
    setIsUpdateModalOpen(true);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>My Saved Leads</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search leads..."
                  className="pl-8 w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-1 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <SortDesc className="mr-1 h-4 w-4" />
                Sort
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="bg-amber-500 hover:bg-amber-600"
                onClick={() => setIsExportModalOpen(true)}
              >
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-6">Loading saved leads...</div>
            ) : filteredLeads && filteredLeads.length > 0 ? (
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
                    {filteredLeads.map((lead: any) => (
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
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${lead.contact.status === 'contacted' ? 'bg-green-100 text-green-800' : 
                              lead.contact.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-blue-100 text-blue-800'}`}>
                            {lead.contact.status === 'new' ? 'New' : 
                             lead.contact.status === 'contacted' ? 'Contacted' : 
                             lead.contact.status === 'qualified' ? 'Qualified' : 
                             lead.contact.status === 'not-interested' ? 'Not Interested' : 
                             'New'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary h-8 w-8 p-0"
                            onClick={() => openUpdateDialog(lead.contact)}
                          >
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

        {/* Export Modal */}
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          leads={filteredLeads?.map((lead: any) => lead.contact) || []}
          company={filteredLeads?.[0]?.company}
        />

        {/* Update Contact Dialog */}
        <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Contact</DialogTitle>
            </DialogHeader>
            
            {selectedContact && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Contact Name</Label>
                  <Input id="contact-name" value={selectedContact.name} disabled />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-status">Status</Label>
                  <Select
                    value={contactStatus}
                    onValueChange={setContactStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="not-interested">Not Interested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-notes">Notes</Label>
                  <Textarea
                    id="contact-notes"
                    placeholder="Add notes about this contact"
                    value={contactNotes}
                    onChange={(e) => setContactNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateContact}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
