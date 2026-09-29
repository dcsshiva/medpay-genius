/**
 * HRMS payroll engine — ported from the Selvantra HRMS prototype (computeCycle).
 *
 * Per pay cycle (default 25th → 24th):
 *   per-day  = gross ÷ days in cycle,  per-minute = per-day ÷ 480
 *   Holiday / Weekly off            → no impact
 *   Leave (CL) / unplanned absence  → uses CL balance, else 1 day loss of pay (LOP)
 *   Half day                        → 0.5 CL, else 0.5 day LOP
 *   Late arrival (vs effective shift):
 *       ≤ grace                              → forgiven
 *       ≤ grace + extra-late band (N×/cycle) → forgiven, uses one extra-late allowance
 *       otherwise the FULL late time → permission balance first, rest deducted per minute
 *   Every 8 h (configurable) of uncovered lateness → offset by 1 CL, else 1 day LOP
 *   Approved permission on a day covers lateness that day and uses the permission balance
 *   OT (OT-eligible staff): minutes after shift end beyond the OT grace × multiplier
 * Statutory: PF (on basic or gross), ESI (≤ ceiling, or forced per staff), PT slab, other deduction.
 *
 * Shift resolution order: Shift Planner roster → staff default shift → detection window / nearest.
 */
import { ShiftDefinition, resolveShift, toMinutes, hhmm } from '@/lib/attendanceShifts';
import { PayrollSettings, PayCycle, parseISO } from './payCycle';

export interface EngineStaff {
  id: string;
  monthly_cl?: number | string | null;
  monthly_permission_hours?: number | string | null;
  pf_applicable?: boolean | null;
  esi_applicable?: boolean | null;
  ot_eligible?: boolean | null;
  other_deduction?: number | string | null;
  default_shift_id?: string | null;
}

export interface EngineSalary {
  basic_salary: number;
  hra: number;
  conveyance: number;
  medical: number;
  other_allowances: number;
}

export interface EngineAttendance {
  attendance_status: string;
  shift_start_time: string | null;  // punch IN
  shift_end_time: string | null;    // punch OUT
}

export interface EngineInput {
  staff: EngineStaff;
  salary: EngineSalary;
  cycle: PayCycle;
  settings: PayrollSettings;
  shifts: ShiftDefinition[];
  attendance: Record<string, EngineAttendance>;   // by ISO date
  permissions: Record<string, number>;            // approved permission minutes by ISO date
  holidays: Record<string, string>;               // ISO date → holiday name
  roster: Record<string, string>;                 // ISO date → shift_definitions.id
  /** dates after this are "not yet worked" (no impact). Defaults to today. */
  asOf?: string;
}

export type DayCode = 'P' | 'L' | 'A' | 'CL' | 'HD' | 'H' | 'WO' | 'NR' | '-';

export interface LedgerRow {
  date: string;
  code: DayCode;
  status: string;
  shift: string | null;
  shiftOverridden: boolean;
  inTime: string | null;
  outTime: string | null;
  lateMin: number;
  permUsed: number;
  otMin: number;
  deduction: number;
  lopDays: number;
  clUsed: number;
  note: string;
  permissionRemaining: number;
  clRemaining: number;
  runningDeduction: number;
}

export interface PayrollResult {
  rows: LedgerRow[];
  cycleDays: number;
  perDay: number;
  perMinute: number;
  gross: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  lopDays: number;
  clQuota: number;
  clUsed: number;
  clRemaining: number;
  permissionQuota: number;
  permissionUsed: number;
  permissionRemaining: number;
  lateMinutes: number;
  lopDeduction: number;       // full / half days not covered by CL
  lateDeduction: number;      // per-minute lateness + consolidated-lateness LOP
  otMinutes: number;
  otPay: number;
  pf: number;
  esi: number;
  pt: number;
  otherDeduction: number;
  statutory: number;
  attendanceDeduction: number;
  totalDeductions: number;
  net: number;
}

const n = (v: any, d = 0) => {
  const x = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(x) ? Number(x) : d;
};
const r2 = (x: number) => Math.round(x * 100) / 100;

/** minutes from a to b going forward around the clock (0…1439) */
const forward = (a: number, b: number) => (b - a + 1440) % 1440;

export function computePayroll(input: EngineInput): PayrollResult {
  const { staff, salary, cycle, settings, shifts, attendance, permissions, holidays, roster } = input;
  const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);
  const shiftById = new Map(shifts.map(s => [s.id, s]));

  const gross = n(salary.basic_salary) + n(salary.hra) + n(salary.conveyance) + n(salary.medical) + n(salary.other_allowances);
  const cycleDays = cycle.dates.length || 30;
  const perDay = gross / cycleDays;
  const perMinute = perDay / 480;

  const clQuota = n(staff.monthly_cl, 1);
  const permissionQuota = Math.round(n(staff.monthly_permission_hours, 4) * 60);
  let clRemaining = clQuota;
  let permissionRemaining = permissionQuota;
  let cumulativeUncovered = 0;
  let totalDeduction = 0;
  let lopDeduction = 0;
  let lateDeduction = 0;
  let lopDays = 0;
  let presentDays = 0, lateDays = 0, absentDays = 0, lateMinutes = 0, otMinutes = 0;
  const extraLateUsed: Record<string, number> = {};
  const consolidated = n(settings.consolidated_late_minutes, 480) || 480;
  const rows: LedgerRow[] = [];

  const takeCL = (days: number): number => {
    const used = Math.min(days, clRemaining);
    clRemaining = r2(clRemaining - used);
    return used;
  };

  for (const date of cycle.dates) {
    const rec = attendance[date];
    const row: LedgerRow = {
      date, code: '-', status: rec?.attendance_status || '', shift: null, shiftOverridden: false,
      inTime: hhmm(rec?.shift_start_time) , outTime: hhmm(rec?.shift_end_time),
      lateMin: 0, permUsed: 0, otMin: 0, deduction: 0, lopDays: 0, clUsed: 0, note: '',
      permissionRemaining: 0, clRemaining: 0, runningDeduction: 0,
    };
    const weekday = parseISO(date).getDay();
    const status = rec?.attendance_status;
    const permToday = n(permissions[date]);

    if (holidays[date] || status === 'holiday') {
      row.code = 'H';
      row.note = holidays[date] ? `Holiday — ${holidays[date]}` : 'Holiday';
    } else if (status === 'weekly_off' || (!rec && settings.weekly_off_day !== null && weekday === settings.weekly_off_day)) {
      row.code = 'WO';
      row.note = 'Weekly off';
    } else if (!rec && date > asOf) {
      row.code = '-';
      row.note = 'Not yet worked';
    } else if (!rec || status === 'absent' || status === 'leave') {
      const isPlanned = status === 'leave';
      if (!rec) row.code = 'NR'; else row.code = isPlanned ? 'CL' : 'A';
      if (!isPlanned) absentDays++;
      const used = takeCL(1);
      row.clUsed = used;
      const unpaid = 1 - used;
      if (unpaid > 0) {
        row.lopDays = unpaid;
        row.deduction = perDay * unpaid;
        lopDays += unpaid;
        lopDeduction += row.deduction;
        totalDeduction += row.deduction;
      }
      const what = !rec ? 'No attendance record' : isPlanned ? 'Leave' : 'Unplanned absence';
      row.note = used >= 1 ? `${what} — covered by CL` : used > 0 ? `${what} — ${used} CL + ${unpaid} day loss of pay` : `${what} — loss of pay (CL exhausted)`;
    } else if (status === 'half_day') {
      row.code = 'HD';
      presentDays += 0.5;
      const used = takeCL(0.5);
      row.clUsed = used;
      const unpaid = 0.5 - used;
      if (unpaid > 0) {
        row.lopDays = unpaid;
        row.deduction = perDay * unpaid;
        lopDays += unpaid;
        lopDeduction += row.deduction;
        totalDeduction += row.deduction;
        row.note = 'Half day — 0.5 day loss of pay (CL exhausted)';
      } else {
        row.note = 'Half day — 0.5 CL used';
      }
    } else {
      // present / late → evaluate against the effective shift
      presentDays++;
      const inMin = toMinutes(rec.shift_start_time);
      let shift: ShiftDefinition | undefined;
      if (roster[date] && shiftById.get(roster[date])) {
        shift = shiftById.get(roster[date]);
        row.shiftOverridden = true;
      } else if (staff.default_shift_id && shiftById.get(staff.default_shift_id)) {
        shift = shiftById.get(staff.default_shift_id);
      } else if (rec.shift_start_time) {
        const resolved = resolveShift(rec.shift_start_time, shifts);
        shift = shifts.find(s => s.shift_name === resolved.shiftName);
      }

      if (!shift || inMin === null) {
        row.code = 'P';
        row.shift = shift?.shift_name ?? null;
        row.note = inMin === null ? 'Present (no punch time — lateness not checked)' : 'Present (no shift configured)';
      } else {
        row.shift = shift.shift_code ? `${shift.shift_code} ${shift.shift_name}` : shift.shift_name;
        const start = toMinutes(shift.start_time) ?? 0;
        const after = forward(start, inMin);
        const late = after > 720 ? 0 : after; // punches well before start are early, not late
        row.lateMin = late;
        row.code = late > 0 ? 'L' : 'P';
        const grace = n(shift.grace_minutes, 15);
        const band = n(shift.extra_late_minutes, 0);
        const cap = n(shift.extra_late_max_per_month, 0);
        extraLateUsed[shift.id] = extraLateUsed[shift.id] || 0;

        // approved permission for this day: uses the pool and covers lateness first
        let coveredByApproved = 0;
        if (permToday > 0) {
          const fromPool = Math.min(permToday, permissionRemaining);
          permissionRemaining -= fromPool;
          row.permUsed += fromPool;
          coveredByApproved = Math.min(late, permToday);
        }
        const effectiveLate = Math.max(0, late - coveredByApproved);

        if (late === 0) {
          row.note = permToday ? `On time · ${permToday}m approved permission` : 'On time';
        } else if (effectiveLate === 0) {
          row.note = `${late}m late — covered by approved permission`;
        } else if (late <= grace) {
          row.note = `${late}m late — within ${grace}m grace, no impact`;
        } else if (late <= grace + band && extraLateUsed[shift.id] < cap) {
          extraLateUsed[shift.id]++;
          row.note = `${late}m late — extra-late allowance used (${extraLateUsed[shift.id]}/${cap})`;
        } else {
          lateDays++;
          lateMinutes += effectiveLate;
          const fromPerm = Math.min(effectiveLate, permissionRemaining);
          permissionRemaining -= fromPerm;
          row.permUsed += fromPerm;
          const uncovered = effectiveLate - fromPerm;
          if (uncovered > 0) {
            const ded = uncovered * perMinute;
            row.deduction += ded;
            lateDeduction += ded;
            totalDeduction += ded;
            row.note = fromPerm > 0
              ? `${fromPerm}m from permission, ${uncovered}m deducted`
              : `${uncovered}m late deducted (permission balance empty)`;
            cumulativeUncovered += uncovered;
            while (cumulativeUncovered >= consolidated) {
              cumulativeUncovered -= consolidated;
              if (clRemaining >= 1) {
                // the day is covered by CL instead: refund the per-minute amount for one full day
                clRemaining = r2(clRemaining - 1);
                row.clUsed += 1;
                row.deduction -= perDay;
                lateDeduction -= perDay;
                totalDeduction -= perDay;
                row.note += ` · ${consolidated / 60}h total lateness offset with 1 CL`;
              } else {
                row.lopDays += 1;
                lopDays += 1;
                row.note += ` · ${consolidated / 60}h total lateness = 1 day loss of pay`;
              }
            }
          } else {
            row.note = `${effectiveLate}m late — fully covered by permission balance`;
          }
        }

        // Overtime
        if (staff.ot_eligible && settings.ot_enabled && rec.shift_end_time) {
          const end = toMinutes(shift.end_time);
          const outMin = toMinutes(rec.shift_end_time);
          if (end !== null && outMin !== null) {
            const over = forward(end, outMin);
            const ot = over > 720 ? 0 : over - n(settings.ot_grace_minutes, 0);
            if (ot > 0) {
              row.otMin = ot;
              otMinutes += ot;
              row.note += ` · OT ${ot}m`;
            }
          }
        }
      }
    }

    row.deduction = r2(row.deduction);
    row.permissionRemaining = permissionRemaining;
    row.clRemaining = clRemaining;
    row.runningDeduction = r2(totalDeduction);
    rows.push(row);
  }

  // Statutory
  const pfBase = settings.pf_on_basic ? n(salary.basic_salary) : gross;
  const pf = settings.pf_enabled && (staff.pf_applicable ?? true) ? pfBase * n(settings.pf_rate) / 100 : 0;
  const esiApplies = settings.esi_enabled && (
    staff.esi_applicable === true || (staff.esi_applicable !== false && gross <= n(settings.esi_ceiling))
  );
  const esi = esiApplies ? gross * n(settings.esi_rate) / 100 : 0;
  const slab = settings.pt_enabled ? (settings.pt_slabs || []).find(s => gross <= n(s.upto)) : undefined;
  const pt = slab ? n(slab.amount) : 0;
  const otherDeduction = n(staff.other_deduction);
  const statutory = pf + esi + pt + otherDeduction;
  const otPay = settings.ot_enabled ? (otMinutes / 60) * (perDay / 8) * n(settings.ot_multiplier, 1.5) : 0;
  const attendanceDeduction = Math.min(totalDeduction, gross);
  const totalDeductions = attendanceDeduction + statutory;
  const net = Math.max(0, gross - totalDeductions + otPay);

  return {
    rows,
    cycleDays,
    perDay: r2(perDay),
    perMinute: r2(perMinute),
    gross: r2(gross),
    presentDays,
    lateDays,
    absentDays,
    lopDays: r2(lopDays),
    clQuota,
    clUsed: r2(clQuota - clRemaining),
    clRemaining,
    permissionQuota,
    permissionUsed: permissionQuota - permissionRemaining,
    permissionRemaining,
    lateMinutes,
    lopDeduction: r2(lopDeduction),
    lateDeduction: r2(Math.max(0, lateDeduction)),
    otMinutes,
    otPay: r2(otPay),
    pf: r2(pf),
    esi: r2(esi),
    pt: r2(pt),
    otherDeduction: r2(otherDeduction),
    statutory: r2(statutory),
    attendanceDeduction: r2(attendanceDeduction),
    totalDeductions: r2(totalDeductions),
    net: r2(net),
  };
}
