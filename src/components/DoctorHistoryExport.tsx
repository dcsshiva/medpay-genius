import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { printReport } from '@/lib/printUtils';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { formatDateIST, formatFileTimestampIST, formatFullDateTimeIST } from '@/lib/dateUtils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PaymentHistory {
  id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  tds_amount: number;
  net_amount: number;
  bank_advice_generated_at: string;
}

interface UnpaidVisit {
  id: string;
  visit_code: string;
  visit_date: string;
  patient_name: string;
  visit_payment: number;
  payment_type: string;
  payment_status?: string;
}

interface DoctorHistoryExportProps {
  doctorName: string;
  doctorCode: string;
  paymentHistory: PaymentHistory[];
  unpaidVisits: UnpaidVisit[];
  paymentVisitsData: Map<string, any[]>;
  periodFilter: 'all' | 'custom';
  customDateRange?: { start: string; end: string };
  fetchVisitDetails: (paymentId: string) => Promise<any[]>;
}

const DoctorHistoryExport: React.FC<DoctorHistoryExportProps> = ({
  doctorName,
  doctorCode,
  paymentHistory,
  unpaidVisits,
  paymentVisitsData,
  periodFilter,
  customDateRange,
  fetchVisitDetails
}) => {
  const { toast } = useToast();

  const fetchAllVisitDetailsForExport = async (): Promise<Map<string, any[]>> => {
    const allVisitsData = new Map<string, any[]>();
    
    toast({
      title: 'Preparing Export',
      description: 'Fetching all visit details...',
    });
    
    for (const payment of paymentHistory) {
      try {
        if (paymentVisitsData.has(payment.id)) {
          allVisitsData.set(payment.id, paymentVisitsData.get(payment.id)!);
        } else {
          const visitDetails = await fetchVisitDetails(payment.id);
          allVisitsData.set(payment.id, visitDetails);
        }
      } catch (error) {
        console.error(`Error fetching visits for payment ${payment.id}:`, error);
        allVisitsData.set(payment.id, []);
      }
    }
    
    return allVisitsData;
  };

  const preparePaymentData = (allVisitsData: Map<string, any[]>) => {
    const rows: any[] = [];
    
    paymentHistory.forEach(payment => {
      rows.push({
        type: 'Payment Period',
        period: `${formatDateIST(payment.period_start)} - ${formatDateIST(payment.period_end)}`,
        visit_code: '',
        visit_date: '',
        patient: '',
        payment_type: '',
        visit_amount: '',
        gross_amount: formatCurrency(payment.gross_amount),
        tds: formatCurrency(payment.tds_amount),
        net_amount: formatCurrency(payment.net_amount),
        generated_on: formatDateIST(payment.bank_advice_generated_at)
      });
      
      const visits = allVisitsData.get(payment.id) || [];
      visits.forEach(visit => {
        rows.push({
          type: 'Visit Detail',
          period: '',
          visit_code: visit.visit_code,
          visit_date: formatDateIST(visit.visit_date),
          patient: visit.patient_name,
          payment_type: visit.payment_type,
          visit_amount: formatCurrency(visit.visit_payment),
          gross_amount: '',
          tds: '',
          net_amount: '',
          generated_on: ''
        });
      });
    });
    
    return rows;
  };

  const prepareUnpaidData = () => {
    return unpaidVisits.map(visit => ({
      visit_code: visit.visit_code,
      visit_date: formatDateIST(visit.visit_date),
      patient: visit.patient_name,
      payment_type: visit.payment_type,
      amount: formatCurrency(visit.visit_payment),
      status: visit.payment_status || 'Unpaid'
    }));
  };

  const exportToExcel = async () => {
    try {
      const allVisitsData = await fetchAllVisitDetailsForExport();
      
      const wb = XLSX.utils.book_new();
      
      if (paymentHistory.length > 0) {
        const paidData = preparePaymentData(allVisitsData);
        
        const totalGross = paymentHistory.reduce((sum, p) => sum + Number(p.gross_amount), 0);
        const totalTDS = paymentHistory.reduce((sum, p) => sum + Number(p.tds_amount), 0);
        const totalNet = paymentHistory.reduce((sum, p) => sum + Number(p.net_amount), 0);
        
        paidData.push({
          type: 'NET TOTAL',
          period: '',
          visit_code: '',
          visit_date: '',
          patient: '',
          payment_type: '',
          visit_amount: '',
          gross_amount: formatCurrency(totalGross),
          tds: formatCurrency(totalTDS),
          net_amount: formatCurrency(totalNet),
          generated_on: ''
        });
        
        const ws1 = XLSX.utils.json_to_sheet(paidData);
        
        const colWidths = [
          { wch: 15 },
          { wch: 22 },
          { wch: 12 },
          { wch: 12 },
          { wch: 20 },
          { wch: 12 },
          { wch: 15 },
          { wch: 15 },
          { wch: 12 },
          { wch: 15 },
          { wch: 15 }
        ];
        ws1['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws1, 'Paid History');
      }
      
      if (unpaidVisits.length > 0) {
        const unpaidData = prepareUnpaidData();
        
        const totalUnpaid = unpaidVisits.reduce((sum, v) => sum + Number(v.visit_payment), 0);
        
        unpaidData.push({
          visit_code: 'NET TOTAL',
          visit_date: '',
          patient: '',
          payment_type: '',
          amount: formatCurrency(totalUnpaid),
          status: ''
        });
        
        const ws2 = XLSX.utils.json_to_sheet(unpaidData);
        
        const colWidths = [
          { wch: 12 },
          { wch: 12 },
          { wch: 20 },
          { wch: 12 },
          { wch: 15 },
          { wch: 12 }
        ];
        ws2['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws2, 'Unpaid Visits');
      }
      
      const timestamp = formatFileTimestampIST();
      const periodSuffix = periodFilter === 'custom' && customDateRange 
        ? `_${customDateRange.start}_to_${customDateRange.end}`
        : '_AllTime';
      const sanitizedName = doctorName.replace(/[^a-zA-Z0-9]/g, '_');
      
      XLSX.writeFile(wb, `Doctor_History_${sanitizedName}_${timestamp}${periodSuffix}.xlsx`);
      
      toast({
        title: 'Export Successful',
        description: 'Doctor history exported to Excel successfully.'
      });
    } catch (error) {
      console.error('Excel Export Error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: `Failed to export to Excel: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const exportToPDF = async () => {
    try {
      const allVisitsData = await fetchAllVisitDetailsForExport();
      
      const doc = new jsPDF('l', 'mm', 'a4');
      
      doc.setFontSize(16);
      doc.text(`Doctor Payment History - ${doctorName}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Doctor Code: ${doctorCode}`, 14, 22);
      doc.text(`Generated: ${formatFullDateTimeIST(new Date())}`, 14, 28);
      
      const periodText = periodFilter === 'custom' && customDateRange
        ? `Period: ${customDateRange.start} to ${customDateRange.end}`
        : 'Period: All Time';
      doc.text(periodText, 14, 34);
      
      let currentY = 40;
      
      if (paymentHistory.length > 0) {
        doc.setFontSize(12);
        doc.text('Paid Payment History', 14, currentY);
        currentY += 3;
        
        const paidData = preparePaymentData(allVisitsData).map(row => [
          row.type,
          row.period,
          row.visit_code,
          row.visit_date,
          row.patient,
          row.payment_type,
          row.visit_amount.replace(/₹/g, 'Rs. '),
          row.gross_amount.replace(/₹/g, 'Rs. '),
          row.tds.replace(/₹/g, 'Rs. '),
          row.net_amount.replace(/₹/g, 'Rs. ')
        ]);
        
        autoTable(doc, {
          head: [['Type', 'Period', 'Visit Code', 'Date', 'Patient', 'Type', 'Visit Amt', 'Gross', 'TDS', 'Net']],
          body: paidData,
          startY: currentY,
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [63, 81, 181] },
          didParseCell: (data: any) => {
            if (data.row.index === paidData.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [230, 230, 230];
            }
          }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
      
      if (unpaidVisits.length > 0 && currentY < 180) {
        doc.setFontSize(12);
        doc.text('Unpaid Visits', 14, currentY);
        currentY += 3;
        
        const unpaidData = prepareUnpaidData().map(row => [
          row.visit_code,
          row.visit_date,
          row.patient,
          row.payment_type,
          row.amount.replace(/₹/g, 'Rs. '),
          row.status
        ]);
        
        autoTable(doc, {
          head: [['Visit Code', 'Date', 'Patient', 'Type', 'Amount', 'Status']],
          body: unpaidData,
          startY: currentY,
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [237, 108, 2] },
          didParseCell: (data: any) => {
            if (data.row.index === unpaidData.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [230, 230, 230];
            }
          }
        });
      }
      
      const timestamp = formatFileTimestampIST();
      const periodSuffix = periodFilter === 'custom' && customDateRange 
        ? `_${customDateRange.start}_to_${customDateRange.end}`
        : '_AllTime';
      const sanitizedName = doctorName.replace(/[^a-zA-Z0-9]/g, '_');
      
      doc.save(`Doctor_History_${sanitizedName}_${timestamp}${periodSuffix}.pdf`);
      
      toast({
        title: 'Export Successful',
        description: 'Doctor history exported to PDF successfully.'
      });
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: `Failed to export to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export History
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export to PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={async () => {
          const allVisitsData = await fetchAllVisitDetailsForExport();
          const cols = [
            { label: 'Type', key: 'type' },
            { label: 'Period', key: 'period' },
            { label: 'Visit Code', key: 'visit_code' },
            { label: 'Patient', key: 'patient' },
            { label: 'Visit Amount', key: 'visit_amount' },
            { label: 'Gross', key: 'gross_amount' },
            { label: 'TDS', key: 'tds' },
            { label: 'Net', key: 'net_amount' },
          ];
          const data = preparePaymentData(allVisitsData);
          printReport({ title: `Doctor History - ${doctorName}`, columns: cols, data, subtitle: `Code: ${doctorCode}` });
        }}>
          <Printer className="h-4 w-4 mr-2" />
          Print Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DoctorHistoryExport;
