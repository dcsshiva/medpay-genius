import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { getStaffId, getStaffTaskCounts } from '@/lib/staffUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  CheckCircle, 
  CalendarCheck, 
  MessageCircle,
  MessageSquare,
  Clock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffStats {
  pendingTasks: number;
  completedTasks: number;
  pendingLeaveRequests: number;
  approvedLeaveThisMonth: number;
  rejectedLeaveThisMonth: number;
}

interface StaffMobileDashboardProps {
  onNavigate: (tab: string) => void;
}

const StaffMobileDashboard: React.FC<StaffMobileDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StaffStats>({
    pendingTasks: 0,
    completedTasks: 0,
    pendingLeaveRequests: 0,
    approvedLeaveThisMonth: 0,
    rejectedLeaveThisMonth: 0
  });
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const id = await getStaffId(user);
        setStaffId(id);

        if (!id) {
          setLoading(false);
          return;
        }

        // Fetch task counts
        const taskStats = await getStaffTaskCounts(id);

        // Fetch leave/permission stats
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [pendingLeaveRes, approvedLeaveRes, rejectedLeaveRes] = await Promise.all([
          supabase
            .from('leave_permission_applications')
            .select('id', { count: 'exact' })
            .eq('applicant_id', id)
            .eq('status', 'pending'),
          supabase
            .from('leave_permission_applications')
            .select('id', { count: 'exact' })
            .eq('applicant_id', id)
            .eq('status', 'approved')
            .gte('created_at', startOfMonth.toISOString()),
          supabase
            .from('leave_permission_applications')
            .select('id', { count: 'exact' })
            .eq('applicant_id', id)
            .eq('status', 'rejected')
            .gte('created_at', startOfMonth.toISOString())
        ]);

        setStats({
          pendingTasks: taskStats.pendingTasks,
          completedTasks: taskStats.completedTasks,
          pendingLeaveRequests: pendingLeaveRes.count || 0,
          approvedLeaveThisMonth: approvedLeaveRes.count || 0,
          rejectedLeaveThisMonth: rejectedLeaveRes.count || 0
        });
      } catch (error) {
        console.error('Error fetching staff stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 bg-muted rounded animate-pulse w-1/2" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back! Here's your overview.</p>
      </div>

      {/* Stats Grid - 2 columns on mobile */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pending Tasks */}
        <Card 
          className="cursor-pointer active:scale-95 transition-transform"
          onClick={() => onNavigate('tasks')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ClipboardList className="h-5 w-5 text-warning" />
              {stats.pendingTasks > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {stats.pendingTasks}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-warning">{stats.pendingTasks}</p>
            <p className="text-xs text-muted-foreground">Pending Tasks</p>
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card 
          className="cursor-pointer active:scale-95 transition-transform"
          onClick={() => onNavigate('tasks')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <p className="text-2xl font-bold text-success">{stats.completedTasks}</p>
            <p className="text-xs text-muted-foreground">Completed Tasks</p>
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card 
          className="cursor-pointer active:scale-95 transition-transform"
          onClick={() => onNavigate('leave-permission')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-info" />
              {stats.pendingLeaveRequests > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {stats.pendingLeaveRequests}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-info">{stats.pendingLeaveRequests}</p>
            <p className="text-xs text-muted-foreground">Pending Requests</p>
          </CardContent>
        </Card>

        {/* Approved This Month */}
        <Card 
          className="cursor-pointer active:scale-95 transition-transform"
          onClick={() => onNavigate('leave-permission')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CalendarCheck className="h-5 w-5 text-success" />
            </div>
            <p className="text-2xl font-bold">{stats.approvedLeaveThisMonth}</p>
            <p className="text-xs text-muted-foreground">Approved (Month)</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-between h-14 px-4"
            onClick={() => onNavigate('leave-permission')}
          >
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <span>Apply for Leave / Permission</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-between h-14 px-4"
            onClick={() => onNavigate('tasks')}
          >
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-primary" />
              <span>View My Tasks</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-between h-14 px-4"
            onClick={() => onNavigate('chat')}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>Team Chat</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-between h-14 px-4"
            onClick={() => onNavigate('complaints')}
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <span>File a Complaint</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      {stats.rejectedLeaveThisMonth > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {stats.rejectedLeaveThisMonth} request(s) rejected this month
              </p>
              <p className="text-xs text-muted-foreground">
                Check your leave history for details
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaffMobileDashboard;
