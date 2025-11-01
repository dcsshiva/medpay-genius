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
import { Download, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDateTimeIST } from '@/lib/dateUtils';
import * as XLSX from 'xlsx';

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
  created_at: string;
  staff: {
    staff_code: string;
    full_name: string;
  } | null;
}

export const StaffPaymentHistoryTab = () => {
  const [payments, setPayments] = useState<StaffPayment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'generated'>('all');
  const [loading, setLoading] = useState(false);

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
            full_name
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
      // Fetch the bank advice history record to get file content
      const { data, error } = await supabase
        .from('staff_payment_bank_advice_history')
        .select('file_content, filename')
        .contains('payment_ids', [payment.id])
        .single();

      if (error) throw error;

      if (!data?.file_content) {
        toast.error('Bank advice file content not found');
        return;
      }

      // Download the file
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
                    {payment.bank_advice_generated && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadBankAdvice(payment)}
                        title="Download Bank Advice"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
