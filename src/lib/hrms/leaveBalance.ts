import { supabase } from '@/integrations/supabase/client';
import { fetchPayrollSettings, cycleContaining, PayCycle, parseISO } from './payCycle';

export interface LeaveBalance {
  cycle: PayCycle;
  monthlyCL: number;
  clApproved: number;
  clPending: number;
  clRemaining: number;
  permQuotaMin: number;
  permApprovedMin: number;
  permPendingMin: number;
  permRemainingMin: number;
}

const overlapDays = (s: string, e: string, cs: string, ce: string, half: boolean) => {
  const start = s > cs ? s : cs;
  const end = (e || s) < ce ? (e || s) : ce;
  if (start > end) return 0;
  const days = Math.round((parseISO(end).getTime() - parseISO(start).getTime()) / 86400000) + 1;
  return half && days === 1 ? 0.5 : days;
};

/**
 * Quick balance for the pay cycle containing `refDate`, based on leave / permission
 * applications. (The payroll engine is the final word: unplanned absences also use CL.)
 */
export async function fetchLeaveBalance(staffId: string, refDate: Date = new Date()): Promise<LeaveBalance> {
  const settings = await fetchPayrollSettings();
  const cycle = cycleContaining(refDate, settings.cycle_start_day);

  const [{ data: staff }, { data: apps }] = await Promise.all([
    (supabase as any).from('staff').select('monthly_cl, monthly_permission_hours').eq('id', staffId).maybeSingle(),
    (supabase as any)
      .from('leave_permission_applications')
      .select('application_type, status, leave_start_date, leave_end_date, is_half_day, permission_date, permission_duration_minutes')
      .eq('applicant_id', staffId)
      .in('status', ['approved', 'pending'])
      .or(`and(leave_start_date.lte.${cycle.end},leave_end_date.gte.${cycle.start}),and(permission_date.gte.${cycle.start},permission_date.lte.${cycle.end})`),
  ]);

  const monthlyCL = Number(staff?.monthly_cl ?? 1);
  const permQuotaMin = Math.round(Number(staff?.monthly_permission_hours ?? 4) * 60);
  let clApproved = 0, clPending = 0, permApprovedMin = 0, permPendingMin = 0;

  for (const a of (apps || []) as any[]) {
    if (a.application_type === 'leave' && a.leave_start_date) {
      const days = overlapDays(a.leave_start_date, a.leave_end_date, cycle.start, cycle.end, !!a.is_half_day);
      if (a.status === 'approved') clApproved += days; else clPending += days;
    } else if (a.application_type === 'permission' && a.permission_date) {
      const mins = Number(a.permission_duration_minutes || 0);
      if (a.status === 'approved') permApprovedMin += mins; else permPendingMin += mins;
    }
  }

  return {
    cycle,
    monthlyCL,
    clApproved,
    clPending,
    clRemaining: Math.max(0, monthlyCL - clApproved),
    permQuotaMin,
    permApprovedMin,
    permPendingMin,
    permRemainingMin: Math.max(0, permQuotaMin - permApprovedMin),
  };
}

export const fmtMinutes = (n: number) => {
  if (n <= 0) return '0m';
  const h = Math.floor(n / 60), m = Math.round(n % 60);
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
};
