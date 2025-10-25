import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FileText, IndianRupee, TrendingUp, DollarSign, Download, Filter, X } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDateIST, toIST } from '@/lib/dateUtils';

interface UnifiedBankAdvicePayment {
  id: string;
  payment_source: 'cash' | 'insurance' | 'quick_payment';
  source_table: 'payments' | 'quick_payments';
  beneficiary_name: string;
  beneficiary_type: 'doctor' | 'vendor' | 'individual';
  beneficiary_code?: string;
  gross_amount: number;
  tds_amount: number;
  tds_percentage: number;
  net_amount: number;
  bank_account_number: string;
  ifsc_code: string;
  bank_name: string;
  account_holder_name: string;
  approved_at: string;
  payment_period?: string;
  payment_type_name?: string;
  vendor_name?: string;
  reference_info: any;
}

const BankAdviceGeneration = () => {
  const { user } = useAuth();
  const { data: websiteSettings } = useWebsiteSettings();
  const { toast } = useToast();

  const [unifiedPayments, setUnifiedPayments] = useState<UnifiedBankAdvicePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [paymentSourceFilter, setPaymentSourceFilter] = useState<'all' | 'cash' | 'insurance' | 'quick_payment'>('all');
  const [beneficiaryTypeFilter, setBeneficiaryTypeFilter] = useState<'all' | 'doctor' | 'vendor' | 'individual'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchAllPendingPayments();
  }, []);

  const fetchAllPendingPayments = async () => {
    setLoading(true);
    try {
      const unified: UnifiedBankAdvicePayment[] = [];

      // Fetch doctor payments (cash + insurance)
      const { data: doctorPayments, error: doctorError } = await supabase
        .from('payments')
        .select(`
          id,
          doctor_id,
          period_start,
          period_end,
          total_visits,
          gross_amount,
          tds_amount,
          tds_percentage,
          net_amount,
          cash_approval_status,
          insurance_approval_status,
          cash_approved_at,
          insurance_approved_at,
          created_at,
          doctors (
            doctor_code,
            full_name,
            bank_account_number,
            ifsc_code,
            bank_name,
            account_holder_name
          )
        `)
        .eq('bank_advice_generated', false)
        .or('cash_approval_status.eq.approved,insurance_approval_status.eq.approved')
        .order('created_at', { ascending: false });

      if (doctorError) throw doctorError;

      // Transform doctor payments
      doctorPayments?.forEach((payment: any) => {
        const doctor = payment.doctors;
        if (!doctor) return;

        // Determine payment source
        let paymentSource: 'cash' | 'insurance';
        let approvedAt: string;

        if (payment.cash_approval_status === 'approved') {
          paymentSource = 'cash';
          approvedAt = payment.cash_approved_at;
        } else {
          paymentSource = 'insurance';
          approvedAt = payment.insurance_approved_at;
        }

        unified.push({
          id: payment.id,
          payment_source: paymentSource,
          source_table: 'payments',
          beneficiary_name: doctor.full_name || 'Doctor',
          beneficiary_type: 'doctor',
          beneficiary_code: doctor.doctor_code,
          gross_amount: Number(payment.gross_amount) || 0,
          tds_amount: Number(payment.tds_amount) || 0,
          tds_percentage: Number(payment.tds_percentage) || 10,
          net_amount: Number(payment.net_amount) || 0,
          bank_account_number: doctor.bank_account_number || '',
          ifsc_code: doctor.ifsc_code || '',
          bank_name: doctor.bank_name || '',
          account_holder_name: doctor.account_holder_name || doctor.full_name || '',
          approved_at: approvedAt,
          payment_period: `${formatDateIST(payment.period_start)} to ${formatDateIST(payment.period_end)}`,
          reference_info: payment,
        });
      });

      // Fetch quick payments
      const { data: quickPayments, error: quickError } = await supabase
        .from('quick_payments')
        .select(`
          id,
          name,
          mobile_number,
          gross_amount,
          tds_amount,
          tds_percentage,
          net_amount,
          account_number,
          ifsc_code,
          bank_name,
          account_holder_name,
          created_at,
          vendor_id,
          payment_type_id,
          quick_payment_types (
            type_name
          ),
          vendor_details (
            vendor_name
          )
        `)
        .eq('bank_advice_generated', false)
        .order('created_at', { ascending: false });

      if (quickError) throw quickError;

      // Transform quick payments
      quickPayments?.forEach((payment: any) => {
        const isVendor = !!payment.vendor_id;
        const vendorName = payment.vendor_details?.vendor_name;

        unified.push({
          id: payment.id,
          payment_source: 'quick_payment',
          source_table: 'quick_payments',
          beneficiary_name: isVendor && vendorName ? vendorName : payment.name,
          beneficiary_type: isVendor ? 'vendor' : 'individual',
          beneficiary_code: undefined,
          gross_amount: Number(payment.gross_amount) || 0,
          tds_amount: Number(payment.tds_amount) || 0,
          tds_percentage: Number(payment.tds_percentage) || 0,
          net_amount: Number(payment.net_amount) || 0,
          bank_account_number: payment.account_number || '',
          ifsc_code: payment.ifsc_code || '',
          bank_name: payment.bank_name || '',
          account_holder_name: payment.account_holder_name || payment.name || '',
          approved_at: payment.created_at,
          payment_type_name: payment.quick_payment_types?.type_name,
          vendor_name: vendorName,
          reference_info: payment,
        });
      });

      setUnifiedPayments(unified);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pending payments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return unifiedPayments.filter((payment) => {
      // Payment source filter
      if (paymentSourceFilter !== 'all' && payment.payment_source !== paymentSourceFilter) {
        return false;
      }

      // Beneficiary type filter
      if (beneficiaryTypeFilter !== 'all' && payment.beneficiary_type !== beneficiaryTypeFilter) {
        return false;
      }

      // Date range filter
      if (startDate && toIST(payment.approved_at) < toIST(startDate)) {
        return false;
      }
      if (endDate && toIST(payment.approved_at) > toIST(endDate)) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          payment.beneficiary_name.toLowerCase().includes(search) ||
          payment.beneficiary_code?.toLowerCase().includes(search) ||
          payment.bank_account_number.toLowerCase().includes(search) ||
          payment.ifsc_code.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [unifiedPayments, paymentSourceFilter, beneficiaryTypeFilter, startDate, endDate, searchTerm]);

  const stats = useMemo(() => {
    return {
      totalPayments: filteredPayments.length,
      totalGross: filteredPayments.reduce((sum, p) => sum + p.gross_amount, 0),
      totalTDS: filteredPayments.reduce((sum, p) => sum + p.tds_amount, 0),
      totalNet: filteredPayments.reduce((sum, p) => sum + p.net_amount, 0),
    };
  }, [filteredPayments]);

  const selectedPayments = useMemo(() => {
    return filteredPayments.filter((p) => selectedPaymentIds.includes(p.id));
  }, [filteredPayments, selectedPaymentIds]);

  const selectedStats = useMemo(() => {
    return {
      totalPayments: selectedPayments.length,
      totalGross: selectedPayments.reduce((sum, p) => sum + p.gross_amount, 0),
      totalTDS: selectedPayments.reduce((sum, p) => sum + p.tds_amount, 0),
      totalNet: selectedPayments.reduce((sum, p) => sum + p.net_amount, 0),
    };
  }, [selectedPayments]);

  const handleSelectAll = () => {
    if (selectedPaymentIds.length === filteredPayments.length) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(filteredPayments.map((p) => p.id));
    }
  };

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPaymentIds((prev) =>
      prev.includes(paymentId)
        ? prev.filter((id) => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const clearFilters = () => {
    setPaymentSourceFilter('all');
    setBeneficiaryTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const generateBankAdvice = async () => {
    if (selectedPayments.length === 0) {
      toast({
        title: 'No Payments Selected',
        description: 'Please select at least one payment to generate bank advice',
        variant: 'destructive',
      });
      return;
    }

    if (!websiteSettings) {
      toast({
        title: 'Error',
        description: 'Website settings not loaded',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);

    try {
      // Generate filename: DDMMYY-X.txt
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yy = String(today.getFullYear()).slice(-2);
      
      // Get sequence number
      const { data: historyData, error: historyError } = await supabase
        .from('bank_advice_history')
        .select('filename')
        .ilike('filename', `${dd}${mm}${yy}-%`)
        .order('created_at', { ascending: false })
        .limit(1);

      let sequenceNumber = 1;
      if (historyData && historyData.length > 0) {
        const lastFilename = historyData[0].filename;
        const match = lastFilename.match(/-(\d+)\.txt$/);
        if (match) {
          sequenceNumber = parseInt(match[1]) + 1;
        }
      }

      const filename = `${dd}${mm}${yy}-${sequenceNumber}.txt`;

      // Build GEFU format
      const institutionCode = websiteSettings.hospital_institution_code || 'WESTMED';
      const hospitalAccount = websiteSettings.hospital_bank_account_number || '';
      const hospitalName = websiteSettings.hospital_name || 'WESTMED HOSPITAL';
      const hospitalAddress = websiteSettings.hospital_institution_address || '';
      // Parse address - use the full address or split by commas
      const addressParts = hospitalAddress.split(',').map(s => s.trim());
      const address1 = addressParts[0] || '';
      const address2 = addressParts[1] || '';
      const address3 = addressParts[2] || '';

      let gefuContent = '';
      
      // Header
      gefuContent += `H~${dd}/${mm}/20${yy}~${institutionCode}\n`;

      // Detail lines
      let totalNetAmount = 0;
      selectedPayments.forEach((payment, index) => {
        const seq = String(index + 1).padStart(6, '0');
        const netAmount = payment.net_amount.toFixed(2);
        totalNetAmount += payment.net_amount;

        gefuContent += `D~N06~${hospitalAccount}~${hospitalName}~${address1}~${address2}~${address3}~${payment.ifsc_code}~${payment.bank_account_number}~${payment.account_holder_name}~~~~~${seq}~${dd}/${mm}/20${yy}~${netAmount}~${seq}~~~~\n`;
      });

      // Footer
      gefuContent += `F~${selectedPayments.length}~${totalNetAmount.toFixed(2)}\n`;

      // Download file
      const blob = new Blob([gefuContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Update databases
      const doctorPaymentIds = selectedPayments
        .filter((p) => p.source_table === 'payments')
        .map((p) => p.id);
      
      const quickPaymentIds = selectedPayments
        .filter((p) => p.source_table === 'quick_payments')
        .map((p) => p.id);

      // Update payments table
      if (doctorPaymentIds.length > 0) {
        const { error: updatePaymentsError } = await supabase
          .from('payments')
          .update({
            bank_advice_generated: true,
            bank_advice_generated_at: new Date().toISOString(),
            bank_advice_generated_by: user?.id,
          })
          .in('id', doctorPaymentIds);

        if (updatePaymentsError) throw updatePaymentsError;

        // Record in bank_advice_history
        const { error: historyInsertError } = await supabase
          .from('bank_advice_history')
          .insert({
            filename,
            generation_date: today.toISOString().split('T')[0],
            payment_count: doctorPaymentIds.length,
            total_amount: selectedPayments
              .filter((p) => p.source_table === 'payments')
              .reduce((sum, p) => sum + p.net_amount, 0),
            payment_ids: doctorPaymentIds,
            generated_by: user?.id,
            file_content: gefuContent,
          });

        if (historyInsertError) throw historyInsertError;
      }

      // Update quick_payments table
      if (quickPaymentIds.length > 0) {
        const { error: updateQuickError } = await supabase
          .from('quick_payments')
          .update({
            bank_advice_generated: true,
            bank_advice_generated_at: new Date().toISOString(),
            bank_advice_generated_by: user?.id,
            bank_advice_reference: filename,
          })
          .in('id', quickPaymentIds);

        if (updateQuickError) throw updateQuickError;

        // Record in quick_payment_bank_advice_history
        const quickPaymentsData = selectedPayments.filter((p) => p.source_table === 'quick_payments');
        const { error: quickHistoryError } = await supabase
          .from('quick_payment_bank_advice_history')
          .insert({
            filename,
            generation_date: today.toISOString().split('T')[0],
            payment_count: quickPaymentIds.length,
            total_gross_amount: quickPaymentsData.reduce((sum, p) => sum + p.gross_amount, 0),
            total_tds_amount: quickPaymentsData.reduce((sum, p) => sum + p.tds_amount, 0),
            total_net_amount: quickPaymentsData.reduce((sum, p) => sum + p.net_amount, 0),
            payment_ids: quickPaymentIds,
            generated_by: user?.id,
            file_content: gefuContent,
          });

        if (quickHistoryError) throw quickHistoryError;
      }

      toast({
        title: 'Bank Advice Generated Successfully',
        description: `File: ${filename} | Payments: ${selectedPayments.length} | Net Amount: ${formatCurrency(totalNetAmount)}`,
      });

      // Reset selection and refresh
      setSelectedPaymentIds([]);
      fetchAllPendingPayments();
    } catch (error) {
      console.error('Error generating bank advice:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate bank advice',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const getPaymentSourceBadge = (source: string) => {
    const config = {
      cash: { label: 'Cash', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      insurance: { label: 'Insurance', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      quick_payment: { label: 'Quick Payment', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    };
    const { label, className } = config[source as keyof typeof config];
    return <Badge className={className}>{label}</Badge>;
  };

  const getBeneficiaryTypeBadge = (type: string) => {
    const config = {
      doctor: { label: 'Doctor', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      vendor: { label: 'Vendor', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
      individual: { label: 'Individual', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
    };
    const { label, className } = config[type as keyof typeof config];
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bank Advice Generation (Centralized)</h1>
          <p className="text-muted-foreground mt-1">
            Generate bank advice for all approved payments in one place
          </p>
        </div>
        <Button
          onClick={generateBankAdvice}
          disabled={selectedPayments.length === 0 || generating}
          size="lg"
        >
          <Download className="mr-2 h-5 w-5" />
          {generating ? 'Generating...' : `Generate Bank Advice (${selectedPayments.length})`}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Payments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayments}</div>
            {selectedPayments.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedPayments.length} selected
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalGross)}</div>
            {selectedPayments.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(selectedStats.totalGross)} selected
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total TDS Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalTDS)}</div>
            {selectedPayments.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(selectedStats.totalTDS)} selected
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalNet)}</div>
            {selectedPayments.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(selectedStats.totalNet)} selected
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={paymentSourceFilter} onValueChange={(value: any) => setPaymentSourceFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="quick_payment">Quick Payment</SelectItem>
              </SelectContent>
            </Select>

            <Select value={beneficiaryTypeFilter} onValueChange={(value: any) => setBeneficiaryTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Beneficiary Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              type="date"
              placeholder="To Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <Input
              placeholder="Search beneficiary, code, account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending Payments ({filteredPayments.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedPaymentIds.length === filteredPayments.length && filteredPayments.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading payments...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending payments found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">TDS</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Approved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className={selectedPaymentIds.includes(payment.id) ? 'bg-muted/50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedPaymentIds.includes(payment.id)}
                          onCheckedChange={() => handleSelectPayment(payment.id)}
                        />
                      </TableCell>
                      <TableCell>{getPaymentSourceBadge(payment.payment_source)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.beneficiary_name}</div>
                          {payment.beneficiary_code && (
                            <div className="text-xs text-muted-foreground">{payment.beneficiary_code}</div>
                          )}
                          {payment.payment_period && (
                            <div className="text-xs text-muted-foreground">{payment.payment_period}</div>
                          )}
                          {payment.payment_type_name && (
                            <div className="text-xs text-muted-foreground">{payment.payment_type_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getBeneficiaryTypeBadge(payment.beneficiary_type)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.gross_amount)}</TableCell>
                      <TableCell className="text-right">
                        {payment.tds_percentage > 0 && (
                          <div>
                            <div>{payment.tds_percentage}%</div>
                            <div className="text-xs text-muted-foreground">{formatCurrency(payment.tds_amount)}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(payment.net_amount)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{payment.ifsc_code}</div>
                          <div className="text-xs text-muted-foreground">
                            {payment.bank_account_number.slice(-4).padStart(payment.bank_account_number.length, '*')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDateIST(payment.approved_at)}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BankAdviceGeneration;
