import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, FileText, MoreVertical, RefreshCw, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDateTimeIST } from '@/lib/dateUtils';
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

interface StaffPayment {
  id: string;
  staff_id: string;
  payment_date: string;
  amount: number;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  account_holder_name: string | null;
  payment_notes: string | null;
  bank_advice_generated: boolean;
  bank_advice_reference: string | null;
  bank_advice_generated_at: string | null;
  created_at: string;
  staff: {
    staff_code: string;
    full_name: string;
    bank_account_number: string | null;
    ifsc_code: string | null;
    bank_name: string | null;
    account_holder_name: string | null;
  } | null;
}

interface BankDetailsComparison {
  staff_name: string;
  staff_code: string;
  original_ifsc: string;
  latest_ifsc: string;
  original_account: string;
  latest_account: string;
  original_bank: string;
  latest_bank: string;
  has_changes: boolean;
}

export const StaffPaymentHistoryTab = () => {
  const { data: websiteSettings } = useWebsiteSettings();
  const [payments, setPayments] = useState<StaffPayment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'generated'>('all');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [comparisonDialog, setComparisonDialog] = useState(false);
  const [comparison, setComparison] = useState<BankDetailsComparison[]>([]);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<StaffPayment | null>(null);

  useEffect(() => {
    fetchStaffPaymentHistory();
  }, []);

  const fetchStaffPaymentHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff_payments')
        .select(`
          *,
          staff:staff_id (
            staff_code,
            full_name,
            bank_account_number,
            ifsc_code,
            bank_name,
            account_holder_name
          )
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch staff payment history');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPayments = () => {
    let filtered = payments;

    // Status filter
    if (statusFilter === 'pending') {
      filtered = filtered.filter(p => !p.bank_advice_generated);
    } else if (statusFilter === 'generated') {
      filtered = filtered.filter(p => p.bank_advice_generated);
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      const today = now.toISOString().split('T')[0];
      filtered = filtered.filter(p => p.payment_date === today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(p => new Date(p.payment_date) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(p => new Date(p.payment_date) >= monthAgo);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.staff?.staff_code.toLowerCase().includes(term) ||
        p.staff?.full_name.toLowerCase().includes(term) ||
        (p.bank_advice_reference && p.bank_advice_reference.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const filteredPayments = getFilteredPayments();

  const handleDownloadBankAdvice = async (payment: StaffPayment) => {
    if (!payment.bank_advice_reference) {
      toast.error('No bank advice reference found');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('staff_payment_bank_advice_history')
        .select('file_content, filename')
        .eq('filename', payment.bank_advice_reference)
        .single();

      if (error) throw error;

      if (!data?.file_content) {
        toast.error('Bank advice file content not found');
        return;
      }

      const blob = new Blob([data.file_content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Bank advice downloaded successfully');
    } catch (error: any) {
      toast.error('Failed to download bank advice');
      console.error('Error:', error);
    }
  };

  const handleRegenerate = async (payment: StaffPayment) => {
    setRegenerating(payment.id);
    
    try {
      // Fetch the original bank advice history to get all payments in that batch
      const { data: historyData, error: historyError } = await supabase
        .from('staff_payment_bank_advice_history')
        .select('file_content, filename, payment_ids')
        .eq('filename', payment.bank_advice_reference)
        .single();

      if (historyError) throw historyError;

      // Get all payment IDs from the batch
      const paymentIds = (historyData.payment_ids || []) as string[];
      
      // Fetch all payments from this batch with latest staff details
      const { data: batchPayments, error: batchError } = await supabase
        .from('staff_payments')
        .select(`
          *,
          staff:staff_id (
            staff_code,
            full_name,
            bank_account_number,
            ifsc_code,
            bank_name,
            account_holder_name
          )
        `)
        .in('id', paymentIds)
        .order('created_at');

      if (batchError) throw batchError;

      // Build comparison for all payments
      const comparisons: BankDetailsComparison[] = [];
      const lines = historyData.file_content.split('\n');
      const detailLines = lines.filter(line => line.startsWith('D~'));

      batchPayments?.forEach((bp, index) => {
        const originalLine = detailLines[index];
        let originalIfsc = '';
        let originalAccount = '';
        let originalBank = bp.bank_name || '';
        
        if (originalLine) {
          const parts = originalLine.split('~');
          originalIfsc = parts[7] || '';
          originalAccount = parts[8] || '';
        }

        comparisons.push({
          staff_name: bp.staff?.full_name || '',
          staff_code: bp.staff?.staff_code || '',
          original_ifsc: originalIfsc,
          latest_ifsc: bp.staff?.ifsc_code || '',
          original_account: originalAccount,
          latest_account: bp.staff?.bank_account_number || '',
          original_bank: originalBank,
          latest_bank: bp.staff?.bank_name || '',
          has_changes: (originalIfsc !== bp.staff?.ifsc_code) || 
                       (originalAccount !== bp.staff?.bank_account_number) ||
                       (originalBank !== bp.staff?.bank_name),
        });
      });

      setComparison(comparisons);
      setComparisonDialog(true);

      // Regenerate GEFU file with ALL payments in correct format
      const dateStr = format(new Date(payment.payment_date), 'dd/MM/yyyy');
      let gefuContent = `H~${dateStr}~${websiteSettings?.hospital_institution_code || 'ABC07112007'}\n`;

      let totalAmount = 0;

      batchPayments?.forEach((bp, index) => {
        totalAmount += bp.amount;
        
        const detailLine = [
          'D',
          'N06',
          websiteSettings?.hospital_bank_account_number || '120000794291',
          websiteSettings?.hospital_bank_account_holder_name || 'WESTMED HEALTHCARE PRIVATE LIMITED',
          'ADDRESS1',
          'ADDRESS2',
          'ADDRESS3',
          bp.staff?.ifsc_code || '',
          bp.staff?.bank_account_number || '',
          bp.staff?.account_holder_name || bp.staff?.full_name || '',
          '', '', '', '',
          (index + 1).toString(),
          dateStr,
          bp.amount.toFixed(2),
          (index + 1).toString(),
          '', '', '', ''
        ].join('~');
        
        gefuContent += detailLine + '\n';
      });

      gefuContent += `F~${batchPayments?.length || 0}~${totalAmount.toFixed(2)}`;

      // Download regenerated file
      const blob = new Blob([gefuContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = historyData.filename.replace('.txt', '-updated.txt');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Bank advice regenerated with latest details for all payments in batch');
    } catch (error: any) {
      toast.error('Failed to regenerate bank advice');
      console.error('Error:', error);
    } finally {
      setRegenerating(null);
    }
  };

  const handleViewDetails = (payment: StaffPayment) => {
    setSelectedPaymentDetails(payment);
    setDetailsDialog(true);
  };

  const handleExportToExcel = () => {
    if (filteredPayments.length === 0) {
      toast.error('No payments to export');
      return;
    }

    const exportData = filteredPayments.map(p => ({
      'Payment Date': p.payment_date,
      'Staff Code': p.staff?.staff_code || '',
      'Staff Name': p.staff?.full_name || '',
      'Amount': p.amount,
      'Bank Name': p.bank_name || '',
      'Account Number': p.account_number || '',
      'IFSC Code': p.ifsc_code || '',
      'Branch': p.branch_name || '',
      'Account Holder': p.account_holder_name || '',
      'Status': p.bank_advice_generated ? 'Generated' : 'Pending',
      'Bank Advice Ref': p.bank_advice_reference || '',
      'Created At': formatDateTimeIST(p.created_at),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Payments');
    XLSX.writeFile(wb, `staff-payments-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('Staff payments exported to Excel');
  };

  const stats = {
    total: filteredPayments.length,
    totalAmount: filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    pending: filteredPayments.filter(p => !p.bank_advice_generated).length,
    generated: filteredPayments.filter(p => p.bank_advice_generated).length,
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Payments</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Generated</p>
          <p className="text-2xl font-bold text-green-600">{stats.generated}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="flex-1">
          <Label>Search</Label>
          <Input
            placeholder="Search by staff code, name, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-[180px]">
          <Label>Date Range</Label>
          <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-[180px]">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="generated">Generated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExportToExcel} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment Date</TableHead>
              <TableHead>Staff Code</TableHead>
              <TableHead>Staff Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Bank Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bank Advice Ref</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No staff payments found
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.payment_date}</TableCell>
                  <TableCell className="font-medium">{payment.staff?.staff_code || 'N/A'}</TableCell>
                  <TableCell>{payment.staff?.full_name || 'N/A'}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{payment.bank_name}</div>
                      <div className="text-muted-foreground">{payment.account_number}</div>
                      <div className="text-muted-foreground">{payment.ifsc_code}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.bank_advice_generated ? "default" : "secondary"}>
                      {payment.bank_advice_generated ? 'Generated' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payment.bank_advice_reference || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.bank_advice_generated && payment.bank_advice_reference && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownloadBankAdvice(payment)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleRegenerate(payment)}
                            disabled={regenerating === payment.id}
                          >
                            <RefreshCw className={`mr-2 h-4 w-4 ${regenerating === payment.id ? 'animate-spin' : ''}`} />
                            Regenerate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(payment)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bank Details Comparison Dialog */}
      <Dialog open={comparisonDialog} onOpenChange={setComparisonDialog}>
        <DialogContent className="max-w-3xl max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Bank Details Comparison - Original vs Latest</DialogTitle>
            <DialogDescription>
              Comparing bank details from original payment record with current staff bank details
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 p-4">
              {comparison.map((comp, idx) => (
                <Card key={idx} className={comp.has_changes ? 'border-orange-500 border-2' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold">{comp.staff_name}</p>
                        <p className="text-sm text-muted-foreground">{comp.staff_code}</p>
                      </div>
                      {comp.has_changes && (
                        <Badge variant="destructive">Changed</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Original Bank</p>
                        <p className="font-mono">{comp.original_bank}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Latest Bank</p>
                        <p className={`font-mono ${comp.original_bank !== comp.latest_bank ? 'text-orange-600 font-semibold' : ''}`}>
                          {comp.latest_bank}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Original IFSC</p>
                        <p className="font-mono">{comp.original_ifsc}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Latest IFSC</p>
                        <p className={`font-mono ${comp.original_ifsc !== comp.latest_ifsc ? 'text-orange-600 font-semibold' : ''}`}>
                          {comp.latest_ifsc}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Original Account</p>
                        <p className="font-mono">{comp.original_account}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Latest Account</p>
                        <p className={`font-mono ${comp.original_account !== comp.latest_account ? 'text-orange-600 font-semibold' : ''}`}>
                          {comp.latest_account}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Staff Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPaymentDetails && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Staff Code</Label>
                    <p className="font-medium">{selectedPaymentDetails.staff?.staff_code}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Staff Name</Label>
                    <p className="font-medium">{selectedPaymentDetails.staff?.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Date</Label>
                    <p>{format(new Date(selectedPaymentDetails.payment_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-semibold text-lg">{formatCurrency(selectedPaymentDetails.amount)}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-3">Bank Details (at time of payment)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Bank Name</Label>
                      <p>{selectedPaymentDetails.bank_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Account Holder</Label>
                      <p>{selectedPaymentDetails.account_holder_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Account Number</Label>
                      <p className="font-mono">{selectedPaymentDetails.account_number || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">IFSC Code</Label>
                      <p className="font-mono">{selectedPaymentDetails.ifsc_code || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Branch</Label>
                      <p>{selectedPaymentDetails.branch_name || '-'}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-3">Bank Advice Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div>
                        <Badge variant={selectedPaymentDetails.bank_advice_generated ? "default" : "secondary"}>
                          {selectedPaymentDetails.bank_advice_generated ? 'Generated' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Reference</Label>
                      <p className="font-mono text-sm">{selectedPaymentDetails.bank_advice_reference || '-'}</p>
                    </div>
                    {selectedPaymentDetails.bank_advice_generated_at && (
                      <div>
                        <Label className="text-muted-foreground">Generated At</Label>
                        <p>{format(new Date(selectedPaymentDetails.bank_advice_generated_at), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedPaymentDetails.payment_notes && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-muted-foreground">Notes</Label>
                      <p className="text-sm mt-1">{selectedPaymentDetails.payment_notes}</p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
