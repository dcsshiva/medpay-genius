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
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalDoctors?: number;
  totalVisits?: number;
  totalPayments?: number;
  pendingApprovals?: number;
  myVisits?: number;
  myEarnings?: number;
  pendingPayments?: number;
}

const Dashboard = () => {
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
        const [doctorsRes, visitsRes, paymentsRes, pendingRes] = await Promise.all([
          supabase.from('doctors').select('id', { count: 'exact' }),
          supabase.from('visits').select('id', { count: 'exact' }),
          supabase.from('payments').select('total_amount'),
          supabase.from('payments').select('id', { count: 'exact' }).eq('status', 'pending')
        ]);

        const totalPaymentAmount = paymentsRes.data?.reduce((sum, payment) => sum + Number(payment.total_amount), 0) || 0;

        setStats({
          totalDoctors: doctorsRes.count || 0,
          totalVisits: visitsRes.count || 0,
          totalPayments: totalPaymentAmount,
          pendingApprovals: pendingRes.count || 0,
        });
      } else if (userRole === 'manager') {
        const [doctorsRes, pendingRes] = await Promise.all([
          supabase.from('doctors').select('id', { count: 'exact' }),
          supabase.from('payments').select('id', { count: 'exact' }).eq('status', 'pending')
        ]);

        setStats({
          totalDoctors: doctorsRes.count || 0,
          pendingApprovals: pendingRes.count || 0,
        });
      } else if (userRole === 'doctor') {
        // Get doctor ID first
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
            const [visitsRes, paymentsRes, pendingRes] = await Promise.all([
              supabase.from('visits').select('id', { count: 'exact' }).eq('doctor_id', doctorData.id),
              supabase.from('payments').select('total_amount').eq('doctor_id', doctorData.id),
              supabase.from('payments').select('id', { count: 'exact' }).eq('doctor_id', doctorData.id).eq('status', 'pending')
            ]);

            const totalEarnings = paymentsRes.data?.reduce((sum, payment) => sum + Number(payment.total_amount), 0) || 0;

            setStats({
              myVisits: visitsRes.count || 0,
              myEarnings: totalEarnings,
              pendingPayments: pendingRes.count || 0,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAdminDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDoctors || 0}</div>
          <p className="text-xs text-muted-foreground">Active doctors in system</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalVisits || 0}</div>
          <p className="text-xs text-muted-foreground">All recorded visits</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalPayments || 0)}</div>
          <p className="text-xs text-muted-foreground">Total amount processed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{stats.pendingApprovals || 0}</div>
          <p className="text-xs text-muted-foreground">Awaiting approval</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderManagerDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDoctors || 0}</div>
          <p className="text-xs text-muted-foreground">Under management</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{stats.pendingApprovals || 0}</div>
          <p className="text-xs text-muted-foreground">Awaiting your approval</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderDoctorDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Visits</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.myVisits || 0}</div>
          <p className="text-xs text-muted-foreground">Total visits recorded</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{formatCurrency(stats.myEarnings || 0)}</div>
          <p className="text-xs text-muted-foreground">Total approved payments</p>
        </CardContent>
      </Card>

      <Card>
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