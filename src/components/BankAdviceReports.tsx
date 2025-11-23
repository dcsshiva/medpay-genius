import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReportGeneration from '@/components/ReportGeneration';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { 
  FileText, 
  Calendar,
  Filter,
  TrendingUp,
  Users,
  Download,
  Eye,
  Building2,
  DollarSign,
  CheckSquare
} from 'lucide-react';
import { formatDateTimeIST, formatDateIST } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/currency';
import { Checkbox } from '@/components/ui/checkbox';

interface BankAdviceHistory {
  id: string;
  filename: string;
  generation_date: string;
  payment_count: number;
  total_amount: number;
  payment_ids: string[];
  generated_by: string;
  file_content: string;
  created_at: string;
  generator_name?: string;
  payment_source: 'doctor' | 'quick_payment' | 'staff_payment';
  bank_processed: boolean;
  bank_processed_at?: string;
  bank_processed_by?: string;
}

const BankAdviceReports = () => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<BankAdviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<BankAdviceHistory | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    doctorSearch: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'all'>(20);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.dateFrom, filters.dateTo, filters.doctorSearch]);

  // Quick date filters
  const setQuickFilter = (days: number) => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - days);
    
    setFilters({
      ...filters,
      dateFrom: from.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0]
    });
  };

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'manager') {
      fetchBankAdviceHistory();
    }
  }, [userRole, filters]);

  const fetchBankAdviceHistory = async () => {
    if (userRole !== 'admin' && userRole !== 'manager') return;

    try {
      // Fetch from bank_advice_history (doctor payments)
      let doctorQuery = supabase
        .from('bank_advice_history')
        .select('*, bank_processed, bank_processed_at, bank_processed_by')
        .order('created_at', { ascending: false });

      // Apply date filters
      if (filters.dateFrom) {
        doctorQuery = doctorQuery.gte('generation_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        doctorQuery = doctorQuery.lte('generation_date', filters.dateTo);
      }

      // Fetch from quick_payment_bank_advice_history (quick payments)
      let quickQuery = supabase
        .from('quick_payment_bank_advice_history')
        .select('*, bank_processed, bank_processed_at, bank_processed_by')
        .order('created_at', { ascending: false });

      // Apply same date filters
      if (filters.dateFrom) {
        quickQuery = quickQuery.gte('generation_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        quickQuery = quickQuery.lte('generation_date', filters.dateTo);
      }

      // Fetch from staff_payment_bank_advice_history (staff payments)
      let staffQuery = supabase
        .from('staff_payment_bank_advice_history')
        .select('*, bank_processed, bank_processed_at, bank_processed_by')
        .order('created_at', { ascending: false });

      // Apply same date filters
      if (filters.dateFrom) {
        staffQuery = staffQuery.gte('generation_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        staffQuery = staffQuery.lte('generation_date', filters.dateTo);
      }

      const [doctorResult, quickResult, staffResult] = await Promise.all([
        doctorQuery,
        quickQuery,
        staffQuery
      ]);

      if (doctorResult.error) throw doctorResult.error;
      if (quickResult.error) throw quickResult.error;
      if (staffResult.error) throw staffResult.error;

      // Map doctor payments with payment_source
      const doctorRecords = (doctorResult.data || []).map((record: any) => ({
        ...record,
        payment_source: 'doctor' as const,
        payment_ids: record.payment_ids || []
      }));

      // Map quick payments with payment_source and normalize field names
      const quickRecords = (quickResult.data || []).map((record: any) => ({
        ...record,
        payment_source: 'quick_payment' as const,
        total_amount: record.total_net_amount || 0,
        payment_ids: record.payment_ids || []
      }));

      // Map staff payments with payment_source
      const staffRecords = (staffResult.data || []).map((record: any) => ({
        ...record,
        payment_source: 'staff_payment' as const,
        payment_ids: record.payment_ids || []
      }));

      // Merge and sort by created_at
      const allRecords = [...doctorRecords, ...quickRecords, ...staffRecords].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Fetch generator names for all records
      const recordsWithGenerators = await Promise.all(
        allRecords.map(async (record: any) => {
          let generatorName = 'Unknown';
          
          if (record.generated_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', record.generated_by)
              .single();
            
            if (profile) generatorName = profile.full_name;
          }

          return {
            ...record,
            generator_name: generatorName
          };
        })
      );

      setRecords(recordsWithGenerators);
    } catch (error) {
      console.error('Error fetching bank advice history:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch bank advice history"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (record: BankAdviceHistory) => {
    if (!record.file_content) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "File content not available"
      });
      return;
    }

    const blob = new Blob([record.file_content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = record.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: `Downloaded ${record.filename}`
    });
  };

  const handleBankProcessedToggle = async (record: BankAdviceHistory, checked: boolean) => {
    try {
      const table = record.payment_source === 'doctor' 
        ? 'bank_advice_history' 
        : record.payment_source === 'quick_payment' 
        ? 'quick_payment_bank_advice_history' 
        : 'staff_payment_bank_advice_history';

      const { error } = await supabase
        .from(table)
        .update({
          bank_processed: checked,
          bank_processed_at: checked ? new Date().toISOString() : null,
          bank_processed_by: checked ? user?.id : null
        })
        .eq('id', record.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: checked 
          ? "Payment marked as processed in bank" 
          : "Payment marked as not processed"
      });

      // Refresh the data
      fetchBankAdviceHistory();
    } catch (error) {
      console.error('Error updating bank processed status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update payment status"
      });
    }
  };

  const handleRegenerate = async (record: BankAdviceHistory) => {
    try {
      // Fetch latest bank details from doctors table
      if (record.payment_source === 'doctor') {
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            id,
            net_amount,
            doctors (
              full_name,
              bank_account_number,
              ifsc_code,
              bank_name,
              account_holder_name
            )
          `)
          .in('id', record.payment_ids);

        if (!payments || payments.length === 0) {
          throw new Error('No payment records found');
        }

        // Rebuild GEFU format with latest bank details
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);

        let gefuContent = `H~${dd}/${mm}/20${yy}~WESTMED\n`;
        
        let totalNetAmount = 0;
        payments.forEach((payment: any, index: number) => {
          const doctor = payment.doctors;
          const seq = String(index + 1).padStart(6, '0');
          const netAmount = Number(payment.net_amount).toFixed(2);
          totalNetAmount += Number(payment.net_amount);

          gefuContent += `D~N06~HOSPITAL_ACCOUNT~HOSPITAL_NAME~ADDRESS1~ADDRESS2~ADDRESS3~${doctor.ifsc_code}~${doctor.bank_account_number}~${doctor.account_holder_name}~~~~~${seq}~${dd}/${mm}/20${yy}~${netAmount}~${seq}~~~~\n`;
        });

        gefuContent += `F~${payments.length}~${totalNetAmount.toFixed(2)}\n`;

        // Download regenerated file
        const blob = new Blob([gefuContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = record.filename.replace('.txt', '-updated.txt');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Bank advice regenerated with latest bank details"
        });
      } else if (record.payment_source === 'quick_payment') {
        // For quick payments
        const { data: payments } = await supabase
          .from('quick_payments')
          .select('*')
          .in('id', record.payment_ids);

        if (!payments || payments.length === 0) {
          throw new Error('No payment records found');
        }

        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);

        let gefuContent = `H~${dd}/${mm}/20${yy}~WESTMED\n`;
        
        let totalNetAmount = 0;
        payments.forEach((payment: any, index: number) => {
          const seq = String(index + 1).padStart(6, '0');
          const netAmount = Number(payment.net_amount).toFixed(2);
          totalNetAmount += Number(payment.net_amount);

          gefuContent += `D~N06~HOSPITAL_ACCOUNT~HOSPITAL_NAME~ADDRESS1~ADDRESS2~ADDRESS3~${payment.ifsc_code}~${payment.account_number}~${payment.account_holder_name}~~~~~${seq}~${dd}/${mm}/20${yy}~${netAmount}~${seq}~~~~\n`;
        });

        gefuContent += `F~${payments.length}~${totalNetAmount.toFixed(2)}\n`;

        const blob = new Blob([gefuContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = record.filename.replace('.txt', '-updated.txt');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Bank advice regenerated with latest bank details"
        });
      } else if (record.payment_source === 'staff_payment') {
        // Helper to sanitize GEFU fields
        const sanitizeGEFUField = (val: unknown): string => {
          return String(val ?? '')
            .replace(/[\r\n]+/g, ' ')
            .replace(/~/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
        };

        // Fetch website settings for hospital details
        const { data: websiteSettings } = await supabase
          .from('website_settings')
          .select('*')
          .eq('is_active', true)
          .single();

        // For staff payments
        const { data: payments } = await supabase
          .from('staff_payments')
          .select('*')
          .in('id', record.payment_ids);

        if (!payments || payments.length === 0) {
          throw new Error('No payment records found');
        }

        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const dateStr = `${dd}/${mm}/${yyyy}`;

        const hospAcc = sanitizeGEFUField(websiteSettings?.hospital_bank_account_number || '120000794291');
        const hospName = sanitizeGEFUField(websiteSettings?.hospital_bank_account_holder_name || 'WESTMED HEALTHCARE PRIVATE LIMITED');
        const hospCode = sanitizeGEFUField(websiteSettings?.hospital_institution_code || 'ABC07112007');

        let gefuContent = `H~${dateStr}~${hospCode}\n`;
        
        let totalAmount = 0;
        payments.forEach((payment: any, index: number) => {
          const amount = Number(payment.amount);
          totalAmount += amount;

          const detailLine = [
            'D',
            'N06',
            hospAcc,
            hospName,
            sanitizeGEFUField('ADDRESS1'),
            sanitizeGEFUField('ADDRESS2'),
            sanitizeGEFUField('ADDRESS3'),
            sanitizeGEFUField(payment.ifsc_code),
            sanitizeGEFUField(payment.account_number),
            sanitizeGEFUField(payment.account_holder_name),
            '', '', '', '',  // Four empty fields
            (index + 1).toString(),
            dateStr,
            amount.toFixed(2),
            (index + 1).toString(),
            '', '', '', ''  // Four empty fields at the end
          ].join('~');
          
          gefuContent += detailLine + '\n';
        });

        gefuContent += `F~${payments.length}~${totalAmount.toFixed(2)}`;

        const blob = new Blob([gefuContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = record.filename.replace('.txt', '-updated.txt');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Bank advice regenerated with latest bank details"
        });
      }
    } catch (error) {
      console.error('Error regenerating bank advice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to regenerate bank advice"
      });
    }
  };

  const filteredRecords = records.filter(record => {
    // Apply filename search filter
    if (filters.doctorSearch) {
      const searchTerm = filters.doctorSearch.toLowerCase();
      const matchesFilename = record.filename.toLowerCase().includes(searchTerm);
      if (!matchesFilename) {
        return false;
      }
    }
    return true;
  });

  // Calculate pagination
  const indexOfLastRecord = recordsPerPage === 'all' 
    ? filteredRecords.length 
    : currentPage * recordsPerPage;
  const indexOfFirstRecord = recordsPerPage === 'all' 
    ? 0 
    : indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  // Calculate statistics
  const totalGenerated = filteredRecords.length;
  const totalAmount = filteredRecords.reduce((sum, r) => sum + r.total_amount, 0);
  const totalPayments = filteredRecords.reduce((sum, r) => sum + r.payment_count, 0);
  
  // This month count
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthRecords = filteredRecords.filter(r => 
    new Date(r.created_at) >= thisMonthStart
  );

  if (userRole !== 'admin' && userRole !== 'manager') {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              Only administrators and managers can view bank advice reports.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Bank Advice History</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bank Advice History</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            View and analyze all generated bank advice files
          </p>
        </div>
        
        <ReportGeneration
          title="Bank Advice History Report"
          data={filteredRecords}
          columns={[
            { key: 'filename', label: 'Filename' },
            { key: 'generation_date', label: 'Generation Date', format: (value: string) => formatDateIST(value) },
            { key: 'created_at', label: 'Generated At', format: (value: string) => formatDateTimeIST(value) },
            { key: 'payment_count', label: 'Payment Count' },
            { key: 'total_amount', label: 'Total Amount', format: (value: number) => formatCurrency(value) },
            { key: 'generator_name', label: 'Generated By' }
          ]}
          filename="bank_advice_history_report"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Files</p>
                <p className="text-lg md:text-2xl font-bold">{totalGenerated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-lg md:text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Payments</p>
                <p className="text-lg md:text-2xl font-bold">{totalPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-lg md:text-2xl font-bold">{thisMonthRecords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Filter className="h-4 w-4 md:h-5 md:w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctorSearch" className="text-xs md:text-sm">Search Filename</Label>
                <Input
                  id="doctorSearch"
                  type="text"
                  placeholder="Search by filename..."
                  value={filters.doctorSearch}
                  onChange={(e) => setFilters({ ...filters, doctorSearch: e.target.value })}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-xs md:text-sm">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-xs md:text-sm">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
            
            {/* Quick Filters */}
            <div className="space-y-2">
              <Label className="text-xs md:text-sm text-muted-foreground">Quick Filters:</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuickFilter(0)} className="text-xs">
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickFilter(7)} className="text-xs">
                  Last 7 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickFilter(30)} className="text-xs">
                  Last 30 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickFilter(90)} className="text-xs">
                  Last 3 Months
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setFilters({ dateFrom: '', dateTo: '', doctorSearch: '' })}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Advice Records ({filteredRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length > 0 && (
            <PaginationControls
              totalRecords={filteredRecords.length}
              recordsPerPage={recordsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onRecordsPerPageChange={setRecordsPerPage}
              className="mb-4"
            />
          )}
          
          <div className="space-y-3">
            {currentRecords.map((record, index) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 md:p-4">
                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {recordsPerPage === 'all' ? index + 1 : indexOfFirstRecord + index + 1}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{record.filename}</p>
                          <Badge variant="outline">{record.payment_count} payments</Badge>
                          <Badge variant={
                            record.payment_source === 'doctor' ? 'default' : 
                            record.payment_source === 'quick_payment' ? 'secondary' : 
                            'outline'
                          }>
                            {record.payment_source === 'doctor' ? 'Doctor Payments' : 
                             record.payment_source === 'quick_payment' ? 'Quick Payments' : 
                             'Staff Payments'}
                          </Badge>
                          {record.bank_processed && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckSquare className="h-3 w-3 mr-1" />
                              Bank Processed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Generated: {formatDateTimeIST(record.created_at)}
                          </span>
                          <span>by {record.generator_name}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(record.total_amount)}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 p-2 border rounded-md bg-muted/30">
                          <Checkbox
                            id={`processed-${record.id}`}
                            checked={record.bank_processed}
                            onCheckedChange={(checked) => handleBankProcessedToggle(record, checked as boolean)}
                          />
                          <label
                            htmlFor={`processed-${record.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            Bank Processed
                          </label>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(record)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate(record)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Regenerate
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record);
                            setDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="flex md:hidden flex-col space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          #{recordsPerPage === 'all' ? index + 1 : indexOfFirstRecord + index + 1}
                        </Badge>
                        <p className="font-semibold text-sm">{record.filename}</p>
                      </div>
                      {record.bank_processed && (
                        <Badge variant="default" className="bg-green-600 text-xs">
                          <CheckSquare className="h-3 w-3 mr-1" />
                          Processed
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">{record.payment_count} payments</Badge>
                      <Badge variant={
                        record.payment_source === 'doctor' ? 'default' : 
                        record.payment_source === 'quick_payment' ? 'secondary' : 
                        'outline'
                      } className="text-xs">
                        {record.payment_source === 'doctor' ? 'Doctor' : 
                         record.payment_source === 'quick_payment' ? 'Quick' : 
                         'Staff'}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTimeIST(record.created_at)}
                      </div>
                      <div>by {record.generator_name}</div>
                    </div>
                    
                    <div className="py-2 px-3 bg-primary/5 rounded-md">
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(record.total_amount)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                      <Checkbox
                        id={`processed-mobile-${record.id}`}
                        checked={record.bank_processed}
                        onCheckedChange={(checked) => handleBankProcessedToggle(record, checked as boolean)}
                      />
                      <label
                        htmlFor={`processed-mobile-${record.id}`}
                        className="text-xs font-medium leading-none cursor-pointer"
                      >
                        Mark as Bank Processed
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(record)}
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerate(record)}
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Regenerate
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRecord(record);
                          setDetailsDialog(true);
                        }}
                        className="text-xs col-span-2"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRecords.length > 0 && (
            <PaginationControls
              totalRecords={filteredRecords.length}
              recordsPerPage={recordsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onRecordsPerPageChange={setRecordsPerPage}
              className="mt-4"
            />
          )}

          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Records Found</h3>
              <p className="text-muted-foreground">
                No bank advice records match your current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bank Advice Details</DialogTitle>
          </DialogHeader>
          
            {selectedRecord && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Filename</Label>
                    <p className="font-medium">{selectedRecord.filename}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Count</Label>
                    <p className="font-medium">{selectedRecord.payment_count}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Amount</Label>
                    <p className="font-medium text-primary">{formatCurrency(selectedRecord.total_amount)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Generation Date</Label>
                    <p className="font-medium">{formatDateIST(selectedRecord.generation_date)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Generated At</Label>
                    <p className="font-medium">{formatDateTimeIST(selectedRecord.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Generated By</Label>
                    <p className="font-medium">{selectedRecord.generator_name || 'Unknown'}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground mb-2 block">Payment IDs Included</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecord.payment_ids.map((id: string) => (
                      <Badge key={id} variant="secondary" className="font-mono text-xs">
                        {id.slice(0, 8)}...
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedRecord.payment_ids.length} payment(s) included in this file
                  </p>
                </div>
              </div>
            )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog(false)}>
              Close
            </Button>
            <Button onClick={() => selectedRecord && handleDownload(selectedRecord)}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankAdviceReports;
