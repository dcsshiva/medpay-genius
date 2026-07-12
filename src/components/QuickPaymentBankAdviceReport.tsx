import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Search, Calendar, TrendingUp, IndianRupee, DollarSign, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDateIST, formatFullDateTimeIST } from '@/lib/dateUtils';
import ReportGeneration from './ReportGeneration';
import { StatsCard } from '@/components/ui/stats-card';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { MobileListCard } from '@/components/mobile/MobileListCard';


interface QuickPaymentReportData {
  id: string;
  payment_date: string;
  beneficiary_name: string;
  mobile_number: string;
  payment_type_name: string;
  gross_amount: number;
  tds_amount: number;
  tds_percentage: number;
  net_amount: number;
  bank_processed_at: string;
  bank_advice_reference: string;
  vendor_name?: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  account_holder_name: string;
}

interface PaymentType {
  id: string;
  type_name: string;
}

const QuickPaymentBankAdviceReport = () => {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<QuickPaymentReportData[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [bankAdviceRefSearch, setBankAdviceRefSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'all'>(20);

  useEffect(() => {
    fetchPaymentTypes();
    fetchReportData();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, paymentTypeFilter, beneficiarySearch, vendorSearch, bankAdviceRefSearch]);

  const fetchPaymentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_payment_types')
        .select('id, type_name')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setPaymentTypes(data || []);
    } catch (error: any) {
      console.error('Error fetching payment types:', error);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('quick_payments')
        .select(`
          id,
          name,
          mobile_number,
          gross_amount,
          tds_amount,
          tds_percentage,
          net_amount,
          bank_advice_generated_at,
          bank_advice_reference,
          account_number,
          ifsc_code,
          bank_name,
          account_holder_name,
          created_at,
          payment_type_id,
          vendor_id,
          quick_payment_types (
            type_name
          ),
          vendors (
            vendor_name
          )
        `)
        .eq('bank_advice_generated', true)
        .order('bank_advice_generated_at', { ascending: false });

      if (error) throw error;

      const formattedData: QuickPaymentReportData[] = (data || []).map((payment: any) => ({
        id: payment.id,
        payment_date: payment.created_at,
        beneficiary_name: payment.name,
        mobile_number: payment.mobile_number,
        payment_type_name: payment.quick_payment_types?.type_name || 'N/A',
        gross_amount: payment.gross_amount,
        tds_amount: payment.tds_amount,
        tds_percentage: payment.tds_percentage,
        net_amount: payment.net_amount,
        bank_processed_at: payment.bank_advice_generated_at,
        bank_advice_reference: payment.bank_advice_reference || '',
        vendor_name: payment.vendors?.vendor_name,
        account_number: payment.account_number || '',
        ifsc_code: payment.ifsc_code || '',
        bank_name: payment.bank_name || '',
        account_holder_name: payment.account_holder_name || payment.name,
      }));

      setReportData(formattedData);
    } catch (error: any) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return reportData.filter((payment) => {
      // Date range filter
      if (startDate && new Date(payment.bank_processed_at) < new Date(startDate)) {
        return false;
      }
      if (endDate && new Date(payment.bank_processed_at) > new Date(endDate + 'T23:59:59')) {
        return false;
      }

      // Payment type filter
      if (paymentTypeFilter !== 'all' && payment.payment_type_name !== paymentTypeFilter) {
        return false;
      }

      // Beneficiary search (name or mobile)
      if (beneficiarySearch) {
        const searchLower = beneficiarySearch.toLowerCase();
        const matchesName = payment.beneficiary_name.toLowerCase().includes(searchLower);
        const matchesMobile = payment.mobile_number.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesMobile) {
          return false;
        }
      }

      // Vendor search
      if (vendorSearch && payment.vendor_name) {
        if (!payment.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase())) {
          return false;
        }
      }

      // Bank advice reference search
      if (bankAdviceRefSearch) {
        if (!payment.bank_advice_reference.toLowerCase().includes(bankAdviceRefSearch.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [reportData, startDate, endDate, paymentTypeFilter, beneficiarySearch, vendorSearch, bankAdviceRefSearch]);

  const stats = useMemo(() => {
    return {
      totalPayments: filteredData.length,
      totalGross: filteredData.reduce((sum, p) => sum + p.gross_amount, 0),
      totalTDS: filteredData.reduce((sum, p) => sum + p.tds_amount, 0),
      totalNet: filteredData.reduce((sum, p) => sum + p.net_amount, 0),
    };
  }, [filteredData]);

  // Calculate pagination
  const indexOfLastRecord = recordsPerPage === 'all' 
    ? filteredData.length 
    : currentPage * recordsPerPage;
  const indexOfFirstRecord = recordsPerPage === 'all' 
    ? 0 
    : indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);

  const handleQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setPaymentTypeFilter('all');
    setBeneficiarySearch('');
    setVendorSearch('');
    setBankAdviceRefSearch('');
  };

  const exportColumns = [
    { key: 'payment_date', label: 'Payment Date', format: (val: string) => formatDateIST(new Date(val)) },
    { key: 'beneficiary_name', label: 'Beneficiary Name' },
    { key: 'mobile_number', label: 'Mobile Number' },
    { key: 'payment_type_name', label: 'Payment Type' },
    { key: 'gross_amount', label: 'Gross Amount', format: (val: number) => formatCurrency(val) },
    { key: 'tds_percentage', label: 'TDS %' },
    { key: 'tds_amount', label: 'TDS Amount', format: (val: number) => formatCurrency(val) },
    { key: 'net_amount', label: 'Net Amount', format: (val: number) => formatCurrency(val) },
    { key: 'bank_processed_at', label: 'Bank Processed Date & Time', format: (val: string) => formatFullDateTimeIST(new Date(val)) },
    { key: 'bank_advice_reference', label: 'Bank Advice Reference' },
    { key: 'bank_name', label: 'Bank Name' },
    { key: 'account_number', label: 'Account Number' },
    { key: 'ifsc_code', label: 'IFSC Code' },
    { key: 'vendor_name', label: 'Vendor', format: (val: string) => val || 'N/A' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quick Payment Bank Advice Report</h1>
          <p className="text-muted-foreground mt-1">
            Detailed report of all bank-processed quick payments
          </p>
        </div>
        <ReportGeneration
          title="Quick Payment Bank Advice Report"
          data={filteredData}
          columns={exportColumns}
          filename="quick-payment-bank-advice-report"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Payments"
          value={stats.totalPayments.toString()}
          subtitle="Bank processed payments"
          icon={FileText}
          variant="default"
        />
        <StatsCard
          title="Total Gross Amount"
          value={formatCurrency(stats.totalGross)}
          subtitle="Gross disbursed"
          icon={IndianRupee}
          variant="default"
        />
        <StatsCard
          title="Total TDS"
          value={formatCurrency(stats.totalTDS)}
          subtitle="Total deducted"
          icon={TrendingUp}
          variant="default"
        />
        <StatsCard
          title="Total Net Amount"
          value={formatCurrency(stats.totalNet)}
          subtitle="Net disbursed"
          icon={DollarSign}
          variant="default"
        />
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
          <CardDescription>Filter and search payment records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range & Payment Type */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Type</label>
              <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {paymentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.type_name}>
                      {type.type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Filters</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter(7)}
                >
                  7D
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter(30)}
                >
                  30D
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter(90)}
                >
                  90D
                </Button>
              </div>
            </div>
          </div>

          {/* Search Fields */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Beneficiary Name/Mobile</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search beneficiary..."
                  value={beneficiarySearch}
                  onChange={(e) => setBeneficiarySearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Vendor Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendor..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank Advice Reference</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reference..."
                  value={bankAdviceRefSearch}
                  onChange={(e) => setBankAdviceRefSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            {filteredData.length} total records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PaginationControls
            totalRecords={filteredData.length}
            recordsPerPage={recordsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onRecordsPerPageChange={setRecordsPerPage}
          />

          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No payment records found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
                    <TableHead className="text-right">TDS (%)</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead>Bank Processed</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Vendor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRecords.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateIST(new Date(payment.payment_date))}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.beneficiary_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {payment.mobile_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.payment_type_name}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.gross_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <div className="font-medium">{payment.tds_percentage}%</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(payment.tds_amount)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(payment.net_amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatFullDateTimeIST(new Date(payment.bank_processed_at))}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="font-medium truncate">{payment.bank_name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {payment.account_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {payment.vendor_name || 'N/A'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {filteredData.length > 0 && (
            <PaginationControls
              totalRecords={filteredData.length}
              recordsPerPage={recordsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onRecordsPerPageChange={setRecordsPerPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickPaymentBankAdviceReport;
