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
  filename: string;
  generation_date: string;
  payment_count: number;
  total_amount: number;
  payment_ids: string[];
  generated_by: string;
  file_content: string;
  created_at: string;
  generator_name?: string;
  payment_source: 'doctor' | 'quick_payment';
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
    doctorSearch: ''
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
      // Fetch from bank_advice_history (doctor payments)
      let doctorQuery = supabase
        .from('bank_advice_history')
        .select('*')
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
        .select('*')
        .order('created_at', { ascending: false });

      // Apply same date filters
      if (filters.dateFrom) {
        quickQuery = quickQuery.gte('generation_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        quickQuery = quickQuery.lte('generation_date', filters.dateTo);
      }

      const [doctorResult, quickResult] = await Promise.all([
        doctorQuery,
        quickQuery
      ]);

      if (doctorResult.error) throw doctorResult.error;
      if (quickResult.error) throw quickResult.error;

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

      // Merge and sort by created_at
      const allRecords = [...doctorRecords, ...quickRecords].sort((a, b) => 
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
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">{totalPayments}</p>
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
                <Label htmlFor="doctorSearch">Search Filename</Label>
                <Input
                  id="doctorSearch"
                  type="text"
                  placeholder="Search by filename..."
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
                onClick={() => setFilters({ dateFrom: '', dateTo: '', doctorSearch: '' })}
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
                          <p className="font-semibold">{record.filename}</p>
                          <Badge variant="outline">{record.payment_count} payments</Badge>
                          <Badge variant={record.payment_source === 'doctor' ? 'default' : 'secondary'}>
                            {record.payment_source === 'doctor' ? 'Doctor Payments' : 'Quick Payments'}
                          </Badge>
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
                      
                      <div className="flex gap-2">
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
