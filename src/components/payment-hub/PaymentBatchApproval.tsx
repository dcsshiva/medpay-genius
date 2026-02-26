import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Filter, Search, Loader2 } from 'lucide-react';

interface Payment {
  id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_code: string;
  net_amount: number;
  total_visits: number;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
}

const PaymentBatchApproval = () => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('payments')
        .select(`
          id,
          doctor_id,
          net_amount,
          total_visits,
          period_start,
          period_end,
          status,
          created_at,
          doctors!inner(doctor_code, full_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedPayments: Payment[] = (data || []).map((p: any) => ({
        id: p.id,
        doctor_id: p.doctor_id,
        doctor_name: p.doctors?.full_name || 'Unknown',
        doctor_code: p.doctors?.doctor_code || '',
        net_amount: Number(p.net_amount) || 0,
        total_visits: p.total_visits,
        period_start: p.period_start,
        period_end: p.period_end,
        status: p.status,
        created_at: p.created_at
      }));

      setPayments(mappedPayments);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePayment = (id: string) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPayments(newSelected);
  };

  const handleSelectAll = () => {
    const filteredIds = filteredPayments.map(p => p.id);
    setSelectedPayments(new Set(filteredIds));
  };

  const handleClearAll = () => {
    setSelectedPayments(new Set());
  };

  const handleApprove = async () => {
    if (selectedPayments.size === 0) return;

    try {
      setProcessing(true);

      const updateField = userRole === 'admin' 
        ? { status: 'admin_approved' as const, admin_approved_at: new Date().toISOString() }
        : { status: 'manager_approved' as const, manager_approved_at: new Date().toISOString() };

      const { error } = await supabase
        .from('payments')
        .update({
          ...updateField,
          payment_notes: actionNotes || null
        } as any)
        .in('id', Array.from(selectedPayments));

      if (error) throw error;

      toast.success(`Approved ${selectedPayments.size} payment(s) successfully`);
      setShowApproveDialog(false);
      setActionNotes('');
      setSelectedPayments(new Set());
      fetchPayments();
    } catch (error: any) {
      console.error('Error approving payments:', error);
      toast.error('Failed to approve payments');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (selectedPayments.size === 0 || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('payments')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .in('id', Array.from(selectedPayments));

      if (error) throw error;

      toast.success(`Rejected ${selectedPayments.size} payment(s) successfully`);
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedPayments(new Set());
      fetchPayments();
    } catch (error: any) {
      console.error('Error rejecting payments:', error);
      toast.error('Failed to reject payments');
    } finally {
      setProcessing(false);
    }
  };

  const filteredPayments = payments.filter(payment => 
    payment.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.doctor_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedTotal = payments
    .filter(p => selectedPayments.has(p.id))
    .reduce((sum, p) => sum + p.net_amount, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Approval & Status</CardTitle>
          <CardDescription>Review and approve pending payment advices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4 items-center flex-1">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved_by_manager">Manager Approved</SelectItem>
                      <SelectItem value="approved_by_admin">Admin Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px] max-w-md">
                  <Input 
                    placeholder="Search by doctor name or code..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {selectedPayments.size > 0 && (
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setShowApproveDialog(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve ({selectedPayments.size})
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject ({selectedPayments.size})
                  </Button>
                </div>
              )}
            </div>

            {/* Selection Summary */}
            {selectedPayments.size > 0 && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {selectedPayments.size} payment(s) selected
                    </p>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(selectedTotal)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All ({filteredPayments.length})
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear All
              </Button>
            </div>

            {/* Payments Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-center">Visits</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedPayments.has(payment.id)}
                            onCheckedChange={() => handleTogglePayment(payment.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.doctor_name}</p>
                            <p className="text-xs text-muted-foreground">{payment.doctor_code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(payment.period_start), 'dd-MMM')} - {format(new Date(payment.period_end), 'dd-MMM-yyyy')}
                        </TableCell>
                        <TableCell className="text-center">{payment.total_visits}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.net_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            payment.status === 'pending' ? 'secondary' :
                            payment.status === 'approved_by_admin' ? 'default' :
                            payment.status === 'approved_by_manager' ? 'outline' :
                            'destructive'
                          }>
                            {payment.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(payment.created_at), 'dd-MMM-yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payments</DialogTitle>
            <DialogDescription>
              Approve {selectedPayments.size} payment advice(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approveNotes">Notes (Optional)</Label>
              <Textarea 
                id="approveNotes"
                placeholder="Add any notes or comments..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payments</DialogTitle>
            <DialogDescription>
              Reject {selectedPayments.size} payment advice(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectReason">Rejection Reason *</Label>
              <Textarea 
                id="rejectReason"
                placeholder="Please provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={processing || !rejectionReason.trim()}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentBatchApproval;
