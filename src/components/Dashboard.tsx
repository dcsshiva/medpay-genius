import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { getStaffId, isStaffRole, getStaffTaskCounts } from '@/lib/staffUtils';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ListTodo,
  Banknote,
  FileText
} from 'lucide-react';

interface DashboardStats {
  totalDoctors?: number;
  totalVisits?: number;
  totalPayments?: number;
  pendingApprovals?: number;
  totalUnprocessedVisits?: number;
  totalPendingPayment?: number;
  myVisits?: number;
  myEarnings?: number;
  pendingPayments?: number;
  pendingTasks?: number;
  completedTasks?: number;
  pendingCashApprovals?: number;
  pendingInsuranceApprovals?: number;
  pendingCashTotal?: number;
  pendingInsuranceTotal?: number;
  approvedCashTotal?: number;
  approvedInsuranceTotal?: number;
}

type NavigationParams = {
  tab: string;
  subTab?: string;
  paymentTypeFilter?: 'all' | 'cash' | 'insurance' | 'mixed';
}

interface DashboardProps {
  onTabChange?: (params: string | NavigationParams) => void;
}

const Dashboard = ({ onTabChange }: DashboardProps) => {
  const { userRole, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userRole) {
      fetchDashboardStats();
    }
  }, [user, userRole]);

  const fetchDashboardStats = async () => {
    try {
      if (userRole === 'admin') {
        const [doctorsRes, visitsRes, paymentsRes, pendingRes, unprocessedVisitsRes, pendingTasksRes, completedTasksRes, cashApprovalsRes, insuranceApprovalsRes, approvalTotalsRes] = await Promise.all([
          supabase.from('doctors').select('id', { count: 'exact' }),
          supabase.from('visits').select('id', { count: 'exact' }),
          supabase.from('payments').select('total_amount'),
          supabase.from('payments').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('visits').select('visit_payment', { count: 'exact' }).eq('is_processed', false),
          supabase.from('tasks').select('id', { count: 'exact' }).in('status', ['pending', 'in_progress']),
          supabase.from('tasks').select('id', { count: 'exact' }).eq('status', 'completed'),
          supabase.from('payments').select('id', { count: 'exact' }).or('cash_approval_status.eq.pending,cash_approval_status.eq.manager_approved').not('cash_approval_status', 'is', null),
          supabase.from('payments').select('id', { count: 'exact' }).or('insurance_approval_status.eq.pending,insurance_approval_status.eq.manager_approved').not('insurance_approval_status', 'is', null),
          supabase.rpc('get_payment_approval_totals')
        ]);

        const totalPaymentAmount = paymentsRes.data?.reduce((sum, payment) => sum + Number(payment.total_amount), 0) || 0;
        const totalPendingPaymentAmount = unprocessedVisitsRes.data?.reduce((sum, visit) => sum + Number(visit.visit_payment || 0), 0) || 0;
        
        const approvalTotals = approvalTotalsRes.data?.[0] || {
          pending_cash: 0,
          pending_insurance: 0,
          approved_cash: 0,
          approved_insurance: 0
        };

        setStats({
          totalDoctors: doctorsRes.count || 0,
          totalVisits: visitsRes.count || 0,
          totalPayments: totalPaymentAmount,
          pendingApprovals: pendingRes.count || 0,
          totalUnprocessedVisits: unprocessedVisitsRes.count || 0,
          totalPendingPayment: totalPendingPaymentAmount,
          pendingTasks: pendingTasksRes.count || 0,
          completedTasks: completedTasksRes.count || 0,
          pendingCashApprovals: cashApprovalsRes.count || 0,
          pendingInsuranceApprovals: insuranceApprovalsRes.count || 0,
          pendingCashTotal: Number(approvalTotals.pending_cash) || 0,
          pendingInsuranceTotal: Number(approvalTotals.pending_insurance) || 0,
          approvedCashTotal: Number(approvalTotals.approved_cash) || 0,
          approvedInsuranceTotal: Number(approvalTotals.approved_insurance) || 0,
        });
      } else if (userRole === 'manager') {
        const [doctorsRes, pendingRes, pendingTasksRes, completedTasksRes, cashApprovalsRes, insuranceApprovalsRes] = await Promise.all([
          supabase.from('doctors').select('id', { count: 'exact' }),
          supabase.from('payments').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('tasks').select('id', { count: 'exact' }).in('status', ['pending', 'in_progress']),
          supabase.from('tasks').select('id', { count: 'exact' }).eq('status', 'completed'),
          supabase.from('payments').select('id', { count: 'exact' }).or('cash_approval_status.eq.pending,cash_approval_status.eq.manager_approved').not('cash_approval_status', 'is', null),
          supabase.from('payments').select('id', { count: 'exact' }).or('insurance_approval_status.eq.pending,insurance_approval_status.eq.manager_approved').not('insurance_approval_status', 'is', null)
        ]);

        setStats({
          totalDoctors: doctorsRes.count || 0,
          pendingApprovals: pendingRes.count || 0,
          pendingTasks: pendingTasksRes.count || 0,
          completedTasks: completedTasksRes.count || 0,
          pendingCashApprovals: cashApprovalsRes.count || 0,
          pendingInsuranceApprovals: insuranceApprovalsRes.count || 0,
        });
      } else if (userRole === 'doctor') {
        // Support both custom-auth doctors and Supabase-auth doctors
        let doctorId: string | null = null;

        console.log('Dashboard - Doctor user:', user);
        console.log('Dashboard - User metadata:', user?.user_metadata);

        // Custom auth: we already have the doctor id in user metadata
        if (user?.user_metadata?.user_type === 'doctor' && user?.user_metadata?.original_id) {
          doctorId = user.user_metadata.original_id as string;
          console.log('Dashboard - Using custom auth doctor ID:', doctorId);
        } else {
          // Supabase-auth fallback: resolve via user_id -> doctors
          console.log('Dashboard - Falling back to Supabase auth lookup');
          const { data: doctorData } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', user!.id)
            .maybeSingle();
          doctorId = doctorData?.id ?? null;
        }

        console.log('Dashboard - Final doctor ID:', doctorId);

        if (doctorId) {
          const [visitsRes, paymentsRes, pendingRes] = await Promise.all([
            supabase.from('visits').select('id', { count: 'exact' }).eq('doctor_id', doctorId),
            supabase.from('payments').select('total_amount').eq('doctor_id', doctorId),
            supabase.from('payments').select('id', { count: 'exact' }).eq('doctor_id', doctorId).eq('status', 'pending')
          ]);

          console.log('Dashboard - Visits result:', visitsRes);
          console.log('Dashboard - Payments result:', paymentsRes);
          console.log('Dashboard - Pending result:', pendingRes);

          const totalEarnings = paymentsRes.data?.reduce((sum, payment) => sum + Number((payment as any).total_amount), 0) || 0;

          const statsData = {
            myVisits: visitsRes.count || 0,
            myEarnings: totalEarnings,
            pendingPayments: pendingRes.count || 0,
          };

          console.log('Dashboard - Setting stats:', statsData);

          setStats(statsData);
        } else {
          console.log('Dashboard - No doctor ID found, cannot fetch stats');
        }
      } else if (isStaffRole(userRole)) {
        // Handle all staff users (nurse, technician, receptionist, pharmacist, cleaner, security, etc.)
        console.log('Dashboard - Staff user:', user);
        
        const staffId = await getStaffId(user);

        if (staffId) {
          console.log('Dashboard - About to query tasks for staff ID:', staffId);
          
          const taskStats = await getStaffTaskCounts(staffId);
          console.log('Dashboard - Setting staff stats:', taskStats);
          setStats(taskStats);
        } else {
          console.log('Dashboard - No staff ID found, cannot fetch tasks');
          setStats({ pendingTasks: 0, completedTasks: 0 });
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAdminDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('doctors')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDoctors || 0}</div>
          <p className="text-xs text-muted-foreground">Active doctors in system</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('visits')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalVisits || 0}</div>
          <p className="text-xs text-muted-foreground">All recorded visits</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('payments')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalPayments || 0)}</div>
          <p className="text-xs text-muted-foreground">Total amount processed</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('payments')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{stats.pendingApprovals || 0}</div>
          <p className="text-xs text-muted-foreground">Awaiting approval</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('tasks')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{stats.pendingTasks || 0}</div>
          <p className="text-xs text-muted-foreground">Tasks in progress</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('tasks')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{stats.completedTasks || 0}</div>
          <p className="text-xs text-muted-foreground">Tasks completed</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.({ tab: 'visits', subTab: 'unprocessed' })}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unprocessed Visits</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-info">{stats.totalUnprocessedVisits || 0}</div>
          <p className="text-xs text-muted-foreground">Visits awaiting payment</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.({ tab: 'visits', subTab: 'unprocessed' })}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Payment Value</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{formatCurrency(stats.totalPendingPayment || 0)}</div>
          <p className="text-xs text-muted-foreground">Value of unprocessed visits</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-emerald-500/50"
        onClick={() => onTabChange?.({ tab: 'payments', subTab: 'waiting', paymentTypeFilter: 'cash' })}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Cash Approvals</CardTitle>
          <Banknote className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">{stats.pendingCashApprovals || 0}</div>
          <p className="text-xs text-muted-foreground">Cash payments awaiting approval</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-blue-500/50"
        onClick={() => onTabChange?.({ tab: 'payments', subTab: 'waiting', paymentTypeFilter: 'insurance' })}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Insurance Approvals</CardTitle>
          <FileText className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.pendingInsuranceApprovals || 0}</div>
          <p className="text-xs text-muted-foreground">Insurance payments awaiting approval</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-emerald-500/50"
        onClick={() => onTabChange?.({ tab: 'payments', subTab: 'waiting', paymentTypeFilter: 'cash' })}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Cash Total</CardTitle>
          <Banknote className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.pendingCashTotal || 0)}</div>
          <p className="text-xs text-muted-foreground">Total pending cash amount</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-blue-500/50"
        onClick={() => onTabChange?.({ tab: 'payments', subTab: 'waiting', paymentTypeFilter: 'insurance' })}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Insurance Total</CardTitle>
          <FileText className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.pendingInsuranceTotal || 0)}</div>
          <p className="text-xs text-muted-foreground">Total pending insurance amount</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-emerald-500/50"
        onClick={() => onTabChange?.({ tab: 'payments', subTab: 'paid', paymentTypeFilter: 'cash' })}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approved Cash Total</CardTitle>
          <Banknote className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{formatCurrency(stats.approvedCashTotal || 0)}</div>
          <p className="text-xs text-muted-foreground">Total approved cash amount</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-blue-500/50"
        onClick={() => onTabChange?.({ tab: 'payments', subTab: 'paid', paymentTypeFilter: 'insurance' })}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approved Insurance Total</CardTitle>
          <FileText className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{formatCurrency(stats.approvedInsuranceTotal || 0)}</div>
          <p className="text-xs text-muted-foreground">Total approved insurance amount</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderManagerDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('doctors')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDoctors || 0}</div>
          <p className="text-xs text-muted-foreground">Under management</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('payments')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{stats.pendingApprovals || 0}</div>
          <p className="text-xs text-muted-foreground">Awaiting your approval</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('tasks')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{stats.pendingTasks || 0}</div>
          <p className="text-xs text-muted-foreground">Tasks in progress</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('tasks')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{stats.completedTasks || 0}</div>
          <p className="text-xs text-muted-foreground">Tasks completed</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-emerald-500/50"
        onClick={() => onTabChange?.('payments')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Cash Approvals</CardTitle>
          <Banknote className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">{stats.pendingCashApprovals || 0}</div>
          <p className="text-xs text-muted-foreground">Cash payments awaiting approval</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-blue-500/50"
        onClick={() => onTabChange?.('payments')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Insurance Approvals</CardTitle>
          <FileText className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.pendingInsuranceApprovals || 0}</div>
          <p className="text-xs text-muted-foreground">Insurance payments awaiting approval</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderStaffDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('tasks')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Pending Tasks</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{stats.pendingTasks || 0}</div>
          <p className="text-xs text-muted-foreground">Tasks assigned to me</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('tasks')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{stats.completedTasks || 0}</div>
          <p className="text-xs text-muted-foreground">Tasks I've completed</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderDoctorDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('visits')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Visits</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.myVisits || 0}</div>
          <p className="text-xs text-muted-foreground">Total visits recorded</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('payments')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{formatCurrency(stats.myEarnings || 0)}</div>
          <p className="text-xs text-muted-foreground">Total approved payments</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50"
        onClick={() => onTabChange?.('payments')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{stats.pendingPayments || 0}</div>
          <p className="text-xs text-muted-foreground">Awaiting approval</p>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
      </div>

      {userRole === 'admin' && renderAdminDashboard()}
      {userRole === 'manager' && renderManagerDashboard()}
      {userRole === 'doctor' && renderDoctorDashboard()}
      {(userRole && !['admin', 'manager', 'doctor'].includes(userRole)) && renderStaffDashboard()}
    </div>
  );
};

export default Dashboard;