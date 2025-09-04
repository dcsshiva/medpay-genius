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
  TrendingUp 
} from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
  id: string;
  period_start: string;
  period_end: string;
  total_visits: number;
  rate_per_visit: number;
  total_amount: number;
  status: 'pending' | 'manager_approved' | 'admin_approved' | 'rejected';
  manager_approved_by?: string;
  manager_approved_at?: string;
  admin_approved_by?: string;
  admin_approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  doctors: {
    doctor_code: string;
    profiles: {
      full_name: string;
    };
  };
}

interface Doctor {
  id: string;
  doctor_code: string;
  rate_per_visit: number;
  profiles: {
    full_name: string;
  };
}

const PaymentManagement = () => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    doctor_id: '',
    period_start: '',
    period_end: ''
  });
  const [calculatedData, setCalculatedData] = useState({
    total_visits: 0,
    rate_per_visit: 0,
    total_amount: 0
  });

  useEffect(() => {
    fetchPayments();
    if (userRole === 'admin') {
      fetchDoctors();
    }
  }, [userRole]);

  const fetchPayments = async () => {
    try {
      let query = supabase
        .from('payments')
        .select(`
          id,
          period_start,
          period_end,
          total_visits,
          rate_per_visit,
          total_amount,
          status,
          manager_approved_by,
          manager_approved_at,
          admin_approved_by,
          admin_approved_at,
          rejected_by,
          rejected_at,
          rejection_reason,
          doctors:doctor_id (
            doctor_code,
            profiles:profile_id (
              full_name
            )
          )
        `);

      // If user is a doctor, only show their payments
      if (userRole === 'doctor') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user!.id)
          .single();

        if (profile) {
          const { data: doctorData } = await supabase
            .from('doctors')
            .select('id')
            .eq('profile_id', profile.id)
            .single();

          if (doctorData) {
            query = query.eq('doctor_id', doctorData.id);
          }
        }
      }

      // If user is a manager, show only pending payments
      if (userRole === 'manager') {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
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
          rate_per_visit,
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

  const calculatePayment = async () => {
    if (!formData.doctor_id || !formData.period_start || !formData.period_end) return;

    try {
      // Get doctor's rate
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('rate_per_visit')
        .eq('id', formData.doctor_id)
        .single();

      if (doctorError) throw doctorError;

      // Count visits in the period
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('patient_count')
        .eq('doctor_id', formData.doctor_id)
        .gte('visit_date', formData.period_start)
        .lte('visit_date', formData.period_end);

      if (visitsError) throw visitsError;

      const totalVisits = visits?.reduce((sum, visit) => sum + visit.patient_count, 0) || 0;
      const ratePerVisit = doctorData.rate_per_visit;
      const totalAmount = totalVisits * ratePerVisit;

      setCalculatedData({
        total_visits: totalVisits,
        rate_per_visit: ratePerVisit,
        total_amount: totalAmount
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

    if (userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins can create payment requests"
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
          rate_per_visit: calculatedData.rate_per_visit,
          total_amount: calculatedData.total_amount,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment request created successfully"
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
    }
  };

  const handleApproval = async (paymentId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();

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

  const resetForm = () => {
    setFormData({
      doctor_id: '',
      period_start: '',
      period_end: ''
    });
    setCalculatedData({
      total_visits: 0,
      rate_per_visit: 0,
      total_amount: 0
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
             'Manage all payment requests and approvals'}
          </p>
        </div>
        
        {userRole === 'admin' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payment Request</DialogTitle>
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
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center">
                        <Calculator className="h-4 w-4 mr-2" />
                        Payment Calculation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Visits:</span>
                        <span className="text-sm font-medium">{calculatedData.total_visits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Rate per Visit:</span>
                        <span className="text-sm font-medium">{formatCurrency(calculatedData.rate_per_visit)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium">Total Amount:</span>
                        <span className="text-sm font-bold text-success">{formatCurrency(calculatedData.total_amount)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={calculatedData.total_amount === 0}>
                    Create Payment
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Payments List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {payments.map((payment) => (
          <Card key={payment.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {payment.doctors?.profiles?.full_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {payment.doctors?.doctor_code} • {format(new Date(payment.period_start), 'PP')} - {format(new Date(payment.period_end), 'PP')}
                  </p>
                </div>
                <Badge variant={getStatusColor(payment.status) as any} className="flex items-center space-x-1">
                  {getStatusIcon(payment.status)}
                  <span className="capitalize">{payment.status.replace('_', ' ')}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Visits</p>
                    <p className="text-lg font-semibold">{payment.total_visits}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Rate per Visit</p>
                    <p className="text-lg font-semibold">{formatCurrency(payment.rate_per_visit)}</p>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Amount:</span>
                    <span className="text-xl font-bold text-success">{formatCurrency(payment.total_amount)}</span>
                  </div>
                </div>

                {payment.rejection_reason && (
                  <div className="bg-destructive/10 p-3 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-1">Rejection Reason:</p>
                    <p className="text-sm text-destructive/80">{payment.rejection_reason}</p>
                  </div>
                )}

                {/* Approval Actions */}
                {(userRole === 'manager' || userRole === 'admin') && payment.status === 'pending' && (
                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleApproval(payment.id, 'approve')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const reason = prompt('Please provide a reason for rejection:');
                        if (reason) {
                          handleApproval(payment.id, 'reject', reason);
                        }
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {payments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No payments found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {userRole === 'doctor' ? "No payment requests have been created for you yet." :
               userRole === 'manager' ? "No payments are pending your approval." :
               "Start by creating payment requests for doctors."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentManagement;