import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Search, Calendar, TrendingUp, IndianRupee } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDateIST, formatFullDateTimeIST } from '@/lib/dateUtils';
import ReportGeneration from './ReportGeneration';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface BankAdvicePaymentData {
  id: string;
  visit_date: string;
  doctor_name: string;
  doctor_code: string;
  patient_name: string;
  payment_type: string;
  visit_payment: number;
  tds_amount: number;
  net_amount: number;
  bank_processed_at: string;
  insurance_company_name?: string;
  payment_total_amount: number;
}

const BankAdvicePaymentReport: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<BankAdvicePaymentData[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [insuranceSearch, setInsuranceSearch] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'cash' | 'insurance'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'all'>(20);

  useEffect(() => {
    fetchReportData();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, doctorSearch, patientSearch, insuranceSearch, paymentTypeFilter]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Fetch payments with bank_advice_generated = true
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          total_amount,
          tds_amount,
          bank_advice_generated_at,
          doctor_id,
          doctors (
            doctor_code,
            full_name
          )
        `)
        .eq('bank_advice_generated', true)
        .order('bank_advice_generated_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get all payment_visits for these payments
      const paymentIds = paymentsData?.map(p => p.id) || [];
      
      if (paymentIds.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }

      const { data: paymentVisitsData, error: paymentVisitsError } = await supabase
        .from('payment_visits')
        .select(`
          payment_id,
          visit_id,
          visits (
            id,
            visit_date,
            patient_name,
            visit_payment,
            payment_type,
            insurance_company_id,
            insurance_companies (
              company_name
            )
          )
        `)
        .in('payment_id', paymentIds);

      if (paymentVisitsError) throw paymentVisitsError;

      // Transform data to flat structure with proportional TDS
      const transformedData: BankAdvicePaymentData[] = [];

      paymentVisitsData?.forEach((pv: any) => {
        const payment = paymentsData?.find(p => p.id === pv.payment_id);
        const visit = pv.visits;

        if (payment && visit) {
          // Calculate proportional TDS for this visit
          const proportionalTDS = payment.total_amount > 0
            ? (visit.visit_payment / payment.total_amount) * payment.tds_amount
            : 0;
          
          const netAmount = visit.visit_payment - proportionalTDS;

          transformedData.push({
            id: visit.id,
            visit_date: visit.visit_date,
            doctor_name: payment.doctors?.full_name || 'Unknown',
            doctor_code: payment.doctors?.doctor_code || 'N/A',
            patient_name: visit.patient_name,
            payment_type: visit.payment_type,
            visit_payment: visit.visit_payment,
            tds_amount: proportionalTDS,
            net_amount: netAmount,
            bank_processed_at: payment.bank_advice_generated_at,
            insurance_company_name: visit.insurance_companies?.company_name,
            payment_total_amount: payment.total_amount,
          });
        }
      });

      // Sort by bank processed date (newest first)
      transformedData.sort((a, b) => 
        new Date(b.bank_processed_at).getTime() - new Date(a.bank_processed_at).getTime()
      );

      setReportData(transformedData);
    } catch (error) {
      console.error('Error fetching bank advice payment report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch bank advice payment data.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on all search criteria
  const filteredData = useMemo(() => {
    return reportData.filter((record) => {
      // Date range filter
      if (startDate && record.visit_date < startDate) return false;
      if (endDate && record.visit_date > endDate) return false;

      // Doctor search (name or code)
      if (doctorSearch) {
        const searchLower = doctorSearch.toLowerCase();
        const matchesDoctor = 
          record.doctor_name.toLowerCase().includes(searchLower) ||
          record.doctor_code.toLowerCase().includes(searchLower);
        if (!matchesDoctor) return false;
      }

      // Patient search
      if (patientSearch) {
        const matchesPatient = record.patient_name
          .toLowerCase()
          .includes(patientSearch.toLowerCase());
        if (!matchesPatient) return false;
      }

      // Insurance company search
      if (insuranceSearch && record.payment_type === 'insurance') {
        const matchesInsurance = record.insurance_company_name
          ?.toLowerCase()
          .includes(insuranceSearch.toLowerCase());
        if (!matchesInsurance) return false;
      }

      // Payment type filter
      if (paymentTypeFilter !== 'all' && record.payment_type !== paymentTypeFilter) {
        return false;
      }

      return true;
    });
  }, [reportData, startDate, endDate, doctorSearch, patientSearch, insuranceSearch, paymentTypeFilter]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    return {
      totalVisits: filteredData.length,
      totalAmount: filteredData.reduce((sum, r) => sum + r.visit_payment, 0),
      totalTDS: filteredData.reduce((sum, r) => sum + r.tds_amount, 0),
      totalNet: filteredData.reduce((sum, r) => sum + r.net_amount, 0),
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

  // Quick date filters
  const setQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setDoctorSearch('');
    setPatientSearch('');
    setInsuranceSearch('');
    setPaymentTypeFilter('all');
  };

  // Prepare data for export
  const exportColumns = [
    { key: 'visit_date', label: 'Visit Date', format: (val: string) => formatDateIST(val) },
    { key: 'doctor_name', label: 'Doctor Name' },
    { key: 'doctor_code', label: 'Doctor Code' },
    { key: 'patient_name', label: 'Patient Name' },
    { key: 'payment_type', label: 'Payment Type', format: (val: string) => val === 'cash' ? 'Cash' : 'Insurance' },
    { key: 'visit_payment', label: 'Visit Payment', format: (val: number) => formatCurrency(val) },
    { key: 'tds_amount', label: 'TDS Amount', format: (val: number) => formatCurrency(val) },
    { key: 'net_amount', label: 'Net Amount', format: (val: number) => formatCurrency(val) },
    { key: 'bank_processed_at', label: 'Bank Processed Date & Time', format: (val: string) => formatFullDateTimeIST(new Date(val)) },
    { key: 'insurance_company_name', label: 'Insurance Company', format: (val: string) => val || 'N/A' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bank Advice Payment Report</h1>
          <p className="text-muted-foreground mt-1">
            Detailed visit-level report for all bank-processed payments
          </p>
        </div>
        <ReportGeneration
          title="Bank Advice Payment Report"
          data={filteredData}
          columns={exportColumns}
          filename="bank_advice_payment_report"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground">Bank processed visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">Gross disbursed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total TDS</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalTDS)}</div>
            <p className="text-xs text-muted-foreground">Total deducted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalNet)}</div>
            <p className="text-xs text-muted-foreground">Net disbursed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
          <CardDescription>
            Filter payments by date range, doctor, patient, insurance company, or payment type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Type</label>
              <Select value={paymentTypeFilter} onValueChange={(value: any) => setPaymentTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cash">Cash Only</SelectItem>
                  <SelectItem value="insurance">Insurance Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Filters</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
                  Last 7d
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
                  Last 30d
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange(90)}>
                  Last 3m
                </Button>
              </div>
            </div>
          </div>

          {/* Search Fields */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Doctor Name/Code</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctor..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Patient Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patient..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Insurance Company</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search insurance..."
                  value={insuranceSearch}
                  onChange={(e) => setInsuranceSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            {filteredData.length} total records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && filteredData.length > 0 && (
            <PaginationControls
              totalRecords={filteredData.length}
              recordsPerPage={recordsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onRecordsPerPageChange={setRecordsPerPage}
            />
          )}
          
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading data...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No records found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visit Date</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Visit Payment</TableHead>
                    <TableHead className="text-right">TDS</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead>Bank Processed</TableHead>
                    <TableHead>Insurance Co.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {formatDateIST(record.visit_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{record.doctor_name}</span>
                          <span className="text-xs text-muted-foreground">{record.doctor_code}</span>
                        </div>
                      </TableCell>
                      <TableCell>{record.patient_name}</TableCell>
                      <TableCell>
                        <Badge variant={record.payment_type === 'cash' ? 'default' : 'secondary'}>
                          {record.payment_type === 'cash' ? 'Cash' : 'Insurance'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(record.visit_payment)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(record.tds_amount)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(record.net_amount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatFullDateTimeIST(new Date(record.bank_processed_at))}
                      </TableCell>
                      <TableCell>
                        {record.insurance_company_name || 'N/A'}
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

export default BankAdvicePaymentReport;
