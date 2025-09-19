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
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
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

interface Visit {
  id: string;
  visit_date: string;
  patient_count: number;
  patient_name: string;
  patient_id?: string;
  visit_payment?: number;
  visit_reason: string;
}

interface PaymentCalculation {
  visits: Visit[];
  total_visits: number;
  total_amount: number;
  period_start: string;
  period_end: string;
}

interface Doctor {
  id: string;
  doctor_code: string;
  profiles: {
    full_name: string;
  };
}

const PaymentManagement = () => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visitDetailsDialog, setVisitDetailsDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [transactionsDialog, setTransactionsDialog] = useState(false);
  const [selectedPaymentVisits, setSelectedPaymentVisits] = useState<Visit[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [suspectDialog, setSuspectDialog] = useState(false);
  const [suspectReason, setSuspectReason] = useState('');
  const [formData, setFormData] = useState({
    doctor_id: '',
    period_start: '',
    period_end: ''
  });
  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    transaction_reference: '',
    notes: ''
  });
  const [calculatedData, setCalculatedData] = useState<PaymentCalculation>({
    visits: [],
    total_visits: 0,
    total_amount: 0,
    period_start: '',
    period_end: ''
  });

  const [visitsTotal, setVisitsTotal] = useState(0);
  const [paidTotal, setPaidTotal] = useState(0);

  const fetchGlobalTotals = async () => {
    try {
      if (!(userRole === 'manager' || userRole === 'admin')) return;
      const [{ data: visitsData, error: visitsError }, { data: ptData, error: ptError }] = await Promise.all([
        supabase.from('visits').select('visit_payment'),
        supabase.from('payment_transactions').select('amount')
      ]);
      if (visitsError) throw visitsError;
      if (ptError) throw ptError;
      const vTotal = (visitsData || []).reduce((sum: number, v: any) => sum + (Number(v.visit_payment) || 0), 0);
      const pTotal = (ptData || []).reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      setVisitsTotal(vTotal);
      setPaidTotal(pTotal);
    } catch (err) {
      console.error('Error fetching totals:', err);
    }
  };

  const pendingTotal = Math.max(0, visitsTotal - paidTotal);

  useEffect(() => {
    fetchPayments();
    if (userRole === 'admin') {
      fetchDoctors();
    }
    if (userRole === 'manager' || userRole === 'admin') {
      fetchGlobalTotals();
    }
  }, [userRole]);

  const fetchPayments = async () => {
    try {
      // For Supabase authenticated users (admin), use their user ID
      // For custom auth users, use their original_id
      const userId = user?.user_metadata?.original_id || user?.id;
      const userType = user?.user_metadata?.user_type || 'staff';
      
      // Use secure RPC function for custom auth
      const { data, error } = await supabase.rpc('get_user_payments', {
        _user_type: userType,
        _user_id: userId,
        _user_role: userRole || 'staff'
      });

      if (error) {
        console.error('Error fetching payments:', error);
        setPayments([]);
      } else {
        // Transform the RPC response to match the expected format
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
          is_suspect: payment.is_suspect,
          suspect_reason: payment.suspect_reason,
          marked_suspect_by: payment.marked_suspect_by,
          marked_suspect_at: payment.marked_suspect_at,
          doctors: {
            doctor_code: payment.doctor_code,
            profiles: {
              full_name: payment.doctor_name
            }
          }
        })) || [];
        setPayments(transformedPayments);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payments"
      });
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
          profiles:profile_id (
            full_name
          )
        `)
        .eq('is_active', true)
        .order('doctor_code');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
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
    }
  };

  const calculatePayment = async () => {
    if (!formData.doctor_id || !formData.period_start || !formData.period_end) return;

    try {
      // Get all visits in the period
      const { data: allVisits, error: visitsError } = await supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          patient_count,
          patient_name,
          patient_id,
          visit_payment,
          visit_reason
        `)
        .eq('doctor_id', formData.doctor_id)
        .gte('visit_date', formData.period_start)
        .lte('visit_date', formData.period_end)
        .order('visit_date', { ascending: true });

      if (visitsError) throw visitsError;

      // Get all non-rejected payments for this doctor to exclude already processed visits
      const { data: existingPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, period_start, period_end, status')
        .eq('doctor_id', formData.doctor_id)
        .in('status', ['pending', 'manager_approved', 'admin_approved'])
        .order('period_start', { ascending: true });

      if (paymentsError) throw paymentsError;

      // Filter out visits that have already been processed in any non-rejected payment
      const unprocessedVisits = allVisits?.filter(visit => {
        return !existingPayments?.some(payment => {
          const visitDate = new Date(visit.visit_date);
          const paymentStart = new Date(payment.period_start);
          const paymentEnd = new Date(payment.period_end);
          return visitDate >= paymentStart && visitDate <= paymentEnd;
        });
      }) || [];

      // Show info about excluded visits if any
      const excludedVisitsCount = (allVisits?.length || 0) - unprocessedVisits.length;
      if (excludedVisitsCount > 0) {
        toast({
          title: "Info",
          description: `${excludedVisitsCount} visits excluded as they are already included in existing payment requests.`
        });
      }

      const totalVisits = unprocessedVisits.reduce((sum, visit) => sum + visit.patient_count, 0);
      // Calculate total amount based on actual visit payments, not rate * count
      const totalAmount = unprocessedVisits.reduce((sum, visit) => sum + (visit.visit_payment || 0), 0);

      // Prevent creating payment advice if no unprocessed visits
      if (unprocessedVisits.length === 0) {
        toast({
          variant: "destructive",
          title: "No Available Visits",
          description: "All visits in this period have already been included in existing payment requests."
        });
        setCalculatedData({
          visits: [],
          total_visits: 0,
          total_amount: 0,
          period_start: formData.period_start,
          period_end: formData.period_end
        });
        return;
      }

      setCalculatedData({
        visits: unprocessedVisits,
        total_visits: totalVisits,
        total_amount: totalAmount,
        period_start: formData.period_start,
        period_end: formData.period_end
      });
    } catch (error) {
      console.error('Error calculating payment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to calculate payment"
      });
    }
  };

  useEffect(() => {
    if (formData.doctor_id && formData.period_start && formData.period_end) {
      calculatePayment();
    }
  }, [formData.doctor_id, formData.period_start, formData.period_end]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPayment(true);

    if (userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins can create payment requests"
      });
      return;
    }

    // Validate that there are calculated visits to process
    if (calculatedData.total_visits === 0 || calculatedData.visits.length === 0) {
      toast({
        variant: "destructive",
        title: "No Visits to Process",
        description: "There are no unprocessed visits available for this period. All visits may already be included in existing payment requests."
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          doctor_id: formData.doctor_id,
          period_start: formData.period_start,
          period_end: formData.period_end,
          total_visits: calculatedData.total_visits,
          total_amount: calculatedData.total_amount,
          paid_amount: 0,
          remaining_amount: calculatedData.total_amount,
          is_fully_paid: false,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment advice created successfully"
      });

      setDialogOpen(false);
      resetForm();
      fetchPayments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create payment request"
      });
    } finally {
      setCreatingPayment(false);
    }
  };

  const handlePartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingPayment(true);

    if (!selectedPayment || userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins can process partial payments"
      });
      return;
    }

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
          updateData = {
            status: 'admin_approved',
            admin_approved_by: profile.id,
            admin_approved_at: new Date().toISOString()
          };
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

    setEditingPayment(payment);
    setFormData({
      doctor_id: payment.doctors.doctor_code, // This might need adjustment
      period_start: payment.period_start,
      period_end: payment.period_end
    });
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

    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment deleted successfully"
      });

      fetchPayments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete payment"
      });
    }
  };

  const handleMarkSuspect = async () => {
    if (!selectedPayment || !suspectReason.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please provide a reason for marking this payment as suspect."
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

      const { error } = await supabase
        .from('payments')
        .update({
          is_suspect: true,
          suspect_reason: suspectReason.trim(),
          marked_suspect_by: profile.id,
          marked_suspect_at: new Date().toISOString()
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment marked as suspect successfully"
      });

      setSuspectDialog(false);
      setSuspectReason('');
      setSelectedPayment(null);
      fetchPayments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to mark payment as suspect"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      doctor_id: '',
      period_start: '',
      period_end: ''
    });
    setCalculatedData({
      visits: [],
      total_visits: 0,
      total_amount: 0,
      period_start: '',
      period_end: ''
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'manager_approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'admin_approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'manager_approved':
        return 'default';
      case 'admin_approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Payment Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {userRole === 'doctor' ? 'My Payments' : 
             userRole === 'manager' ? 'Payment Approvals' : 
             'Payment Management'}
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'doctor' ? 'View your payment history and status' :
             userRole === 'manager' ? 'Review and approve payment requests' :
             'Manage payment advice and partial payments'}
          </p>
        </div>
        
        {userRole === 'admin' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Payment Advice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payment Advice</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="doctor_id">Doctor</Label>
                  <Select 
                    value={formData.doctor_id} 
                    onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.profiles?.full_name} ({doctor.doctor_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period_start">Period Start</Label>
                    <Input
                      id="period_start"
                      type="date"
                      value={formData.period_start}
                      onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="period_end">Period End</Label>
                    <Input
                      id="period_end"
                      type="date"
                      value={formData.period_end}
                      onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {calculatedData.total_amount > 0 && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center">
                        <Calculator className="h-4 w-4 mr-2" />
                        Payment Advice Calculation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Period:</span>
                        <span className="text-sm font-medium">
                          {format(new Date(calculatedData.period_start), 'MMM dd')} - {format(new Date(calculatedData.period_end), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Visit Sessions:</span>
                        <span className="text-sm font-medium">{calculatedData.visits.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Patients:</span>
                        <span className="text-sm font-medium">{calculatedData.total_visits}</span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total Payment Amount:</span>
                          <span className="text-lg font-bold text-primary">{formatCurrency(calculatedData.total_amount)}</span>
                        </div>
                      </div>
                      {calculatedData.visits.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPaymentVisits(calculatedData.visits);
                            setVisitDetailsDialog(true);
                          }}
                          className="w-full mt-3"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          View Visit Details ({calculatedData.visits.length} visits)
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creatingPayment || calculatedData.total_amount === 0 || calculatedData.visits.length === 0}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {creatingPayment ? 'Creating...' : 'Create Payment Advice'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Visit Details Dialog */}
      <Dialog open={visitDetailsDialog} onOpenChange={setVisitDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visit Details for Payment Calculation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPaymentVisits.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{selectedPaymentVisits.length}</p>
                    <p className="text-sm text-muted-foreground">Visit Sessions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {selectedPaymentVisits.reduce((sum, visit) => sum + visit.patient_count, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Patients</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(calculatedData.total_amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Payment</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Individual Visit Records</h4>
                  <div className="grid gap-3">
                    {selectedPaymentVisits.map((visit) => (
                      <Card key={visit.id} className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Date</p>
                            <p className="font-medium">{format(new Date(visit.visit_date), 'MMM dd, yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Patient</p>
                            <p className="font-medium">{visit.patient_name}</p>
                            {visit.patient_id && (
                              <p className="text-xs text-muted-foreground">ID: {visit.patient_id}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Reason</p>
                            <Badge variant="outline" className="text-xs">
                              {visit.visit_reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Patients</p>
                            <p className="font-medium">{visit.patient_count}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Visit Fee</p>
                            <p className="font-medium">
                              {visit.visit_payment ? formatCurrency(visit.visit_payment) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Payment Amount</p>
                            <p className="font-bold text-primary">
                              {visit.visit_payment ? formatCurrency(visit.visit_payment) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Partial Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Partial Payment</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{selectedPayment.doctors?.profiles?.full_name}</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-medium">{formatCurrency(selectedPayment.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid Amount:</span>
                    <span className="font-medium">{formatCurrency(selectedPayment.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>Remaining:</span>
                    <span className="font-bold text-destructive">{formatCurrency(selectedPayment.remaining_amount)}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePartialPayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Payment Amount (₹)</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    min="1"
                    max={selectedPayment.remaining_amount}
                    step="0.01"
                    value={paymentFormData.amount || ''}
                    onChange={(e) => setPaymentFormData({ 
                      ...paymentFormData, 
                      amount: parseFloat(e.target.value) || 0 
                    })}
                    placeholder={`Max: ${selectedPayment.remaining_amount}`}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="transaction_ref">Transaction Reference</Label>
                  <Input
                    id="transaction_ref"
                    value={paymentFormData.transaction_reference}
                    onChange={(e) => setPaymentFormData({ 
                      ...paymentFormData, 
                      transaction_reference: e.target.value 
                    })}
                    placeholder="Bank ref, cheque no, etc."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment_notes">Notes</Label>
                  <Textarea
                    id="payment_notes"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ 
                      ...paymentFormData, 
                      notes: e.target.value 
                    })}
                    placeholder="Payment method, additional notes..."
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setPaymentDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={processingPayment || paymentFormData.amount <= 0}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {processingPayment ? 'Recording...' : 'Record Payment'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Transactions Dialog */}
      <Dialog open={transactionsDialog} onOpenChange={setTransactionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Transaction History</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Payment Summary - {selectedPayment.doctors?.profiles?.full_name}</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Amount</p>
                    <p className="font-bold">{formatCurrency(selectedPayment.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Paid</p>
                    <p className="font-bold text-success">{formatCurrency(selectedPayment.paid_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="font-bold text-warning">{formatCurrency(selectedPayment.remaining_amount)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Transaction History</h4>
                {transactions.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {transactions.map((transaction) => (
                      <Card key={transaction.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                            </p>
                            {transaction.transaction_reference && (
                              <p className="text-sm text-muted-foreground">
                                Ref: {transaction.transaction_reference}
                              </p>
                            )}
                            {transaction.notes && (
                              <p className="text-sm text-muted-foreground">
                                {transaction.notes}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">
                            {format(new Date(transaction.created_at), 'HH:mm')}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No payment transactions recorded yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark Suspect Dialog */}
      <Dialog open={suspectDialog} onOpenChange={setSuspectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Mark Payment as Suspect
            </DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Payment Details</h4>
                <p className="text-sm text-muted-foreground">
                  Doctor: {selectedPayment.doctors?.profiles?.full_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Amount: {formatCurrency(selectedPayment.total_amount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Period: {format(new Date(selectedPayment.period_start), 'MMM dd')} - {format(new Date(selectedPayment.period_end), 'MMM dd, yyyy')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="suspect_reason">Reason for Marking as Suspect *</Label>
                <Textarea
                  id="suspect_reason"
                  value={suspectReason}
                  onChange={(e) => setSuspectReason(e.target.value)}
                  placeholder="Explain why this payment is being marked as suspect..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuspectDialog(false);
                    setSuspectReason('');
                    setSelectedPayment(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleMarkSuspect}
                  disabled={!suspectReason.trim()}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Mark as Suspect
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary Cards for Managers and Admins */}
      {(userRole === 'manager' || userRole === 'admin') && payments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-warning mr-3" />
                <div>
                  <p className="text-2xl font-bold">
                    {payments.filter(p => p.status === 'pending').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(pendingTotal)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Pending Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-success mr-3" />
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      payments
                        .filter(p => p.status === 'admin_approved')
                        .reduce((sum, p) => sum + p.paid_amount, 0)
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Paid Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Generation */}
      <div className="flex justify-end mb-6">
        <ReportGeneration
          title="Payment Management Report"
          data={payments.filter((payment) =>
            payment.doctors?.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          columns={[
            { 
              key: 'doctors.profiles.full_name', 
              label: 'Doctor Name' 
            },
            { 
              key: 'doctors.doctor_code', 
              label: 'Doctor Code' 
            },
            { 
              key: 'period_start', 
              label: 'Period Start',
              format: (value) => format(new Date(value), 'MMM dd, yyyy')
            },
            { 
              key: 'period_end', 
              label: 'Period End',
              format: (value) => format(new Date(value), 'MMM dd, yyyy')
            },
            { 
              key: 'total_visits', 
              label: 'Total Visits' 
            },
            { 
              key: 'total_amount', 
              label: 'Total Amount',
              format: (value) => formatCurrency(value)
            },
            { 
              key: 'paid_amount', 
              label: 'Paid Amount',
              format: (value) => formatCurrency(value)
            },
            { 
              key: 'remaining_amount', 
              label: 'Remaining Amount',
              format: (value) => formatCurrency(value)
            },
            { 
              key: 'is_fully_paid', 
              label: 'Fully Paid',
              format: (value) => value ? 'Yes' : 'No'
            },
            { 
              key: 'status', 
              label: 'Status',
              format: (value) => value?.replace(/_/g, ' ').toUpperCase()
            },
            { 
              key: 'payment_notes', 
              label: 'Payment Notes' 
            },
            { 
              key: 'manager_approved_at', 
              label: 'Manager Approved At',
              format: (value) => value ? format(new Date(value), 'MMM dd, yyyy HH:mm') : 'N/A'
            },
            { 
              key: 'admin_approved_at', 
              label: 'Admin Approved At',
              format: (value) => value ? format(new Date(value), 'MMM dd, yyyy HH:mm') : 'N/A'
            }
          ]}
          filename="payment_management_report"
        />
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by doctor name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Payments List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {payments
          .filter((payment) =>
            payment.doctors?.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((payment) => (
          <Card key={payment.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    {payment.doctors?.profiles?.full_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Payment Advice - Code: {payment.doctors?.doctor_code}
                  </p>
                </div>
                <Badge 
                  variant={getStatusColor(payment.status) as any}
                  className="flex items-center gap-1"
                >
                  {getStatusIcon(payment.status)}
                  {payment.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Period</p>
                  <p className="font-medium">
                    {format(new Date(payment.period_start), 'MMM dd')} - {format(new Date(payment.period_end), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Patients</p>
                  <p className="font-medium">{payment.total_visits}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <div className="text-sm space-y-1">
                  {payment.paid_amount > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-success text-xs">Paid: {formatCurrency(payment.paid_amount)}</span>
                      {!payment.is_fully_paid && (
                        <span className="text-warning text-xs">Remaining: {formatCurrency(payment.remaining_amount)}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(payment.total_amount)}</p>
                  {payment.is_fully_paid && (
                    <Badge variant="default" className="mt-1">
                      ✓ Fully Paid
                    </Badge>
                  )}
                </div>
              </div>

              {/* Approval Actions - Only show for appropriate users */}
              {((userRole === 'manager' && payment.status === 'pending') ||
                (userRole === 'admin' && (payment.status === 'pending' || payment.status === 'manager_approved'))) && (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => handleApproval(payment.id, 'approve')}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {userRole === 'manager' ? 'Approve for Admin' : 'Approve for Bank Processing'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleApproval(payment.id, 'reject', 'Rejected by ' + userRole)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}

              {/* Payment Actions - Only for Admin on approved payments */}
              {userRole === 'admin' && payment.status === 'admin_approved' && !payment.is_fully_paid && (
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedPayment(payment);
                      setPaymentFormData({ 
                        amount: payment.remaining_amount, 
                        transaction_reference: '', 
                        notes: '' 
                      });
                      setPaymentDialog(true);
                    }}
                    className="flex-1"
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Make Payment
                  </Button>
                  {payment.paid_amount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPayment(payment);
                        fetchTransactions(payment.id);
                        setTransactionsDialog(true);
                      }}
                    >
                      <History className="h-4 w-4 mr-1" />
                      History
                    </Button>
                  )}
                </div>
              )}

              {/* Approval Status */}
              {payment.status !== 'pending' && (
                <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                  {payment.status === 'manager_approved' && (
                    <p className="text-muted-foreground">
                      ✓ Manager approved on {payment.manager_approved_at ? format(new Date(payment.manager_approved_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      <br />⏳ Awaiting admin approval for bank processing
                    </p>
                  )}
                  {payment.status === 'admin_approved' && (
                    <p className="text-success">
                      ✓ <strong>Approved for bank processing</strong> on {payment.admin_approved_at ? format(new Date(payment.admin_approved_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      <br />💰 Ready for payment transfer
                    </p>
                  )}
                  {payment.status === 'rejected' && (
                    <p className="text-destructive">
                      ✗ Payment advice rejected on {payment.rejected_at ? format(new Date(payment.rejected_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                       {payment.rejection_reason && (
                         <><br />Reason: {payment.rejection_reason}</>
                       )}
                    </p>
                  )}
                </div>
              )}

              {/* Suspect Status */}
              {payment.is_suspect && (
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                  <p className="text-destructive font-medium">
                    ⚠️ <strong>Marked as Suspect</strong>
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Marked on {payment.marked_suspect_at ? format(new Date(payment.marked_suspect_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                  </p>
                  {payment.suspect_reason && (
                    <p className="text-sm mt-1">Reason: {payment.suspect_reason}</p>
                  )}
                </div>
              )}

              {/* Admin Actions */}
              {userRole === 'admin' && (
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditPayment(payment)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeletePayment(payment.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPayment(payment);
                      setSuspectDialog(true);
                    }}
                    disabled={payment.is_suspect}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {payment.is_suspect ? 'Suspect' : 'Mark Suspect'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {payments.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No payment requests</h3>
            <p className="text-muted-foreground text-center mb-4">
              {userRole === 'doctor' 
                ? "No payment requests have been created for you yet."
                : userRole === 'manager'
                ? "No pending payment advice requires your approval."
                : "No payment advice has been created yet. Create payment requests based on doctor visits."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentManagement;