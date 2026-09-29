import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { getStaffId, getStaffTaskCounts } from '@/lib/staffUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/currency';
import { 
  ClipboardList, 
  CheckCircle, 
  CalendarCheck, 
  MessageCircle,
  MessageSquare,
  Clock,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Star,
  Award,
  Wallet
} from 'lucide-react';
import StaffAppraisalView from './StaffAppraisalView';
import StaffPunchInCard from './StaffPunchInCard';
import StaffAttendanceCalendar from './StaffAttendanceCalendar';
import DashboardAttendanceCard from './DashboardAttendanceCard';
import StaffCycleSummaryCard from './hrms/StaffCycleSummaryCard';

interface StaffStats {
  pendingTasks: number;
  completedTasks: number;
  pendingLeaveRequests: number;
  approvedLeaveThisMonth: number;
  rejectedLeaveThisMonth: number;
}

interface LatestAppraisal {
  overall_rating: string;
  appraisal_date: string;
  punctuality_rating: number;
  work_quality_rating: number;
  teamwork_rating: number;
  communication_rating: number;
  professionalism_rating: number;
}

interface RecentWarning {
  id: string;
  warning_type: string;
  severity: string;
  incident_date: string;
  description: string;
}

interface LatestPayslip {
  payroll_month: string;
  net_salary: number;
  status: string;
}

interface StaffMobileDashboardProps {
  onNavigate: (tab: string) => void;
}

const ratingLabels: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: 'bg-green-100 text-green-800' },
  good: { label: 'Good', color: 'bg-blue-100 text-blue-800' },
  satisfactory: { label: 'Satisfactory', color: 'bg-yellow-100 text-yellow-800' },
  needs_improvement: { label: 'Needs Improvement', color: 'bg-orange-100 text-orange-800' },
  poor: { label: 'Poor', color: 'bg-red-100 text-red-800' },
};

const severityColors: Record<string, string> = {
  verbal_warning: 'bg-yellow-100 text-yellow-800',
  written_warning: 'bg-orange-100 text-orange-800',
  final_warning: 'bg-red-100 text-red-800',
  suspension: 'bg-red-200 text-red-900',
};

const warningTypeLabels: Record<string, string> = {
  late_coming: 'Late Coming',
  unauthorized_absence: 'Unauthorized Absence',
  leaving_early: 'Leaving Early',
  insubordination: 'Insubordination',
  improper_mobile_use: 'Improper Mobile Use',
  hygiene_violations: 'Hygiene Violations',
  dress_code_violations: 'Dress Code',
  sleeping_on_duty: 'Sleeping on Duty',
};

// HRMS: appraisals & warnings are not part of the payroll system
const SHOW_APPRAISALS = false;

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
  const [latestAppraisal, setLatestAppraisal] = useState<LatestAppraisal | null>(null);
  const [warningCount, setWarningCount] = useState(0);
  const [recentWarnings, setRecentWarnings] = useState<RecentWarning[]>([]);
  const [showAppraisalView, setShowAppraisalView] = useState(false);
  const [latestPayslip, setLatestPayslip] = useState<LatestPayslip | null>(null);

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

        const taskStats = await getStaffTaskCounts(id);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [pendingLeaveRes, approvedLeaveRes, rejectedLeaveRes, appraisalRes, warningsRes, payslipRes] = await Promise.all([
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
            .gte('created_at', startOfMonth.toISOString()),
          supabase
            .from('staff_appraisals')
            .select('overall_rating, appraisal_date, punctuality_rating, work_quality_rating, teamwork_rating, communication_rating, professionalism_rating')
            .eq('staff_id', id)
            .order('appraisal_date', { ascending: false })
            .limit(1),
          supabase
            .from('staff_warnings')
            .select('id, warning_type, severity, incident_date, description')
            .eq('staff_id', id)
            .is('resolved_at', null)
            .order('incident_date', { ascending: false })
            .limit(3),
          supabase
            .from('staff_payroll')
            .select('payroll_month, net_salary, status')
            .eq('staff_id', id)
            .order('payroll_month', { ascending: false })
            .limit(1),
        ]);

        setStats({
          pendingTasks: taskStats.pendingTasks,
          completedTasks: taskStats.completedTasks,
          pendingLeaveRequests: pendingLeaveRes.count || 0,
          approvedLeaveThisMonth: approvedLeaveRes.count || 0,
          rejectedLeaveThisMonth: rejectedLeaveRes.count || 0
        });

        if (appraisalRes.data && appraisalRes.data.length > 0) {
          setLatestAppraisal(appraisalRes.data[0] as LatestAppraisal);
        }

        if (warningsRes.data) {
          setRecentWarnings(warningsRes.data as RecentWarning[]);
          setWarningCount(warningsRes.data.length);
        }

        if (payslipRes.data && payslipRes.data.length > 0) {
          setLatestPayslip(payslipRes.data[0] as LatestPayslip);
        }
      } catch (error) {
        console.error('Error fetching staff stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (showAppraisalView) {
    return <StaffAppraisalView onBack={() => setShowAppraisalView(false)} />;
  }

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

  const avgRating = latestAppraisal
    ? ((latestAppraisal.punctuality_rating + latestAppraisal.work_quality_rating + latestAppraisal.teamwork_rating + latestAppraisal.communication_rating + latestAppraisal.professionalism_rating) / 5).toFixed(1)
    : null;

  return (
    <div className="space-y-6 pb-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back! Here's your overview.</p>
      </div>

      {/* Punch In/Out Card */}
      {staffId && <StaffPunchInCard staffId={staffId} />}

      {/* Personal Attendance Summary */}
      {staffId && (
        <DashboardAttendanceCard
          staffId={staffId}
          onOpenReports={() => document.getElementById('my-attendance-calendar')?.scrollIntoView({ behavior: 'smooth' })}
        />
      )}

      {/* HRMS: balances + deduction so far this pay cycle */}
      {staffId && <StaffCycleSummaryCard staffId={staffId} />}

      {/* Stats Grid - 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pending Tasks */}
        <Card className="cursor-pointer active:scale-95 transition-transform" onClick={() => onNavigate('tasks')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ClipboardList className="h-5 w-5 text-warning" />
              {stats.pendingTasks > 0 && <Badge variant="secondary" className="text-xs">{stats.pendingTasks}</Badge>}
            </div>
            <p className="text-2xl font-bold text-warning">{stats.pendingTasks}</p>
            <p className="text-xs text-muted-foreground">Pending Tasks</p>
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card className="cursor-pointer active:scale-95 transition-transform" onClick={() => onNavigate('tasks')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <p className="text-2xl font-bold text-success">{stats.completedTasks}</p>
            <p className="text-xs text-muted-foreground">Completed Tasks</p>
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card className="cursor-pointer active:scale-95 transition-transform" onClick={() => onNavigate('leave-permission')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-info" />
              {stats.pendingLeaveRequests > 0 && <Badge variant="secondary" className="text-xs">{stats.pendingLeaveRequests}</Badge>}
            </div>
            <p className="text-2xl font-bold text-info">{stats.pendingLeaveRequests}</p>
            <p className="text-xs text-muted-foreground">Pending Requests</p>
          </CardContent>
        </Card>

        {/* Approved This Month */}
        <Card className="cursor-pointer active:scale-95 transition-transform" onClick={() => onNavigate('leave-permission')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CalendarCheck className="h-5 w-5 text-success" />
            </div>
            <p className="text-2xl font-bold">{stats.approvedLeaveThisMonth}</p>
            <p className="text-xs text-muted-foreground">Approved (Month)</p>
          </CardContent>
        </Card>

        {/* Rejected This Month */}
        <Card className="cursor-pointer active:scale-95 transition-transform border-destructive/30" onClick={() => onNavigate('leave-permission')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {stats.rejectedLeaveThisMonth > 0 && <Badge variant="secondary" className="text-xs">{stats.rejectedLeaveThisMonth}</Badge>}
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.rejectedLeaveThisMonth}</p>
            <p className="text-xs text-muted-foreground">Rejected (Month)</p>
          </CardContent>
        </Card>

        {/* Latest Appraisal Rating */}
        {SHOW_APPRAISALS && latestAppraisal && (
          <Card className="cursor-pointer active:scale-95 transition-transform" onClick={() => setShowAppraisalView(true)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <Badge className={ratingLabels[latestAppraisal.overall_rating]?.color || ''}>
                {ratingLabels[latestAppraisal.overall_rating]?.label || latestAppraisal.overall_rating}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Latest Rating</p>
            </CardContent>
          </Card>
        )}

        {/* Active Warnings */}
        {SHOW_APPRAISALS && warningCount > 0 && (
          <Card className="cursor-pointer active:scale-95 transition-transform border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-2xl font-bold text-destructive">{warningCount}</p>
              <p className="text-xs text-muted-foreground">Active Warnings</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Attendance Calendar */}
      {staffId && (
        <div id="my-attendance-calendar">
          <StaffAttendanceCalendar staffId={staffId} />
        </div>
      )}

      {/* Latest Payslip */}
      {latestPayslip && (
        <Card className="cursor-pointer active:scale-95 transition-transform" onClick={() => onNavigate('payroll')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="font-semibold">Latest Payslip</span>
              </div>
              <Badge variant={latestPayslip.status === 'paid' ? 'default' : 'secondary'}>
                {latestPayslip.status}
              </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{latestPayslip.payroll_month}</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(latestPayslip.net_salary)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Performance Section */}
      {SHOW_APPRAISALS && latestAppraisal && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" /> My Performance
          </h2>
          <Card className="cursor-pointer active:scale-95 transition-transform" onClick={() => setShowAppraisalView(true)}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average Score</span>
                <span className="text-lg font-bold text-primary">{avgRating}/5</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Punctuality', value: latestAppraisal.punctuality_rating },
                  { label: 'Work Quality', value: latestAppraisal.work_quality_rating },
                  { label: 'Teamwork', value: latestAppraisal.teamwork_rating },
                  { label: 'Communication', value: latestAppraisal.communication_rating },
                  { label: 'Professionalism', value: latestAppraisal.professionalism_rating },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                    <Progress value={(value / 5) * 100} className="h-1.5 flex-1" />
                    <span className="text-xs font-semibold w-6 text-right">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-primary flex items-center gap-1">
                Tap to view full history <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Warnings */}
      {SHOW_APPRAISALS && recentWarnings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Recent Warnings
          </h2>
          <div className="space-y-2">
            {recentWarnings.map((warning) => (
              <Card key={warning.id} className="border-destructive/20">
                <CardContent className="p-3 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">
                        {warningTypeLabels[warning.warning_type] || warning.warning_type}
                      </span>
                      <Badge className={`text-xs ${severityColors[warning.severity] || ''}`}>
                        {warning.severity?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{warning.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="space-y-2">
          {SHOW_APPRAISALS && (
            <Button variant="outline" className="w-full justify-between h-14 px-4" onClick={() => setShowAppraisalView(true)}>
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-primary" />
                <span>View My Appraisals</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}

          <Button variant="outline" className="w-full justify-between h-14 px-4" onClick={() => onNavigate('leave-permission')}>
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <span>Apply for Leave / Permission</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 px-4" onClick={() => onNavigate('tasks')}>
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-primary" />
              <span>View My Tasks</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 px-4" onClick={() => onNavigate('chat')}>
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>Team Chat</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button variant="outline" className="w-full justify-between h-14 px-4" onClick={() => onNavigate('complaints')}>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <span>File a Complaint</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Rejected Requests Alert */}
      {stats.rejectedLeaveThisMonth > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {stats.rejectedLeaveThisMonth} request(s) rejected this month
              </p>
              <p className="text-xs text-muted-foreground">Check your leave history for details</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaffMobileDashboard;
