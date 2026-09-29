import { supabase } from '@/integrations/supabase/client';
import { ShiftDefinition } from '@/lib/attendanceShifts';
import { fetchAllPaginated } from '@/lib/fetchAllPaginated';
import { PayrollSettings, PayCycle, fetchPayrollSettings, cycleForMonth } from './payCycle';
import { computePayroll, EngineAttendance, EngineSalary, EngineStaff, PayrollResult } from './payrollEngine';

export interface CycleData {
  cycle: PayCycle;
  settings: PayrollSettings;
  shifts: ShiftDefinition[];
  staff: Array<EngineStaff & { full_name: string; staff_code: string; department: string | null; work_branch_id: string | null }>;
  salaries: Record<string, EngineSalary>;
  attendance: Record<string, Record<string, EngineAttendance>>;  // staff → date → rec
  permissions: Record<string, Record<string, number>>;           // staff → date → minutes
  holidays: { date: string; name: string; branch_id: string | null }[];
  roster: Record<string, Record<string, string>>;                // staff → date → shift id
}

const safe = async <T,>(p: PromiseLike<{ data: T | null; error: any }>, fallback: T): Promise<T> => {
  try {
    const { data, error } = await p;
    return error || !data ? fallback : data;
  } catch {
    return fallback;
  }
};

/**
 * Loads everything the payroll engine needs for one pay cycle.
 * `monthKey` = 'YYYY-MM' of the month the cycle ends in. Pass staffIds to limit the load.
 */
export async function loadCycleData(monthKey: string, staffIds?: string[]): Promise<CycleData> {
  const settings = await fetchPayrollSettings();
  const cycle = cycleForMonth(monthKey, settings.cycle_start_day);
  const db = supabase as any;

  const limit = (q: any, col: string) => (staffIds?.length ? q.in(col, staffIds) : q);
  const staffQ = limit(db.from('staff')
    .select('id, full_name, staff_code, department, work_branch_id, monthly_cl, monthly_permission_hours, pf_applicable, esi_applicable, ot_eligible, other_deduction, default_shift_id, is_active, role')
    .eq('is_active', true)
    .neq('role', 'doctor'), 'id');
  const salaryQ = limit(db.from('staff_salary_structure')
    .select('staff_id, basic_salary, hra, conveyance, medical, other_allowances').eq('is_active', true), 'staff_id');
  const permQ = limit(db.from('leave_permission_applications')
    .select('applicant_id, permission_date, permission_duration_minutes')
    .eq('application_type', 'permission').eq('status', 'approved')
    .gte('permission_date', cycle.start).lte('permission_date', cycle.end), 'applicant_id');
  const holQ = db.from('holidays').select('holiday_date, holiday_name, branch_id, is_active')
    .gte('holiday_date', cycle.start).lte('holiday_date', cycle.end).eq('is_active', true);
  const rosterQ = limit(db.from('shift_roster').select('staff_id, roster_date, shift_id')
    .gte('roster_date', cycle.start).lte('roster_date', cycle.end), 'staff_id');
  const shiftQ = db.from('shift_definitions').select('*').order('sort_order');

  const [staff, salaryRows, permRows, holRows, rosterRows, shifts] = await Promise.all([
    safe<any[]>(staffQ, []),
    safe<any[]>(salaryQ, []),
    safe<any[]>(permQ, []),
    safe<any[]>(holQ, []),
    safe<any[]>(rosterQ, []),
    safe<any[]>(shiftQ, []),
  ]);

  // Attendance can be large → paginate
  let attRows: any[] = [];
  try {
    attRows = await fetchAllPaginated(() =>
      limit(db.from('staff_daily_activities')
        .select('staff_id, activity_date, attendance_status, shift_start_time, shift_end_time')
        .gte('activity_date', cycle.start).lte('activity_date', cycle.end)
        .order('activity_date'), 'staff_id'),
    );
  } catch {
    attRows = [];
  }

  const salaries: CycleData['salaries'] = {};
  salaryRows.forEach(s => { salaries[s.staff_id] = s; });
  const attendance: CycleData['attendance'] = {};
  attRows.forEach(a => { (attendance[a.staff_id] ||= {})[a.activity_date] = a; });
  const permissions: CycleData['permissions'] = {};
  permRows.forEach(p => {
    const m = (permissions[p.applicant_id] ||= {});
    m[p.permission_date] = (m[p.permission_date] || 0) + Number(p.permission_duration_minutes || 0);
  });
  const roster: CycleData['roster'] = {};
  rosterRows.forEach(r => { (roster[r.staff_id] ||= {})[r.roster_date] = r.shift_id; });

  return {
    cycle, settings, shifts, staff, salaries, attendance, permissions, roster,
    holidays: holRows.map(h => ({ date: h.holiday_date, name: h.holiday_name, branch_id: h.branch_id })),
  };
}

/** Runs the engine for one staff member using loaded cycle data (null if no salary structure). */
export function computeForStaff(data: CycleData, staffId: string, asOf?: string): PayrollResult | null {
  const staff = data.staff.find(s => s.id === staffId);
  const salary = data.salaries[staffId];
  if (!staff || !salary) return null;
  const holidays: Record<string, string> = {};
  data.holidays
    .filter(h => !h.branch_id || h.branch_id === staff.work_branch_id)
    .forEach(h => { holidays[h.date] = h.name; });
  return computePayroll({
    staff,
    salary,
    cycle: data.cycle,
    settings: data.settings,
    shifts: data.shifts,
    attendance: data.attendance[staffId] || {},
    permissions: data.permissions[staffId] || {},
    holidays,
    roster: data.roster[staffId] || {},
    asOf,
  });
}
