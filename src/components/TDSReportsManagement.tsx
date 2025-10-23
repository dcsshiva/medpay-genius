import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { 
  getFinancialYearOptions, 
  getQuarterOptions, 
  getQuarterDateRange 
} from '@/lib/tdsUtils';
import { FileSpreadsheet, Loader2, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export function TDSReportsManagement() {
  const { toast } = useToast();
  
  const [quarterFY, setQuarterFY] = useState<string>('');
  const [quarter, setQuarter] = useState<string>('');
  const [annualFY, setAnnualFY] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateQuarterlyReport = async () => {
    if (!quarterFY || !quarter) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select financial year and quarter'
      });
      return;
    }

    setLoading(true);
    try {
      const { startDate, endDate } = getQuarterDateRange(quarterFY, quarter);
      
      const { data, error } = await supabase.rpc('get_doctor_tds_summary', {
        _start_date: format(startDate, 'yyyy-MM-dd'),
        _end_date: format(endDate, 'yyyy-MM-dd')
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: 'No Data',
          description: 'No TDS data found for the selected period'
        });
        return;
      }

      // Calculate grand total
      const grandTotal = {
        total_gross: data.reduce((sum: number, d: any) => sum + parseFloat(d.total_gross_amount || 0), 0),
        total_tds: data.reduce((sum: number, d: any) => sum + parseFloat(d.total_tds_amount || 0), 0),
        total_net: data.reduce((sum: number, d: any) => sum + parseFloat(d.total_net_amount || 0), 0)
      };

      // Prepare Excel data
      const excelData = data.map((row: any) => ({
        'Doctor Code': row.doctor_code,
        'Doctor Name': row.doctor_name,
        'Total Payments': row.total_payments,
        'Gross Amount': parseFloat(row.total_gross_amount || 0),
        'TDS @ 10%': parseFloat(row.total_tds_amount || 0),
        'Net Amount': parseFloat(row.total_net_amount || 0)
      }));

      // Add total row
      excelData.push({
        'Doctor Code': 'TOTAL',
        'Doctor Name': '',
        'Total Payments': data.reduce((sum: number, d: any) => sum + parseInt(d.total_payments || 0), 0),
        'Gross Amount': grandTotal.total_gross,
        'TDS @ 10%': grandTotal.total_tds,
        'Net Amount': grandTotal.total_net
      });

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${quarter} Report`);

      // Add styling (bold header)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = { font: { bold: true } };
      }

      // Download
      XLSX.writeFile(wb, `TDS_Quarterly_Report_${quarterFY}_${quarter}.xlsx`);

      toast({
        title: 'Report Generated',
        description: `Quarterly TDS report for ${quarterFY} ${quarter} has been downloaded`
      });
    } catch (error) {
      console.error('Error generating quarterly report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate quarterly report'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAnnualReport = async () => {
    if (!annualFY) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select financial year'
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch data for all 4 quarters
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterData: any = {};
      
      for (const q of quarters) {
        const { startDate, endDate } = getQuarterDateRange(annualFY, q);
        
        const { data, error } = await supabase.rpc('get_doctor_tds_summary', {
          _start_date: format(startDate, 'yyyy-MM-dd'),
          _end_date: format(endDate, 'yyyy-MM-dd')
        });

        if (error) throw error;
        quarterData[q] = data || [];
      }

      // Get all unique doctors
      const allDoctors = new Set<string>();
      Object.values(quarterData).forEach((data: any) => {
        data.forEach((row: any) => allDoctors.add(row.doctor_code));
      });

      // Prepare Excel data
      const excelData = Array.from(allDoctors).map(doctorCode => {
        const row: any = {
          'Doctor Code': doctorCode,
          'Doctor Name': ''
        };

        quarters.forEach(q => {
          const doctorData = quarterData[q].find((d: any) => d.doctor_code === doctorCode);
          row['Doctor Name'] = doctorData?.doctor_name || row['Doctor Name'];
          row[`${q} Gross`] = parseFloat(doctorData?.total_gross_amount || 0);
          row[`${q} TDS`] = parseFloat(doctorData?.total_tds_amount || 0);
          row[`${q} Net`] = parseFloat(doctorData?.total_net_amount || 0);
        });

        // Calculate totals
        row['Total Gross'] = quarters.reduce((sum, q) => sum + (row[`${q} Gross`] || 0), 0);
        row['Total TDS'] = quarters.reduce((sum, q) => sum + (row[`${q} TDS`] || 0), 0);
        row['Total Net'] = quarters.reduce((sum, q) => sum + (row[`${q} Net`] || 0), 0);

        return row;
      });

      // Add grand total row
      const grandTotal: any = {
        'Doctor Code': 'GRAND TOTAL',
        'Doctor Name': ''
      };
      
      quarters.forEach(q => {
        grandTotal[`${q} Gross`] = excelData.reduce((sum, row) => sum + (row[`${q} Gross`] || 0), 0);
        grandTotal[`${q} TDS`] = excelData.reduce((sum, row) => sum + (row[`${q} TDS`] || 0), 0);
        grandTotal[`${q} Net`] = excelData.reduce((sum, row) => sum + (row[`${q} Net`] || 0), 0);
      });
      
      grandTotal['Total Gross'] = excelData.reduce((sum, row) => sum + (row['Total Gross'] || 0), 0);
      grandTotal['Total TDS'] = excelData.reduce((sum, row) => sum + (row['Total TDS'] || 0), 0);
      grandTotal['Total Net'] = excelData.reduce((sum, row) => sum + (row['Total Net'] || 0), 0);
      
      excelData.push(grandTotal);

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Annual ${annualFY}`);

      // Download
      XLSX.writeFile(wb, `TDS_Annual_Report_${annualFY}.xlsx`);

      toast({
        title: 'Report Generated',
        description: `Annual TDS report for FY ${annualFY} has been downloaded`
      });
    } catch (error) {
      console.error('Error generating annual report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate annual report'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCustomReport = async () => {
    if (!customStartDate || !customEndDate) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select both start and end dates'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_doctor_tds_summary', {
        _start_date: customStartDate,
        _end_date: customEndDate
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: 'No Data',
          description: 'No TDS data found for the selected period'
        });
        return;
      }

      // Calculate grand total
      const grandTotal = {
        total_gross: data.reduce((sum: number, d: any) => sum + parseFloat(d.total_gross_amount || 0), 0),
        total_tds: data.reduce((sum: number, d: any) => sum + parseFloat(d.total_tds_amount || 0), 0),
        total_net: data.reduce((sum: number, d: any) => sum + parseFloat(d.total_net_amount || 0), 0)
      };

      // Prepare Excel data
      const excelData = data.map((row: any) => ({
        'Doctor Code': row.doctor_code,
        'Doctor Name': row.doctor_name,
        'Total Payments': row.total_payments,
        'Gross Amount': parseFloat(row.total_gross_amount || 0),
        'TDS @ 10%': parseFloat(row.total_tds_amount || 0),
        'Net Amount': parseFloat(row.total_net_amount || 0)
      }));

      // Add total row
      excelData.push({
        'Doctor Code': 'TOTAL',
        'Doctor Name': '',
        'Total Payments': data.reduce((sum: number, d: any) => sum + parseInt(d.total_payments || 0), 0),
        'Gross Amount': grandTotal.total_gross,
        'TDS @ 10%': grandTotal.total_tds,
        'Net Amount': grandTotal.total_net
      });

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Custom Report');

      // Download
      const filename = `TDS_Custom_Report_${customStartDate}_to_${customEndDate}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: 'Report Generated',
        description: 'Custom TDS report has been downloaded'
      });
    } catch (error) {
      console.error('Error generating custom report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate custom report'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            TDS Reports
          </CardTitle>
          <CardDescription>
            Generate consolidated TDS reports for tax filing and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="quarterly" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
              <TabsTrigger value="annual">Annual</TabsTrigger>
              <TabsTrigger value="custom">Custom Period</TabsTrigger>
            </TabsList>

            <TabsContent value="quarterly" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Financial Year</Label>
                  <Select value={quarterFY} onValueChange={setQuarterFY}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select FY" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFinancialYearOptions().map(fy => (
                        <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quarter</Label>
                  <Select value={quarter} onValueChange={setQuarter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {getQuarterOptions().map(q => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={generateQuarterlyReport} 
                disabled={loading || !quarterFY || !quarter}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Generate Quarterly Report
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="annual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Financial Year</Label>
                <Select value={annualFY} onValueChange={setAnnualFY}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select FY" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFinancialYearOptions().map(fy => (
                      <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={generateAnnualReport} 
                disabled={loading || !annualFY}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Generate Annual Report
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input 
                    type="date" 
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={generateCustomReport} 
                disabled={loading || !customStartDate || !customEndDate}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Generate Custom Report
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
