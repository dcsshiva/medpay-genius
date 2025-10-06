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
import { 
  FileText, 
  Calendar,
  Filter,
  TrendingUp,
  Users,
  Download,
  Eye,
  Building2,
  DollarSign
} from 'lucide-react';
import { formatDateTimeIST, formatDateIST } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/currency';

interface BankAdviceHistory {
  id: string;
  doctor_id: string;
  doctor_code: string;
  doctor_name: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  paid_amount: number;
  bank_advice_generated_at: string;
  bank_advice_generated_by: string;
  generator_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  bank_name: string;
  total_visits: number;
}

const BankAdviceReports = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<BankAdviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<BankAdviceHistory | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    doctorSearch: '',
    generatedBy: 'all'
  });

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
      let query = supabase
        .from('payments')
        .select(`
          *,
          doctors (
            doctor_code,
            full_name,
            bank_account_number,
            ifsc_code,
            account_holder_name,
            bank_name
          )
        `)
        .eq('bank_advice_generated', true)
        .order('bank_advice_generated_at', { ascending: false });

      // Apply date filters
      if (filters.dateFrom) {
        query = query.gte('bank_advice_generated_at', filters.dateFrom + 'T00:00:00');
      }
      if (filters.dateTo) {
        query = query.lte('bank_advice_generated_at', filters.dateTo + 'T23:59:59');
      }

      const { data: payments, error } = await query;

      if (error) throw error;

      // Fetch generator names for each payment
      const recordsWithGenerators = await Promise.all(
        (payments || []).map(async (payment: any) => {
          let generatorName = 'Unknown';
          
          if (payment.bank_advice_generated_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', payment.bank_advice_generated_by)
              .single();
            
            if (profile) generatorName = profile.full_name;
          }

          return {
            id: payment.id,
            doctor_id: payment.doctor_id,
            doctor_code: payment.doctors?.doctor_code || 'N/A',
            doctor_name: payment.doctors?.full_name || 'Unknown Doctor',
            period_start: payment.period_start,
            period_end: payment.period_end,
            total_amount: payment.total_amount,
            paid_amount: payment.paid_amount,
            bank_advice_generated_at: payment.bank_advice_generated_at,
            bank_advice_generated_by: payment.bank_advice_generated_by,
            generator_name: generatorName,
            account_number: payment.doctors?.bank_account_number || 'N/A',
            ifsc_code: payment.doctors?.ifsc_code || 'N/A',
            account_holder_name: payment.doctors?.account_holder_name || 'N/A',
            bank_name: payment.doctors?.bank_name || 'N/A',
            total_visits: payment.total_visits
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

  const filteredRecords = records.filter(record => {
    // Apply doctor search filter
    if (filters.doctorSearch) {
      const searchTerm = filters.doctorSearch.toLowerCase();
      const matchesName = record.doctor_name.toLowerCase().includes(searchTerm);
      const matchesCode = record.doctor_code.toLowerCase().includes(searchTerm);
      if (!matchesName && !matchesCode) {
        return false;
      }
    }
    return true;
  });

  // Calculate statistics
  const totalGenerated = filteredRecords.length;
  const totalAmount = filteredRecords.reduce((sum, r) => sum + r.total_amount, 0);
  const uniqueDoctors = new Set(filteredRecords.map(r => r.doctor_id)).size;
  
  // This month count
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthRecords = filteredRecords.filter(r => 
    new Date(r.bank_advice_generated_at) >= thisMonthStart
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bank Advice History</h1>
          <p className="text-muted-foreground">
            View and analyze all generated bank advice files
          </p>
        </div>
        
        <ReportGeneration
          title="Bank Advice History Report"
          data={filteredRecords}
          columns={[
            { key: 'bank_advice_generated_at', label: 'Generated Date & Time', format: (value: string) => formatDateTimeIST(value) },
            { key: 'doctor_name', label: 'Doctor Name' },
            { key: 'doctor_code', label: 'Doctor Code' },
            { key: 'period_start', label: 'Period Start', format: (value: string) => formatDateIST(value) },
            { key: 'period_end', label: 'Period End', format: (value: string) => formatDateIST(value) },
            { key: 'total_visits', label: 'Total Visits' },
            { key: 'account_holder_name', label: 'Account Holder' },
            { key: 'account_number', label: 'Account Number' },
            { key: 'ifsc_code', label: 'IFSC Code' },
            { key: 'bank_name', label: 'Bank Name' },
            { key: 'total_amount', label: 'Total Amount', format: (value: number) => formatCurrency(value) },
            { key: 'paid_amount', label: 'Paid Amount', format: (value: number) => formatCurrency(value) },
            { key: 'generator_name', label: 'Generated By' }
          ]}
          filename="bank_advice_history_report"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Files Generated</p>
                <p className="text-2xl font-bold">{totalGenerated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Amount Processed</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Doctors</p>
                <p className="text-2xl font-bold">{uniqueDoctors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{thisMonthRecords.length}</p>
              </div>
            </div>
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
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctorSearch">Search Doctor</Label>
                <Input
                  id="doctorSearch"
                  type="text"
                  placeholder="Search by name or code..."
                  value={filters.doctorSearch}
                  onChange={(e) => setFilters({ ...filters, doctorSearch: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>
            
            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Quick Filters:</Label>
              <Button variant="outline" size="sm" onClick={() => setQuickFilter(0)}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickFilter(7)}>
                Last 7 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickFilter(30)}>
                Last 30 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickFilter(90)}>
                Last 3 Months
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters({ dateFrom: '', dateTo: '', doctorSearch: '', generatedBy: 'all' })}
              >
                Clear All
              </Button>
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
          <div className="space-y-3">
            {filteredRecords.map((record, index) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{record.doctor_name}</p>
                          <Badge variant="outline">{record.doctor_code}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateIST(record.period_start)} - {formatDateIST(record.period_end)}
                          </span>
                          <span>{record.total_visits} visits</span>
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
                      
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Generated</p>
                        <p className="text-sm font-medium">
                          {formatDateTimeIST(record.bank_advice_generated_at)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {record.generator_name}
                        </p>
                      </div>
                      
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
                </CardContent>
              </Card>
            ))}
          </div>

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
                  <Label className="text-muted-foreground">Doctor Name</Label>
                  <p className="font-medium">{selectedRecord.doctor_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Doctor Code</Label>
                  <p className="font-medium">{selectedRecord.doctor_code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Period</Label>
                  <p className="font-medium">
                    {formatDateIST(selectedRecord.period_start)} - {formatDateIST(selectedRecord.period_end)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Visits</Label>
                  <p className="font-medium">{selectedRecord.total_visits}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Amount</Label>
                  <p className="font-medium text-primary">{formatCurrency(selectedRecord.total_amount)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Paid Amount</Label>
                  <p className="font-medium text-green-600">{formatCurrency(selectedRecord.paid_amount)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Bank Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Account Holder</Label>
                    <p className="font-medium">{selectedRecord.account_holder_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Account Number</Label>
                    <p className="font-medium">{selectedRecord.account_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">IFSC Code</Label>
                    <p className="font-medium">{selectedRecord.ifsc_code}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Bank Name</Label>
                    <p className="font-medium">{selectedRecord.bank_name}</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Generation Info</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Generated At</Label>
                    <p className="font-medium">{formatDateTimeIST(selectedRecord.bank_advice_generated_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Generated By</Label>
                    <p className="font-medium">{selectedRecord.generator_name}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankAdviceReports;
