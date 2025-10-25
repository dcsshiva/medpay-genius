import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, Filter, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import { formatDateIST } from '@/lib/dateUtils';

interface BankAdviceRecord {
  id: string;
  beneficiary_name: string;
  beneficiary_type: string;
  beneficiary_code: string;
  payment_source: string;
  gross_amount: number;
  tds_amount: number;
  net_amount: number;
  bank_account_number: string;
  ifsc_code: string;
  bank_name: string;
  generated_at: string;
  generated_by: string;
  reference_info: any;
}

const BankAdviceReport = () => {
  const [records, setRecords] = useState<BankAdviceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BankAdviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [beneficiaryTypeFilter, setBeneficiaryTypeFilter] = useState('all');
  const [paymentSourceFilter, setPaymentSourceFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'all'>(20);

  // Summary stats
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalGrossAmount: 0,
    totalTdsAmount: 0,
    totalNetAmount: 0,
  });

  useEffect(() => {
    fetchBankAdviceRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [records, searchQuery, beneficiaryTypeFilter, paymentSourceFilter, dateFrom, dateTo]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, beneficiaryTypeFilter, paymentSourceFilter, dateFrom, dateTo]);

  const fetchBankAdviceRecords = async () => {
    try {
      setLoading(true);

      // Fetch from payments table where bank_advice_generated = true
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('bank_advice_generated', true)
        .order('bank_advice_generated_at', { ascending: false });

      if (paymentError) {
        console.error('Error fetching payments:', paymentError);
        throw new Error(`Failed to fetch payments: ${paymentError.message}`);
      }

      // Get unique doctor IDs from payments
      const doctorIds = Array.from(new Set(
        (paymentData || []).map((p: any) => p.doctor_id).filter(Boolean)
      ));

      // Fetch doctors separately
      let doctorsMap = new Map();
      if (doctorIds.length > 0) {
        const { data: doctorsData, error: doctorsError } = await supabase
          .from('doctors')
          .select('id, doctor_code, full_name, bank_account_number, ifsc_code, bank_name')
          .in('id', doctorIds);

        if (doctorsError) {
          console.error('Error fetching doctors:', doctorsError);
          toast.error('Warning: Some doctor details could not be loaded');
        } else {
          doctorsData?.forEach((doctor: any) => {
            doctorsMap.set(doctor.id, doctor);
          });
        }
      }

      // Fetch from quick_payments table where bank_advice_generated = true
      const { data: quickPaymentData, error: quickPaymentError } = await supabase
        .from('quick_payments')
        .select('*')
        .eq('bank_advice_generated', true)
        .order('bank_advice_generated_at', { ascending: false });

      if (quickPaymentError) {
        console.error('Error fetching quick payments:', quickPaymentError);
        throw new Error(`Failed to fetch quick payments: ${quickPaymentError.message}`);
      }

      // Transform payments with doctor data
      const transformedPayments: BankAdviceRecord[] = (paymentData || []).map((payment: any) => {
        const doctor = doctorsMap.get(payment.doctor_id);
        const paymentSource = payment.cash_approval_status === 'approved' ? 'cash' : 'insurance';
        
        let grossAmount: number;
        let tdsAmount: number;
        let netAmount: number;

        if (paymentSource === 'cash') {
          grossAmount = Number(payment.total_amount) || 0;
          const tdsPercentage = Number(payment.tds_percentage) || 10;
          tdsAmount = grossAmount * tdsPercentage / 100;
          netAmount = grossAmount - tdsAmount;
        } else {
          grossAmount = Number(payment.gross_amount) || 0;
          tdsAmount = Number(payment.tds_amount) || 0;
          netAmount = Number(payment.net_amount) || 0;
        }

        return {
          id: payment.id,
          beneficiary_name: doctor?.full_name || 'Unknown Doctor',
          beneficiary_type: 'doctor',
          beneficiary_code: doctor?.doctor_code || '',
          payment_source: paymentSource,
          gross_amount: grossAmount,
          tds_amount: tdsAmount,
          net_amount: netAmount,
          bank_account_number: doctor?.bank_account_number || '',
          ifsc_code: doctor?.ifsc_code || '',
          bank_name: doctor?.bank_name || '',
          generated_at: payment.bank_advice_generated_at,
          generated_by: payment.bank_advice_generated_by || '',
          reference_info: payment,
        };
      });

      // Transform quick payments
      const transformedQuickPayments: BankAdviceRecord[] = (quickPaymentData || []).map((qp: any) => ({
        id: qp.id,
        beneficiary_name: qp.name || qp.beneficiary_name || 'Unknown',
        beneficiary_type: 'vendor',
        beneficiary_code: qp.vendor_code || '',
        payment_source: 'quick_payment',
        gross_amount: Number(qp.gross_amount) || 0,
        tds_amount: Number(qp.tds_amount) || 0,
        net_amount: Number(qp.net_amount) || 0,
        bank_account_number: qp.account_number || '',
        ifsc_code: qp.ifsc_code || '',
        bank_name: qp.bank_name || '',
        generated_at: qp.bank_advice_generated_at,
        generated_by: qp.bank_advice_generated_by || '',
        reference_info: qp,
      }));

      // Combine and sort all records
      const allRecords = [...transformedPayments, ...transformedQuickPayments];
      allRecords.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());

      setRecords(allRecords);
      toast.success(`Loaded ${allRecords.length} bank advice records`);
    } catch (error: any) {
      console.error('Error fetching bank advice records:', error);
      toast.error(error.message || 'Failed to load bank advice records');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.beneficiary_name.toLowerCase().includes(query) ||
          record.beneficiary_code.toLowerCase().includes(query) ||
          record.bank_account_number.includes(query)
      );
    }

    // Beneficiary type filter
    if (beneficiaryTypeFilter !== 'all') {
      filtered = filtered.filter((record) => record.beneficiary_type === beneficiaryTypeFilter);
    }

    // Payment source filter
    if (paymentSourceFilter !== 'all') {
      filtered = filtered.filter((record) => record.payment_source === paymentSourceFilter);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(
        (record) => new Date(record.generated_at) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(
        (record) => new Date(record.generated_at) <= new Date(dateTo + 'T23:59:59')
      );
    }

    setFilteredRecords(filtered);

    // Calculate stats
    const totalGross = filtered.reduce((sum, r) => sum + r.gross_amount, 0);
    const totalTds = filtered.reduce((sum, r) => sum + r.tds_amount, 0);
    const totalNet = filtered.reduce((sum, r) => sum + r.net_amount, 0);

    setStats({
      totalRecords: filtered.length,
      totalGrossAmount: totalGross,
      totalTdsAmount: totalTds,
      totalNetAmount: totalNet,
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setBeneficiaryTypeFilter('all');
    setPaymentSourceFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const getPaymentSourceBadge = (source: string) => {
    switch (source) {
      case 'cash':
        return <Badge variant="default">Cash</Badge>;
      case 'insurance':
        return <Badge variant="secondary">Insurance</Badge>;
      case 'quick_payment':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Quick Payment</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  // Pagination calculations
  const indexOfLastRecord = recordsPerPage === 'all' 
    ? filteredRecords.length 
    : currentPage * recordsPerPage;
  const indexOfFirstRecord = recordsPerPage === 'all' 
    ? 0 
    : indexOfLastRecord - recordsPerPage;
  const currentRecords = recordsPerPage === 'all'
    ? filteredRecords
    : filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = recordsPerPage === 'all'
    ? 1
    : Math.ceil(filteredRecords.length / recordsPerPage);

  const handleRecordsPerPageChange = (value: string) => {
    if (value === 'all') {
      setRecordsPerPage('all');
    } else {
      setRecordsPerPage(parseInt(value));
    }
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bank Advice Report</h1>
          <p className="text-muted-foreground">View all generated bank advice records</p>
        </div>
        <Button variant="outline" onClick={fetchBankAdviceRecords}>
          <Search className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalGrossAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">TDS Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalTdsAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalNetAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Name, code, account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Beneficiary Type</Label>
              <Select value={beneficiaryTypeFilter} onValueChange={setBeneficiaryTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Source</Label>
              <Select value={paymentSourceFilter} onValueChange={setPaymentSourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="quick_payment">Quick Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generated Bank Advice Records
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="records-per-page" className="text-sm whitespace-nowrap">
                Records per page:
              </Label>
              <Select
                value={recordsPerPage.toString()}
                onValueChange={handleRecordsPerPageChange}
              >
                <SelectTrigger id="records-per-page" className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No records found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Generated Date</TableHead>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Gross Amount</TableHead>
                      <TableHead className="text-right">TDS</TableHead>
                      <TableHead className="text-right">Net Amount</TableHead>
                      <TableHead>Bank Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateIST(record.generated_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.beneficiary_name}</div>
                            <div className="text-xs text-muted-foreground">{record.beneficiary_code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.beneficiary_type}</Badge>
                        </TableCell>
                        <TableCell>{getPaymentSourceBadge(record.payment_source)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(record.gross_amount)}
                        </TableCell>
                        <TableCell className="text-right text-amber-600">
                          {formatCurrency(record.tds_amount)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(record.net_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            <div>{record.bank_name}</div>
                            <div className="text-muted-foreground">{record.bank_account_number}</div>
                            <div className="text-muted-foreground">{record.ifsc_code}</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {recordsPerPage !== 'all' && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredRecords.length)} of{' '}
                    {filteredRecords.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current
                          return (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          );
                        })
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(page)}
                              className="w-10"
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BankAdviceReport;
