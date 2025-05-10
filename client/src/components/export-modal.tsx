import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { saveAs } from "file-saver";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: any[];
  company?: any;
}

export default function ExportModal({ isOpen, onClose, leads, company }: ExportModalProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [fieldsToExport, setFieldsToExport] = useState({
    name: true,
    title: true,
    company: true,
    email: true,
    phone: true,
    address: true,
    industry: true
  });
  
  const { toast } = useToast();

  const handleExport = () => {
    if (leads.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no leads to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create CSV data
      let csvContent = "";
      
      // Header row
      const headers = [];
      if (fieldsToExport.company) headers.push("Company");
      if (fieldsToExport.name) headers.push("Contact Name");
      if (fieldsToExport.title) headers.push("Title/Position");
      if (fieldsToExport.email) headers.push("Email");
      if (fieldsToExport.phone) headers.push("Phone");
      if (fieldsToExport.address) headers.push("Address");
      if (fieldsToExport.industry) headers.push("Industry");
      
      csvContent += headers.join(",") + "\r\n";
      
      // Data rows
      leads.forEach(lead => {
        const row = [];
        if (fieldsToExport.company) row.push(`"${company?.name || ''}"`.replace(/"/g, '""'));
        if (fieldsToExport.name) row.push(`"${lead.name || ''}"`.replace(/"/g, '""'));
        if (fieldsToExport.title) row.push(`"${lead.position || ''}"`.replace(/"/g, '""'));
        if (fieldsToExport.email) row.push(`"${lead.email || ''}"`.replace(/"/g, '""'));
        if (fieldsToExport.phone) row.push(`"${lead.phone || ''}"`.replace(/"/g, '""'));
        if (fieldsToExport.address) row.push(`"${company?.address || ''}"`.replace(/"/g, '""'));
        if (fieldsToExport.industry) row.push(`"${company?.industry || ''}"`.replace(/"/g, '""'));
        
        csvContent += row.join(",") + "\r\n";
      });
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const filename = `leadhunter_export_${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, filename);
      
      toast({
        title: "Export successful",
        description: `${leads.length} leads have been exported as ${exportFormat.toUpperCase()}`,
      });
      
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the data",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Leads</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Format</Label>
            <div className="mt-1 flex space-x-2">
              <Button
                type="button"
                variant={exportFormat === 'csv' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setExportFormat('csv')}
              >
                CSV
              </Button>
              <Button
                type="button"
                variant={exportFormat === 'excel' ? 'default' : 'outline'}
                className="flex-1 relative"
                onClick={() => setExportFormat('excel')}
                disabled
              >
                Excel
                <span className="absolute -top-2 -right-2 text-xs bg-gray-100 text-gray-600 px-1 rounded-md">Soon</span>
              </Button>
              <Button
                type="button"
                variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                className="flex-1 relative"
                onClick={() => setExportFormat('pdf')}
                disabled
              >
                PDF
                <span className="absolute -top-2 -right-2 text-xs bg-gray-100 text-gray-600 px-1 rounded-md">Soon</span>
              </Button>
            </div>
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              Choose fields to export
            </Label>
            <div className="mt-1 space-y-2">
              <div className="flex items-center">
                <Checkbox
                  id="field-name"
                  checked={fieldsToExport.name}
                  onCheckedChange={(checked) => setFieldsToExport({
                    ...fieldsToExport,
                    name: checked === true
                  })}
                />
                <Label htmlFor="field-name" className="ml-2 block text-sm text-gray-700">
                  Contact Name
                </Label>
              </div>
              
              <div className="flex items-center">
                <Checkbox
                  id="field-title"
                  checked={fieldsToExport.title}
                  onCheckedChange={(checked) => setFieldsToExport({
                    ...fieldsToExport,
                    title: checked === true
                  })}
                />
                <Label htmlFor="field-title" className="ml-2 block text-sm text-gray-700">
                  Title/Position
                </Label>
              </div>
              
              <div className="flex items-center">
                <Checkbox
                  id="field-company"
                  checked={fieldsToExport.company}
                  onCheckedChange={(checked) => setFieldsToExport({
                    ...fieldsToExport,
                    company: checked === true
                  })}
                />
                <Label htmlFor="field-company" className="ml-2 block text-sm text-gray-700">
                  Company Name
                </Label>
              </div>
              
              <div className="flex items-center">
                <Checkbox
                  id="field-email"
                  checked={fieldsToExport.email}
                  onCheckedChange={(checked) => setFieldsToExport({
                    ...fieldsToExport,
                    email: checked === true
                  })}
                />
                <Label htmlFor="field-email" className="ml-2 block text-sm text-gray-700">
                  Email Address
                </Label>
              </div>
              
              <div className="flex items-center">
                <Checkbox
                  id="field-phone"
                  checked={fieldsToExport.phone}
                  onCheckedChange={(checked) => setFieldsToExport({
                    ...fieldsToExport,
                    phone: checked === true
                  })}
                />
                <Label htmlFor="field-phone" className="ml-2 block text-sm text-gray-700">
                  Phone Number
                </Label>
              </div>
              
              <div className="flex items-center">
                <Checkbox
                  id="field-address"
                  checked={fieldsToExport.address}
                  onCheckedChange={(checked) => setFieldsToExport({
                    ...fieldsToExport,
                    address: checked === true
                  })}
                />
                <Label htmlFor="field-address" className="ml-2 block text-sm text-gray-700">
                  Company Address
                </Label>
              </div>
              
              <div className="flex items-center">
                <Checkbox
                  id="field-industry"
                  checked={fieldsToExport.industry}
                  onCheckedChange={(checked) => setFieldsToExport({
                    ...fieldsToExport,
                    industry: checked === true
                  })}
                />
                <Label htmlFor="field-industry" className="ml-2 block text-sm text-gray-700">
                  Industry
                </Label>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            Export {leads.length} Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
