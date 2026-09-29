import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserMinus, CalendarClock, Send, ThumbsDown, Users } from 'lucide-react';
import { hasFullAccess } from '@/lib/accessLevels';

interface Props {
  onTabChange?: (tab: string) => void;
}

interface OutRow {
  id: string;
  application_type: string;
  leave_start_date: string | null;
  leave_end_date: string | null;
  is_half_day: boolean | null;
  permission_start_time: string | null;
  permission_end_time: string | null;
  applicant: { full_name: string; staff_code: string } | null;
  covering: { full_name: string; staff_code: string } | null;
}

/**
 * HRMS: manager / admin dashboard — who is out today and who is covering, plus
 * pending approvals, tasks awaiting review and rejected tasks to reassign.
 * Managers see items routed to them; full-access admins see everything.
 */
const TeamTodayCard: React.FC<Props> = ({ onTabChange }) => {
  const { user, userRole, userDesignation } = useAuth();
  const [out, setOut] = useState<OutRow[]>([]);
  const [counts, setCounts] = useState({ approvals: 0, review: 0, rejected: 0, noManager: 0 });

  useEffect(() => {
    (async () => {
      const db = supabase as any;
      const today = new Date().toISOString().slice(0, 10);
      const isAdmin = hasFullAccess(userRole as any, userDesignation as any);
      const { data: me } = user ? await db.from('staff').select('id').eq('user_id', user.id).maybeSingle() : { data: null };

      const outQ = db.from('leave_permission_applications')
        .select('id, application_type, leave_start_date, leave_end_date, is_half_day, permission_start_time, permission_end_time, applicant:applicant_id(full_name, staff_code), covering:covering_staff_id(full_name, staff_code)')
        .eq('status', 'approved')
        .or(`and(leave_start_date.lte.${today},leave_end_date.gte.${today}),permission_date.eq.${today}`);

      let approvalsQ = db.from('leave_permission_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending');
      if (!isAdmin && me?.id) approvalsQ = approvalsQ.eq('approver_id', me.id);

      let reviewQ = db.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'review');
      let rejectedQ = db.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'rejected');
      if (!isAdmin && me?.id) {
        reviewQ = reviewQ.eq('assigned_by', me.id);
        rejectedQ = rejectedQ.eq('assigned_by', me.id);
      }
      const noMgrQ = db.from('staff').select('id', { count: 'exact', head: true })
        .eq('is_active', true).is('reporting_manager_id', null).neq('role', 'doctor');

      const [o, a, r, j, nm] = await Promise.all([outQ, approvalsQ, reviewQ, rejectedQ, isAdmin ? noMgrQ : Promise.resolve({ count: 0 })]);
      setOut((o.data || []) as OutRow[]);
      setCounts({ approvals: a.count || 0, review: r.count || 0, rejected: j.count || 0, noManager: nm.count || 0 });
    })();
  }, [user, userRole, userDesignation]);

  const tile = (icon: React.ReactNode, label: string, value: number, tab: string, tone = '') => (
    <button
      type="button"
      onClick={() => onTabChange?.(tab)}
      className="rounded-md border p-3 text-left hover:border-primary/50 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
    </button>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Team today
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {tile(<CalendarClock className="h-3.5 w-3.5" />, 'Pending leave approvals', counts.approvals, 'leave-approvals', counts.approvals ? 'text-warning' : '')}
          {tile(<Send className="h-3.5 w-3.5" />, 'Tasks awaiting review', counts.review, 'tasks')}
          {tile(<ThumbsDown className="h-3.5 w-3.5" />, 'Rejected tasks to reassign', counts.rejected, 'tasks', counts.rejected ? 'text-destructive' : '')}
          {tile(<UserMinus className="h-3.5 w-3.5" />, 'Staff with no reporting manager', counts.noManager, 'appraisals')}
        </div>

        <div>
          <div className="text-sm font-medium mb-2">Who's out / who's covering</div>
          {out.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nobody is on approved leave or permission today.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {out.map(o => (
                <li key={o.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.applicant?.full_name} <span className="text-xs text-muted-foreground">({o.applicant?.staff_code})</span></div>
                    <div className="text-xs text-muted-foreground">
                      Covering: {o.covering ? `${o.covering.full_name} (${o.covering.staff_code})` : '—'}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {o.application_type === 'leave'
                      ? (o.is_half_day ? 'Half-day leave' : 'Leave')
                      : `Permission ${o.permission_start_time?.slice(0, 5) || ''}–${o.permission_end_time?.slice(0, 5) || ''}`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamTodayCard;
