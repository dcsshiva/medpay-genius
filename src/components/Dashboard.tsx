import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { getStaffId, isStaffRole, getStaffTaskCounts } from '@/lib/staffUtils';
import { isManagerLike } from '@/lib/accessLevels';
import DashboardAttendanceCard from '@/components/DashboardAttendanceCard';
import { CheckCircle, ListTodo } from 'lucide-react';
import TeamTodayCard from '@/components/hrms/TeamTodayCard';
import StaffCycleSummaryCard from '@/components/hrms/StaffCycleSummaryCard';

interface DashboardStats {
  pendingTasks?: number;
  completedTasks?: number;
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
  const { userRole, userDesignation, userProfile, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);

  useEffect(() => {
    if (user && userRole) {
      fetchDashboardStats();
    }
  }, [user, userRole]);

  const fetchDashboardStats = async () => {
    try {
      if (isManagerLike(userRole, userDesignation, userProfile?.role)) {
        const [pending, completed] = await Promise.all([
          supabase.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'in_progress'] as any),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        ]);
        setStats({ pendingTasks: pending.count || 0, completedTasks: completed.count || 0 });
      } else if (isStaffRole(userRole)) {
        // Handle all staff users (nurse, technician, receptionist, pharmacist, cleaner, security, etc.)
        console.log('Dashboard - Staff user:', user);
        
        const staffId = await getStaffId(user);
        setStaffId(staffId);

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

  const renderManagerDashboard = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
      <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50" onClick={() => onTabChange?.('tasks')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{stats.pendingTasks || 0}</div>
          <p className="text-xs text-muted-foreground">Tasks in progress</p>
        </CardContent>
      </Card>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-primary/50" onClick={() => onTabChange?.('tasks')}>
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

  const renderStaffDashboard = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Overview</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
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
        <h1 className="text-3xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
      </div>

      {isManagerLike(userRole, userDesignation, userProfile?.role) && (
        <DashboardAttendanceCard onOpenReports={() => onTabChange?.('attendance')} />
      )}

      {isManagerLike(userRole, userDesignation, userProfile?.role) && (
        <TeamTodayCard onTabChange={(tab) => onTabChange?.(tab)} />
      )}

      {staffId && userProfile?.role !== 'staff_manager' && (
        <DashboardAttendanceCard staffId={staffId} />
      )}

      {staffId && !isManagerLike(userRole, userDesignation, userProfile?.role) && (
        <StaffCycleSummaryCard staffId={staffId} />
      )}

      {isManagerLike(userRole, userDesignation, userProfile?.role) && renderManagerDashboard()}
      {userRole && !isManagerLike(userRole, userDesignation, userProfile?.role) && renderStaffDashboard()}
    </div>
  );
};

export default Dashboard;