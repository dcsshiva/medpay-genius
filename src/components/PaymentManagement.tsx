import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { 
  Plus, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Calculator,
  TrendingUp,
  History,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportGeneration from './ReportGeneration';

interface Payment {
  id: string;
  period_start: string;
  period_end: string;
  total_visits: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  is_fully_paid: boolean;
  payment_notes?: string;
  status: 'pending' | 'manager_approved' | 'admin_approved' | 'rejected';
  manager_approved_by?: string;
  manager_approved_at?: string;
  admin_approved_by?: string;
  admin_approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  is_suspect?: boolean;
  suspect_reason?: string;
  marked_suspect_by?: string;
  marked_suspect_at?: string;
  doctors: {
    doctor_code: string;
    profiles: {
      full_name: string;
    };
  };
}

interface PaymentTransaction {
  id: string;
  payment_id: string;
  amount: number;
  transaction_date: string;
  transaction_reference?: string;
  notes?: string;
  created_at: string;
}

interface Doctor {
  id: string;
  doctor_code: string;
  profiles: {
    full_name: string;
  };
}

interface Visit {
  id: string;
  visit_date: string;
  patient_count: number;
  patient_name: string;
  visit_payment?: number;
  payment_type: string;
  visit_reason: string;
  notes?: string;
  is_processed: boolean;
  doctor_id: string;
  doctors: {
    doctor_code: string;
    profiles: {
      full_name: string;
    };
  };
}

const PaymentManagement = () => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suspectDialog, setSuspectDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [transactionsDialog, setTransactionsDialog] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Global payment statistics
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);

  const [formData, setFormData] = useState({
    doctor_id: '',
    period_start: '',
    period_end: '',
    payment_notes: ''
  });

  const [suspectFormData, setSuspectFormData] = useState({
    suspect_reason: ''
  });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    transaction_reference: '',
    notes: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchGlobalTotals();
    if (userRole === 'admin' || userRole === 'manager') {
      fetchDoctors();
    }
  }, [userRole]);

  const fetchGlobalTotals = async () => {
    try {
      const [visitsResponse, transactionsResponse] = await Promise.all([
        supabase.from('visits').select('visit_payment'),
        supabase.from('payment_transactions').select('amount')
      ]);

      if (visitsResponse.data) {
        const totalFromVisits = visitsResponse.data.reduce((sum, visit) => 
          sum + (visit.visit_payment || 0), 0
        );
        setTotalPending(totalFromVisits);
      }

      if (transactionsResponse.data) {
        const totalPaidAmount = transactionsResponse.data.reduce((sum, transaction) => 
          sum + transaction.amount, 0
        );
        setTotalPaid(totalPaidAmount);
      }
    } catch (error) {
      console.error('Error fetching global totals:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const userId = userRole === 'doctor' 
        ? user?.user_metadata?.original_id || user?.id
        : user?.id;

      const { data, error } = await supabase.rpc('get_user_payments', {
        _user_type: userRole === 'doctor' ? 'doctor' : 'staff',
        _user_id: userId,
        _user_role: userRole || 'staff'
      });

      if (error) {
        console.error('Error fetching payments:', error);
        setPayments([]);
      } else {
        const transformedPayments = data?.map((payment: any) => ({
          id: payment.id,
          period_start: payment.period_start,
          period_end: payment.period_end,
          total_visits: payment.total_visits,
          total_amount: payment.total_amount,
          paid_amount: payment.paid_amount,
          remaining_amount: payment.remaining_amount,
          is_fully_paid: payment.is_fully_paid,
          payment_notes: payment.payment_notes,
          status: payment.status,
          manager_approved_by: payment.manager_approved_by,
          manager_approved_at: payment.manager_approved_at,
          admin_approved_by: payment.admin_approved_by,
          admin_approved_at: payment.admin_approved_at,
          rejected_by: payment.rejected_by,
          rejected_at: payment.rejected_at,
          rejection_reason: payment.rejection_reason,
          doctors: {
            doctor_code: payment.doctor_code,
            profiles: {
              full_name: payment.doctor_name
            }
          }
        })) || [];
        setPayments(transformedPayments);

        // Calculate pending total from current payments
        const currentPendingTotal = transformedPayments
          .filter((p: any) => p.status === 'pending')
          .reduce((sum: number, p: any) => sum + p.total_amount, 0);
        setPendingTotal(currentPendingTotal);
      }
    } catch (error) {
      console.error('Error:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          doctor_code,
          profiles!inner (
            full_name
          )
        `)
        .eq('is_active', true)
        .order('doctor_code');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch doctors"
      });
    }
  };

  const fetchTransactions = async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          id,
          payment_id,
          amount,
          transaction_date,
          transaction_reference,
          notes,
          created_at
        `)
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payment transactions"
      });
    }
  };

  const fetchUnprocessedVisits = async (doctorId: string, startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          doctors!inner (
            doctor_code,
            profiles!inner (
              full_name
            )
          )
        `)
        .eq('doctor_id', doctorId)
        .eq('is_processed', false)
        .gte('visit_date', startDate)
        .lte('visit_date', endDate)
        .order('visit_date', { ascending: true });

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
      setVisits([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!formData.doctor_id || !formData.period_start || !formData.period_end) {
        throw new Error('Please fill in all required fields');
      }

      // Fetch unprocessed visits for validation
      await fetchUnprocessedVisits(formData.doctor_id, formData.period_start, formData.period_end);
      
      if (visits.length === 0) {
        throw new Error('No unprocessed visits found for the selected period');
      }

      // Calculate total amount from visits
      const totalAmount = visits.reduce((sum, visit) => sum + (visit.visit_payment || 0), 0);
      const totalVisits = visits.reduce((sum, visit) => sum + visit.patient_count, 0);

      const paymentData = {
        doctor_id: formData.doctor_id,
        period_start: formData.period_start,
        period_end: formData.period_end,
        total_visits: totalVisits,
        total_amount: totalAmount,
        paid_amount: 0,
        remaining_amount: totalAmount,
        is_fully_paid: false,
        payment_notes: formData.payment_notes || null,
        status: 'pending'
      };

      const { error } = await supabase
        .from('payments')
        .insert([paymentData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment advice created successfully"
      });

      setDialogOpen(false);
      resetForm();
      fetchPayments();
      fetchGlobalTotals();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create payment advice"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    
    setProcessingPayment(true);

    if (paymentFormData.amount <= 0 || paymentFormData.amount > selectedPayment.remaining_amount) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: `Amount must be between ₹1 and ${formatCurrency(selectedPayment.remaining_amount)}`
      });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      // Create payment transaction
      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          payment_id: selectedPayment.id,
          amount: paymentFormData.amount,
          transaction_reference: paymentFormData.transaction_reference || null,
          notes: paymentFormData.notes || null,
          created_by: profile.id
        });

      if (transactionError) throw transactionError;

      // Update payment record
      const newPaidAmount = selectedPayment.paid_amount + paymentFormData.amount;
      const newRemainingAmount = selectedPayment.total_amount - newPaidAmount;
      const isFullyPaid = newRemainingAmount <= 0;

      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          is_fully_paid: isFullyPaid
        })
        .eq('id', selectedPayment.id);

      if (paymentError) throw paymentError;

      toast({
        title: "Success",
        description: `Payment of ${formatCurrency(paymentFormData.amount)} recorded successfully`
      });

      setPaymentDialog(false);
      setPaymentFormData({ amount: 0, transaction_reference: '', notes: '' });
      fetchPayments();
      fetchGlobalTotals();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record payment"
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleApproval = async (paymentId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      let updateData: any = {};

      if (action === 'approve') {
        if (userRole === 'manager') {
          updateData = {
            status: 'manager_approved',
            manager_approved_by: profile.id,
            manager_approved_at: new Date().toISOString()
          };
        } else if (userRole === 'admin') {
          const payment = payments.find(p => p.id === paymentId);
          if (payment?.status === 'pending') {
            // Skip manager approval and go directly to admin approval
            updateData = {
              status: 'admin_approved',
              manager_approved_by: profile.id,
              manager_approved_at: new Date().toISOString(),
              admin_approved_by: profile.id,
              admin_approved_at: new Date().toISOString()
            };
          } else {
            updateData = {
              status: 'admin_approved',
              admin_approved_by: profile.id,
              admin_approved_at: new Date().toISOString()
            };
          }
        }
      } else {
        updateData = {
          status: 'rejected',
          rejected_by: profile.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason
        };
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      fetchPayments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${action} payment`
      });
    }
  };

  const handleSuspectToggle = async (paymentId: string, reason?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      const payment = payments.find(p => p.id === paymentId);
      const isMarking = !payment?.is_suspect;

      const updateData = {
        is_suspect: isMarking,
        suspect_reason: isMarking ? reason : null,
        marked_suspect_by: isMarking ? profile.id : null,
        marked_suspect_at: isMarking ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment ${isMarking ? 'marked as suspect' : 'unmarked as suspect'}`
      });

      setSuspectDialog(false);
      setSuspectFormData({ suspect_reason: '' });
      fetchPayments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update payment status"
      });
    }
  };

  const checkPaymentHasTransactions = async (paymentId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('id')
        .eq('payment_id', paymentId)
        .limit(1);

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking transactions:', error);
      return false;
    }
  };

  const handleEditPayment = async (payment: Payment) => {
    const hasTransactions = await checkPaymentHasTransactions(payment.id);
    
    if (hasTransactions) {
      toast({
        variant: "destructive",
        title: "Cannot Edit Payment",
        description: "This payment has transactions and cannot be edited. You can mark it as suspect instead."
      });
      return;
    }

    setFormData({
      doctor_id: payment.doctors ? '' : payment.doctors.profiles.full_name,
      period_start: payment.period_start,
      period_end: payment.period_end,
      payment_notes: payment.payment_notes || ''
    });
    setEditingPayment(payment);
    setDialogOpen(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    const hasTransactions = await checkPaymentHasTransactions(paymentId);
    
    if (hasTransactions) {
      toast({
        variant: "destructive",
        title: "Cannot Delete Payment",
        description: "This payment has transactions and cannot be deleted. You can mark it as suspect instead."
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this payment advice?')) return;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment advice deleted successfully"
      });
      
      fetchPayments();
      fetchGlobalTotals();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete payment advice"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      doctor_id: '',
      period_start: '',
      period_end: '',
      payment_notes: ''
    });
    setEditingPayment(null);
    setVisits([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'manager_approved': return 'outline';
      case 'admin_approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'manager_approved': return <AlertCircle className="h-3 w-3" />;
      case 'admin_approved': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <X className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Payment Management</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Filter payments for tabs - not fully paid means pending or approved
  const waitingForApprovalPayments = payments.filter(p => 
    (p.status === 'pending' || p.status === 'manager_approved' || p.status === 'admin_approved') && !p.is_fully_paid
  );
  const fullyPaidPayments = payments.filter(p => p.is_fully_paid);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Management</h1>
          <p className="text-muted-foreground">Manage doctor payment advice and transactions</p>
        </div>
        
        {(userRole === 'admin' || userRole === 'manager') && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (open) {
              resetForm();
              setEditingPayment(null);
            }
            setDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Payment Advice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPayment ? 'Edit Payment Advice' : 'Create Payment Advice'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doctor_id">Doctor</Label>
                    <Select 
                      value={formData.doctor_id} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, doctor_id: value });
                        if (formData.period_start && formData.period_end) {
                          fetchUnprocessedVisits(value, formData.period_start, formData.period_end);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.profiles.full_name} ({doctor.doctor_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="period_start">Period Start</Label>
                    <Input
                      id="period_start"
                      type="date"
                      value={formData.period_start}
                      onChange={(e) => {
                        setFormData({ ...formData, period_start: e.target.value });
                        if (formData.doctor_id && formData.period_end) {
                          fetchUnprocessedVisits(formData.doctor_id, e.target.value, formData.period_end);
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="period_end">Period End</Label>
                    <Input
                      id="period_end"
                      type="date"
                      value={formData.period_end}
                      onChange={(e) => {
                        setFormData({ ...formData, period_end: e.target.value });
                        if (formData.doctor_id && formData.period_start) {
                          fetchUnprocessedVisits(formData.doctor_id, formData.period_start, e.target.value);
                        }
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_notes">Payment Notes (Optional)</Label>
                  <Textarea
                    id="payment_notes"
                    value={formData.payment_notes}
                    onChange={(e) => setFormData({ ...formData, payment_notes: e.target.value })}
                    rows={3}
                  />
                </div>

                {visits.length > 0 && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-success" />
                        Unprocessed Visits Found ({visits.length})
                      </h3>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(visits.reduce((sum, visit) => sum + (visit.visit_payment || 0), 0))}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                      {visits.map((visit) => (
                        <Card key={visit.id} className="bg-background">
                          <CardContent className="p-3">
                            <div className="space-y-1">
                              <div className="flex justify-between items-start">
                                <p className="font-medium text-sm">
                                  {format(new Date(visit.visit_date), 'MMM dd, yyyy')}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {visit.patient_count} {visit.patient_count === 1 ? 'Patient' : 'Patients'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {visit.patient_name}
                              </p>
                              <div className="flex justify-between items-center">
                                <span className="text-xs capitalize">{visit.visit_reason.replace('_', ' ')}</span>
                                {visit.visit_payment && (
                                  <span className="text-sm font-semibold text-primary">
                                    ₹{visit.visit_payment}
                                  </span>
                                )
