import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ListTodo
} from 'lucide-react';

interface DashboardStats {
  totalDoctors?: number;
  totalVisits?: number;
  totalPayments?: number;
  pendingApprovals?: number;
  myVisits?: number;
  myEarnings?: number;
  pendingPayments?: number;
  pendingTasks?: number;
  completedTasks?: number;
}

interface DashboardProps {
  onTabChange?: (tab: string) => void;
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
        const [doctorsRes, visitsRes, paymentsRes, pendingRes, pendingTasksRes, completedTasksRes] = await Promise.all([
          supabase.from('doctors').select('id', { count: 'exact' }),
          supabase.from('visits').select('id', { count: 'exact' }),
          supabase.from('payments').select('total_amount'),
          supabase.from('payments').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('tasks').select('id', { count: 'exact' }).in('status', ['pending', 'in_progress']),
          supabase.from('tasks').select('id', { count: 'exact' }).eq('status', 'completed')
        ]);

        const totalPaymentAmount = paymentsRes.data?.reduce((sum, payment) => sum + Number(payment.total_amount), 0) || 0;

        setStats({
          totalDoctors: doctorsRes.count || 0,
          totalVisits: visitsRes.count || 0,
          totalPayments: totalPaymentAmount,
          pendingApprovals: pendingRes.count || 0,
          pendingTasks: pendingTasksRes.count || 0,
          completedTasks: completedTasksRes.count || 0,
        });
      } else if (userRole === 'manager') {
        const [doctorsRes, pendingRes, pendingTasksRes, completedTasksRes] = await Promise.all([
          supabase.from('doctors').select('id', { count: 'exact' }),
          supabase.from('payments').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('tasks').select('id', { count: 'exact' }).in('status', ['pending', 'in_progress']),
          supabase.from('tasks').select('id', { count: 'exact' }).eq('status', 'completed')
        ]);

        setStats({
          totalDoctors: doctorsRes.count || 0,
          pendingApprovals: pendingRes.count || 0,
          pendingTasks: pendingTasksRes.count || 0,
          completedTasks: completedTasksRes.count || 0,
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
          // Supabase-auth fallback: resolve via profiles -> doctors
          console.log('Dashboard - Falling back to Supabase auth lookup');
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user!.id)
            .maybeSingle();

          if (profile) {
            const { data: doctorData } = await supabase
              .from('doctors')
              .select('id')
              .eq('profile_id', profile.id)
              .maybeSingle();
            doctorId = doctorData?.id ?? null;
          }
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
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAdminDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  );
};

export default Dashboard;