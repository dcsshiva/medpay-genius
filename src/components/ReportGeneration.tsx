import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, FileSpreadsheet, CheckCircle2, Circle, Search } from 'lucide-react';
import { formatFileTimestampIST, formatFullDateTimeIST } from '@/lib/dateUtils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [doctorSearch, setDoctorSearch] = useState('');

  // Filter data based on doctor search
  const filteredData = useMemo(() => {
    if (!doctorSearch.trim()) return data;
    
    return data.filter(record => {
      const doctorName = getNestedValue(record, 'doctor_name') || '';
      return doctorName.toLowerCase().includes(doctorSearch.toLowerCase().trim());
    });
  }, [data, doctorSearch]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedRecords(new Set(filteredData.map(record => record.id)));
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
    setSelectAll(newSelected.size === filteredData.length && filteredData.length > 0);
  };

  const getSelectedData = () => {
    if (selectedRecords.size === 0) return [];
    return filteredData.filter(record => selectedRecords.has(record.id));
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

  const calculateNetTotals = (records: any[]) => {
    const totals: any = {};
    
    columns.forEach(column => {
      const values = records.map(record => getNestedValue(record, column.key));
      
      // Check if this column contains numerical data that should be summed
      const isNumericColumn = column.key.includes('amount') || 
                             column.key.includes('visits') || 
                             column.key.includes('payment') ||
                             values.some(val => typeof val === 'number' && val > 0);
      
      if (isNumericColumn) {
        const numericValues = values
          .map(val => typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0)
          .filter(val => !isNaN(val));
        
        const total = numericValues.reduce((sum, val) => sum + val, 0);
        totals[column.label] = column.format ? column.format(total) : total;
      } else {
        // For non-numeric columns, show "NET TOTAL" in the first column, empty in others
        totals[column.label] = column === columns[0] ? 'NET TOTAL' : '';
      }
    });
    
    return totals;
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
      const netTotals = calculateNetTotals(selectedData);
      
      // Add net totals row to export data
      const dataWithTotals = [...exportData, netTotals];
      
      const ws = XLSX.utils.json_to_sheet(dataWithTotals);
      const wb = XLSX.utils.book_new();
      
      // Auto-size columns
      const colWidths = columns.map(col => ({ wch: Math.max(col.label.length, 20) }));
      ws['!cols'] = colWidths;
      
      // Style the totals row (last row)
      const lastRowIndex = dataWithTotals.length;
      columns.forEach((col, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: lastRowIndex, c: colIndex });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "E8E8E8" } },
            border: {
              top: { style: "thick", color: { rgb: "000000" } },
              bottom: { style: "thick", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        }
      });
      
      XLSX.utils.book_append_sheet(wb, ws, title);
      
      const timestamp = formatFileTimestampIST();
      XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
      
      toast({
        title: "Export Successful",
        description: `${selectedData.length} records exported to Excel with net totals.`
      });
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Excel Export Error:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: `Failed to export data to Excel: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      doc.text(`Generated on: ${formatFullDateTimeIST(new Date())}`, 14, 32);
      doc.text(`Total Records: ${selectedData.length}`, 14, 38);
      
      // Prepare table data
      const exportData = formatDataForExport(selectedData);
      const netTotals = calculateNetTotals(selectedData);
      
      const tableHeaders = columns.map(col => col.label);
      const tableData = exportData.map(record => 
        columns.map(col => {
          const value = record[col.label];
          // Convert to string and handle null/undefined
          if (value === null || value === undefined) return '';
          return String(value);
        })
      );
      
      // Add net totals row
      const totalsRow = columns.map(col => {
        const value = netTotals[col.label];
        if (value === null || value === undefined) return '';
        return String(value);
      });
      tableData.push(totalsRow);
      
      // Add table using autoTable plugin
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 45,
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        headStyles: { 
          fillColor: [63, 81, 181],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        // Style the last row (totals row) differently
        didParseCell: (data: any) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [230, 230, 230];
            data.cell.styles.textColor = [0, 0, 0];
            data.cell.styles.lineWidth = 0.5;
            data.cell.styles.lineColor = [0, 0, 0];
          }
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
        theme: 'striped',
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          // Allow text wrapping for longer content
          0: { cellWidth: 'auto' }
        }
      });
      
      const timestamp = formatFileTimestampIST();
      doc.save(`${filename}_${timestamp}.pdf`);
      
      toast({
        title: "Export Successful",
        description: `${selectedData.length} records exported to PDF with net totals.`
      });
      
      setDialogOpen(false);
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: `Failed to export data to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  if (data.length === 0) {
    return null;
  }

  // Reset selections when dialog opens
  const handleDialogOpen = (open: boolean) => {
    setDialogOpen(open);
    if (open) {
      setSelectedRecords(new Set());
      setSelectAll(false);
      setDoctorSearch('');
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-4xl max-h-[80vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.dialog-content-inner')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('input, button, .dialog-content-inner')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Generate {title} Report
          </DialogTitle>
          <DialogDescription>
            Search for specific doctors and select the records you want to include in your report.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 dialog-content-inner">
          {/* Doctor Search */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by doctor name..."
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                (e.target as HTMLInputElement).focus();
              }}
              onFocus={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              className="pl-10"
            />
          </div>

          {/* Selection Header */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                disabled={filteredData.length === 0}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <label 
                htmlFor="select-all" 
                className="text-sm font-medium cursor-pointer"
              >
                Select All ({filteredData.length} records)
                {doctorSearch && (
                  <span className="text-muted-foreground"> - filtered from {data.length}</span>
                )}
              </label>
            </div>
            <Badge variant="secondary">
              {selectedRecords.size} selected
            </Badge>
          </div>

          {/* Records List */}
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {doctorSearch ? 
                `No records found for "${doctorSearch}"` : 
                'No records available'
              }
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredData.map((record) => (
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
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
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
          )}

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