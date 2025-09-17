import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, FileSpreadsheet, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportGenerationProps {
  title: string;
  data: any[];
  columns: {
    key: string;
    label: string;
    format?: (value: any) => string;
  }[];
  filename: string;
}

const ReportGeneration: React.FC<ReportGenerationProps> = ({
  title,
  data,
  columns,
  filename
}) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedRecords(new Set(data.map(record => record.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
    setSelectAll(newSelected.size === data.length);
  };

  const getSelectedData = () => {
    if (selectedRecords.size === 0) return [];
    return data.filter(record => selectedRecords.has(record.id));
  };

  const formatDataForExport = (records: any[]) => {
    return records.map(record => {
      const formatted: any = {};
      columns.forEach(column => {
        const value = getNestedValue(record, column.key);
        formatted[column.label] = column.format ? column.format(value) : value || '';
      });
      return formatted;
    });
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const exportToExcel = () => {
    const selectedData = getSelectedData();
    if (selectedData.length === 0) {
      toast({
        variant: "destructive",
        title: "No Records Selected",
        description: "Please select at least one record to export."
      });
      return;
    }

    try {
      const exportData = formatDataForExport(selectedData);
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      
      // Auto-size columns
      const colWidths = columns.map(col => ({ wch: Math.max(col.label.length, 15) }));
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, title);
      
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
      
      toast({
        title: "Export Successful",
        description: `${selectedData.length} records exported to Excel successfully.`
      });
      
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export data to Excel. Please try again."
      });
    }
  };

  const exportToPDF = () => {
    const selectedData = getSelectedData();
    if (selectedData.length === 0) {
      toast({
        variant: "destructive",
        title: "No Records Selected",
        description: "Please select at least one record to export."
      });
      return;
    }

    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      
      // Add title
      doc.setFontSize(16);
      doc.text(title, 14, 22);
      
      // Add generation info
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, 32);
      doc.text(`Total Records: ${selectedData.length}`, 14, 38);
      
      // Prepare table data
      const exportData = formatDataForExport(selectedData);
      const tableHeaders = columns.map(col => col.label);
      const tableData = exportData.map(record => 
        columns.map(col => String(record[col.label] || ''))
      );
      
      // Add table
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 45,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 81, 181] },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
        columnStyles: {}
      });
      
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      doc.save(`${filename}_${timestamp}.pdf`);
      
      toast({
        title: "Export Successful",
        description: `${selectedData.length} records exported to PDF successfully.`
      });
      
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export data to PDF. Please try again."
      });
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Generate {title} Report
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Selection Header */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <label 
                htmlFor="select-all" 
                className="text-sm font-medium cursor-pointer"
              >
                Select All ({data.length} records)
              </label>
            </div>
            <Badge variant="secondary">
              {selectedRecords.size} selected
            </Badge>
          </div>

          {/* Records List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {data.map((record) => (
              <div
                key={record.id}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
              >
                <Checkbox
                  id={record.id}
                  checked={selectedRecords.has(record.id)}
                  onCheckedChange={(checked) => 
                    handleSelectRecord(record.id, checked as boolean)
                  }
                />
                <div className="flex-1 min-w-0">
                  {renderRecordPreview(record, columns)}
                </div>
                {selectedRecords.has(record.id) ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          {/* Export Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={exportToExcel}
              disabled={selectedRecords.size === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={selectedRecords.size === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export to PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to render record preview
const renderRecordPreview = (record: any, columns: any[]) => {
  // Show first few important fields as preview
  const previewColumns = columns.slice(0, 3);
  
  return (
    <div className="space-y-1">
      {previewColumns.map((column, index) => {
        const value = getNestedValue(record, column.key);
        const displayValue = column.format ? column.format(value) : value;
        
        return (
          <div key={column.key} className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground font-medium">
              {column.label}:
            </span>
            <span className="text-sm">
              {displayValue || 'N/A'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Helper function to get nested values
const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

export default ReportGeneration;