import { supabase } from '@/integrations/supabase/client';
import type { HrCycle, HrData, HrWho } from './types';
import { manageLogin } from './auth';

/**
 * Live data layer for the ported prototype.
 *
 * The prototype keeps plain in-memory collections (STAFF, ATTENDANCE, TASKS …) and
 * mutates them directly. We load those collections from Supabase, and after every
 * interaction compare them with the last saved snapshot and write only what changed.
 * The collections are mutated in place so the prototype's references stay valid.
 */

const db = supabase as any;
const nz = (v: any) => (v === '' || v === undefined ? null : v);
const num = (v: any, d = 0) => { const x = typeof v === 'string' ? parseFloat(v) : v; return Number.isFinite(x) ? Number(x) : d; };
const time = (v: any) => (v ? String(v).slice(0, 5) : undefined);

export const DEFAULT_PAYROLL_SETTINGS = {
  cycleStartDay: 25,
  pf: { enabled: true, rate: 12 },
  esi: { enabled: true, rate: 0.75, ceiling: 21000 },
  pt: { enabled: true, slabs: [
    { upto: 21000, amount: 0 }, { upto: 30000, amount: 135 }, { upto: 45000, amount: 315 },
    { upto: 60000, amount: 690 }, { upto: 75000, amount: 1025 }, { upto: 99999999, amount: 1250 },
  ] },
  ot: { enabled: true, multiplier: 1.5, graceMin: 15 },
};

// ─────────────── DB row ⇄ prototype object ───────────────
const staffFromRow = (r: any) => ({
  empNo: r.emp_no, name: r.name, designation: r.designation_code ?? '', department: r.department_code ?? '',
  netSalary: num(r.net_salary), username: r.emp_no, active: r.active !== false,
  shiftCode: r.shift_code ?? '', monthlyCL: num(r.monthly_cl, 1), monthlyPermissionHours: num(r.monthly_permission_hours, 4),
  unitCode: r.unit_code ?? '', dbRef: r.db_ref ?? '', unitHistory: Array.isArray(r.unit_history) ? r.unit_history : [],
  role: r.role || 'Staff', pfApplicable: r.pf_applicable ?? true, esiApplicable: r.esi_applicable ?? false,
  otEligible: r.ot_eligible ?? false, otherDeduction: num(r.other_deduction), phone: r.phone ?? '', email: r.email ?? '',
  dob: r.dob ?? '', doj: r.doj ?? '', address: r.address ?? '', reportingManager: r.reporting_manager ?? '',
  bankAccountName: r.bank_account_name ?? '', bankAccountNo: r.bank_account_no ?? '', bankIfsc: r.bank_ifsc ?? '', bankName: r.bank_name ?? '',
});
const staffToRow = (s: any) => ({
  emp_no: s.empNo, db_ref: nz(s.dbRef), name: s.name, role: s.role || 'Staff', reporting_manager: s.reportingManager || '',
  designation_code: nz(s.designation), department_code: nz(s.department), unit_code: nz(s.unitCode), shift_code: nz(s.shiftCode),
  net_salary: num(s.netSalary), monthly_cl: num(s.monthlyCL, 1), monthly_permission_hours: num(s.monthlyPermissionHours, 4),
  pf_applicable: !!s.pfApplicable, esi_applicable: !!s.esiApplicable, ot_eligible: !!s.otEligible,
  other_deduction: num(s.otherDeduction), phone: s.phone || '', email: s.email || '', dob: nz(s.dob), doj: nz(s.doj),
  address: s.address || '', unit_history: s.unitHistory || [], active: true, updated_at: new Date().toISOString(),
  bank_account_name: s.bankAccountName || '', bank_account_no: s.bankAccountNo || '', bank_ifsc: s.bankIfsc || '', bank_name: s.bankName || '',
});
const attToRow = (empNo: string, r: any) => ({
  emp_no: empNo, date: r.date, status: r.status, in_time: nz(r.in), out_time: nz(r.out), perm_min: r.permMin ?? null,
});
const taskFromRow = (r: any) => {
  const t: any = {
    id: r.id, title: r.title, description: r.description || '', assignedTo: r.assigned_to, assignedBy: r.assigned_by,
    createdDate: r.created_date || '', dueDate: r.due_date || '', priority: r.priority, status: r.status,
    reviewNote: r.review_note || '', employeeResponseNote: r.employee_response_note || '', completionNote: r.completion_note || '',
    completionDate: r.completion_date || '', templateId: r.template_id ?? null,
  };
  if (r.reviewed_by) t.reviewedBy = r.reviewed_by;
  if (r.reviewed_on) t.reviewedOn = r.reviewed_on;
  return t;
};
const taskToRow = (t: any) => ({
  title: t.title, description: t.description || '', assigned_to: t.assignedTo, assigned_by: t.assignedBy,
  created_date: nz(t.createdDate), due_date: nz(t.dueDate), priority: t.priority || 'Medium', status: t.status,
  employee_response_note: t.employeeResponseNote || '', completion_note: t.completionNote || '', completion_date: nz(t.completionDate),
  review_note: t.reviewNote || '', reviewed_by: nz(t.reviewedBy), reviewed_on: nz(t.reviewedOn), template_id: nz(t.templateId),
});
const leaveFromRow = (r: any) => {
  const l: any = {
    id: r.id, empNo: r.emp_no, type: r.type, appliedOn: r.applied_on || '', date: r.date, reason: r.reason || '',
    status: r.status, reportingManager: r.reporting_manager || '', altEmpNo: r.alt_emp_no || '',
  };
  if (r.hours != null) l.hours = r.hours;
  if (r.decided_by) l.decidedBy = r.decided_by;
  if (r.decided_on) l.decidedOn = r.decided_on;
  return l;
};
const leaveToRow = (l: any) => ({
  emp_no: l.empNo, type: l.type, applied_on: nz(l.appliedOn), date: l.date, hours: l.hours ?? null, reason: l.reason || '',
  status: l.status, reporting_manager: l.reportingManager || '', alt_emp_no: l.altEmpNo || '',
  decided_by: nz(l.decidedBy), decided_on: nz(l.decidedOn),
});
const shiftFromRow = (r: any) => ({
  code: r.code, letter: r.letter, name: r.name, start: time(r.start_time), end: time(r.end_time),
  allowedLateMin: num(r.allowed_late_min, 15), allowedExtraLateMin: num(r.allowed_extra_late_min, 15),
  extraLateMaxPerMonth: num(r.extra_late_max_per_month, 3),
});
const shiftToRow = (s: any, i: number) => ({
  code: s.code, name: s.name, letter: s.letter || '', start_time: s.start, end_time: s.end,
  allowed_late_min: num(s.allowedLateMin), allowed_extra_late_min: num(s.allowedExtraLateMin),
  extra_late_max_per_month: num(s.extraLateMaxPerMonth), sort_order: i,
});

// ─────────────── collections that get synced ───────────────
type Entry = { key: string; row: any; obj?: any };
interface Collection {
  name: string;
  table: string;
  pk: string[];
  entries(d: HrData): Entry[];
  /** 'upsert' for tables the editor may insert into; 'rows' for per-row insert/update (tasks, leave) */
  mode: 'upsert' | 'rows';
  softDelete?: boolean;
}

const COLLECTIONS: Collection[] = [
  { name: 'units', table: 'hr_units', pk: ['code'], mode: 'upsert',
    entries: d => d.UNITS.map((u, i) => ({ key: u.code, row: { code: u.code, name: u.name, sort_order: i } })) },
  { name: 'departments', table: 'hr_departments', pk: ['code'], mode: 'upsert',
    entries: d => d.DEPARTMENTS.map((u, i) => ({ key: u.code, row: { code: u.code, name: u.name, sort_order: i } })) },
  { name: 'designations', table: 'hr_designations', pk: ['code'], mode: 'upsert',
    entries: d => d.DESIGNATIONS.map((u, i) => ({ key: u.code, row: { code: u.code, name: u.name, sort_order: i } })) },
  { name: 'shifts', table: 'hr_shifts', pk: ['code'], mode: 'upsert',
    entries: d => d.SHIFT_MASTER.map((s, i) => ({ key: s.code, row: shiftToRow(s, i) })) },
  { name: 'settings', table: 'hr_settings', pk: ['id'], mode: 'upsert',
    entries: d => [{ key: '1', row: { id: 1, payroll: d.PAYROLL_SETTINGS } }] },
  { name: 'holidays', table: 'hr_holidays', pk: ['date'], mode: 'upsert',
    entries: d => d.HOLIDAYS.map(h => ({ key: h.date, row: { date: h.date, name: h.name } })) },
  { name: 'templates', table: 'hr_task_templates', pk: ['id'], mode: 'upsert',
    entries: d => d.TASK_TEMPLATES.map((t, i) => ({ key: t.id, row: { id: t.id, title: t.title, description: t.description || '', sort_order: i } })) },
  { name: 'staff', table: 'hr_staff', pk: ['emp_no'], mode: 'upsert', softDelete: true,
    entries: d => d.STAFF.map(s => ({ key: s.empNo, row: staffToRow(s), obj: s })) },
  { name: 'attendance', table: 'hr_attendance', pk: ['emp_no', 'date'], mode: 'upsert',
    entries: d => Object.entries(d.ATTENDANCE).flatMap(([emp, a]) => a.records.map(r => ({ key: emp + '|' + r.date, row: attToRow(emp, r) }))) },
  { name: 'roster', table: 'hr_roster', pk: ['emp_no', 'date'], mode: 'upsert',
    entries: d => Object.entries(d.ROSTER).map(([k, code]) => { const [emp, date] = k.split('|'); return { key: k, row: { emp_no: emp, date, shift_code: code } }; }) },
  { name: 'tasks', table: 'hr_tasks', pk: ['id'], mode: 'rows',
    entries: d => d.TASKS.map(t => ({ key: t.id, row: taskToRow(t), obj: t })) },
  { name: 'leaves', table: 'hr_leaves', pk: ['id'], mode: 'rows',
    entries: d => d.LEAVES.map(l => ({ key: l.id, row: leaveToRow(l), obj: l })) },
];

// fields that change on every serialisation and must not count as edits
const comparable = (row: any) => { const { updated_at, ...rest } = row; return JSON.stringify(rest); };
const TEMP = '~new-';

async function fetchAll(build: () => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function createStore() {
  const data: HrData = {
    STAFF: [], ATTENDANCE: {}, TASKS: [], LEAVES: [], UNITS: [], DEPARTMENTS: [], DESIGNATIONS: [],
    SHIFT_MASTER: [], PAYROLL_SETTINGS: JSON.parse(JSON.stringify(DEFAULT_PAYROLL_SETTINGS)),
    HOLIDAYS: [], TASK_TEMPLATES: [], ROSTER: {},
    PAYROLL: { run: null, payslips: {} },
  };
  const snapshot: Record<string, Map<string, string>> = {};
  let who: HrWho | null = null;
  let tempSeq = 0;
  let syncing = false;
  let again = false;
  const loginsPending = new Map<string, string>(); // new staff → first password

  const replaceArray = (arr: any[], items: any[]) => { arr.splice(0, arr.length, ...items); };
  const replaceObject = (obj: Record<string, any>, next: Record<string, any>) => {
    Object.keys(obj).forEach(k => delete obj[k]);
    Object.assign(obj, next);
  };
  const takeSnapshot = (only?: string[]) => {
    for (const c of COLLECTIONS) {
      if (only && !only.includes(c.name)) continue;
      snapshot[c.name] = new Map(c.entries(data).filter(e => !e.key.startsWith(TEMP)).map(e => [e.key, comparable(e.row)]));
    }
  };

  function clear() {
    who = null;
    replaceArray(data.STAFF, []); replaceObject(data.ATTENDANCE, {}); replaceArray(data.TASKS, []); replaceArray(data.LEAVES, []);
    replaceArray(data.UNITS, []); replaceArray(data.DEPARTMENTS, []); replaceArray(data.DESIGNATIONS, []);
    replaceArray(data.SHIFT_MASTER, []); replaceArray(data.HOLIDAYS, []); replaceArray(data.TASK_TEMPLATES, []);
    replaceObject(data.ROSTER, {}); replaceObject(data.PAYROLL_SETTINGS, JSON.parse(JSON.stringify(DEFAULT_PAYROLL_SETTINGS)));
    data.PAYROLL.run = null; replaceObject(data.PAYROLL.payslips, {});
    takeSnapshot();
  }

  async function loadSettings() {
    const { data: row } = await db.from('hr_settings').select('payroll').eq('id', 1).maybeSingle();
    const merged = { ...JSON.parse(JSON.stringify(DEFAULT_PAYROLL_SETTINGS)), ...(row?.payroll || {}) };
    replaceObject(data.PAYROLL_SETTINGS, merged);
    return merged;
  }

  async function loadCycleRows(cycle: HrCycle) {
    const [att, roster] = await Promise.all([
      fetchAll(() => db.from('hr_attendance').select('*').gte('date', cycle.start).lte('date', cycle.end).order('emp_no').order('date')),
      fetchAll(() => db.from('hr_roster').select('*').gte('date', cycle.start).lte('date', cycle.end).order('emp_no').order('date')),
    ]);
    const attendance: HrData['ATTENDANCE'] = {};
    for (const s of data.STAFF) attendance[s.empNo] = { primaryShift: s.shiftCode || null, records: [] };
    for (const r of att) {
      const rec: any = { date: r.date, status: r.status };
      if (r.in_time) rec.in = r.in_time;
      if (r.out_time) rec.out = r.out_time;
      if (r.perm_min != null) rec.permMin = r.perm_min;
      (attendance[r.emp_no] ||= { primaryShift: null, records: [] }).records.push(rec);
    }
    replaceObject(data.ATTENDANCE, attendance);
    const ros: Record<string, string> = {};
    roster.forEach(r => { ros[r.emp_no + '|' + r.date] = r.shift_code; });
    replaceObject(data.ROSTER, ros);
    takeSnapshot(['attendance', 'roster']);
    await loadPayroll(cycle);
  }

  // ─────────────── Phase 2: finalized (locked) pay cycles ───────────────
  async function loadPayroll(cycle: HrCycle) {
    const [{ data: run }, slips] = await Promise.all([
      db.from('hr_payroll_runs').select('*').eq('cycle_key', cycle.key).maybeSingle(),
      fetchAll(() => db.from('hr_payslips').select('emp_no, summary, rows').eq('cycle_key', cycle.key).order('emp_no')),
    ]).catch(() => [{ data: null }, []] as any);
    data.PAYROLL.run = run || null;
    const map: Record<string, any> = {};
    if (run) (slips || []).forEach((p: any) => { map[p.emp_no] = { summary: p.summary, rows: p.rows }; });
    replaceObject(data.PAYROLL.payslips, map);
  }

  /** Freezes every staff member's cycle result. `results` = [{emp, summary, rows}] computed live. */
  async function finalizeCycle(cycle: HrCycle, results: any[], byName: string) {
    const gross = results.reduce((s, r) => s + num(r.summary.grossPay), 0);
    const net = results.reduce((s, r) => s + num(r.summary.finalNet), 0);
    const { error: runErr } = await db.from('hr_payroll_runs').upsert({
      cycle_key: cycle.key, cycle_start: cycle.start, cycle_end: cycle.end, label: cycle.label,
      finalized_at: new Date().toISOString(), finalized_by: byName || '', staff_count: results.length,
      gross: Math.round(gross * 100) / 100, net: Math.round(net * 100) / 100,
      settings: data.PAYROLL_SETTINGS,
    }, { onConflict: 'cycle_key' });
    if (runErr) throw runErr;
    await db.from('hr_payslips').delete().eq('cycle_key', cycle.key);
    const rows = results.map(r => ({
      cycle_key: cycle.key, emp_no: r.emp.empNo, name: r.emp.name, unit_code: r.emp.unitCode || null,
      gross: num(r.summary.grossPay), lop_deduction: num(r.summary.totalDeduction), pf: num(r.summary.pfDeduction),
      esi: num(r.summary.esiDeduction), pt: num(r.summary.ptDeduction), other_deduction: num(r.summary.otherDeduction),
      ot_pay: num(r.summary.otPay), net: num(r.summary.finalNet), present_days: r.summary.presentDays || 0,
      late_days: r.summary.lateDays || 0,
      working_days: Math.max(0, (r.rows || []).length - (r.summary.woDays || 0) - (r.summary.holidayDays || 0)),
      summary: r.summary, rows: r.rows,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await db.from('hr_payslips').insert(rows.slice(i, i + 200));
      if (error) throw error;
    }
    await loadPayroll(cycle);
  }

  async function reopenCycle(cycle: HrCycle) {
    const { error } = await db.from('hr_payroll_runs').delete().eq('cycle_key', cycle.key);
    if (error) throw error;
    await loadPayroll(cycle);
  }

  /** Month-on-month figures for the given cycles (oldest → newest). */
  async function loadTrends(cycles: HrCycle[]) {
    const keys = cycles.map(c => c.key);
    const [runs, slips] = await Promise.all([
      fetchAll(() => db.from('hr_payroll_runs').select('cycle_key, finalized_at, gross, net').in('cycle_key', keys)),
      fetchAll(() => db.from('hr_payslips').select('cycle_key, lop_deduction, pf, esi, pt, other_deduction, ot_pay, late_days').in('cycle_key', keys)),
    ]);
    const stats = await Promise.all(cycles.map(c =>
      db.rpc('hr_attendance_stats', { _start: c.start, _end: c.end }).then((r: any) => (Array.isArray(r.data) ? r.data[0] : r.data) || null)));
    return cycles.map((c, i) => {
      const run = runs.find((r: any) => r.cycle_key === c.key) || null;
      const mine = slips.filter((p: any) => p.cycle_key === c.key);
      const sum = (k: string) => mine.reduce((s: number, p: any) => s + num(p[k]), 0);
      const st = stats[i];
      const working = num(st?.working);
      return {
        cycle: c,
        finalized: !!run,
        attendancePct: working ? Math.round(num(st?.present) / working * 100) : null,
        lateDays: run ? sum('late_days') : null,
        gross: run ? num(run.gross) : null,
        lop: run ? sum('lop_deduction') : null,
        statutory: run ? sum('pf') + sum('esi') + sum('pt') + sum('other_deduction') : null,
        otPay: run ? sum('ot_pay') : null,
        net: run ? num(run.net) : null,
      };
    });
  }

  async function loadAll(user: HrWho, cycle: HrCycle) {
    who = user;
    const manages = user.role === 'admin' || user.role === 'manager';
    const [units, depts, desgs, shifts, hols, tts, tasks, leaves] = await Promise.all([
      fetchAll(() => db.from('hr_units').select('*').order('sort_order').order('code')),
      fetchAll(() => db.from('hr_departments').select('*').order('sort_order').order('code')),
      fetchAll(() => db.from('hr_designations').select('*').order('sort_order').order('code')),
      fetchAll(() => db.from('hr_shifts').select('*').order('sort_order').order('code')),
      fetchAll(() => db.from('hr_holidays').select('*').order('date')),
      fetchAll(() => db.from('hr_task_templates').select('*').order('sort_order').order('id')),
      fetchAll(() => db.from('hr_tasks').select('*').order('id')),
      fetchAll(() => db.from('hr_leaves').select('*').order('id')),
    ]);
    await loadSettings();

    let staffRows: any[];
    if (manages) {
      staffRows = await fetchAll(() => db.from('hr_staff').select('*').eq('active', true).order('db_ref'));
    } else {
      // staff see colleagues' names only; their own row in full
      const [dir, mine] = await Promise.all([
        fetchAll(() => db.from('hr_staff_directory').select('*').order('db_ref')),
        fetchAll(() => db.from('hr_staff').select('*').eq('emp_no', user.empNo || '')),
      ]);
      const own = new Map(mine.map((r: any) => [r.emp_no, r]));
      staffRows = dir.map((r: any) => own.get(r.emp_no) || r);
    }

    replaceArray(data.UNITS, units.map((u: any) => ({ code: u.code, name: u.name })));
    replaceArray(data.DEPARTMENTS, depts.map((u: any) => ({ code: u.code, name: u.name })));
    replaceArray(data.DESIGNATIONS, desgs.map((u: any) => ({ code: u.code, name: u.name })));
    replaceArray(data.SHIFT_MASTER, shifts.map(shiftFromRow));
    replaceArray(data.HOLIDAYS, hols.map((h: any) => ({ date: h.date, name: h.name })));
    replaceArray(data.TASK_TEMPLATES, tts.map((t: any) => ({ id: t.id, title: t.title, description: t.description || '' })));
    replaceArray(data.TASKS, tasks.map(taskFromRow));
    replaceArray(data.LEAVES, leaves.map(leaveFromRow));
    replaceArray(data.STAFF, staffRows.map(staffFromRow));
    takeSnapshot();
    await loadCycleRows(cycle);
  }

  function tempId(prefix: string) {
    tempSeq += 1;
    return `${TEMP}${prefix}${tempSeq}`;
  }

  /** Writes every difference between memory and the last snapshot. Returns true if ids changed. */
  async function syncOnce(): Promise<{ idsChanged: boolean }> {
    let idsChanged = false;
    const errors: string[] = [];
    for (const c of COLLECTIONS) {
      const entries = c.entries(data);
      const before = snapshot[c.name] || new Map<string, string>();
      const seen = new Set<string>();
      const changed: Entry[] = [];
      const added: Entry[] = [];
      for (const e of entries) {
        seen.add(e.key);
        if (e.key.startsWith(TEMP)) { added.push(e); continue; }
        const prev = before.get(e.key);
        if (prev === undefined) added.push(e);
        else if (prev !== comparable(e.row)) changed.push(e);
      }
      const removed = [...before.keys()].filter(k => !seen.has(k));
      if (!changed.length && !added.length && !removed.length) continue;

      try {
        if (c.mode === 'upsert') {
          const rows = [...added, ...changed].map(e => e.row);
          for (let i = 0; i < rows.length; i += 500) {
            const { error } = await db.from(c.table).upsert(rows.slice(i, i + 500), { onConflict: c.pk.join(',') });
            if (error) throw error;
          }
          for (const key of removed) {
            const parts = key.split('|');
            let q = c.softDelete
              ? db.from(c.table).update({ active: false, updated_at: new Date().toISOString() })
              : db.from(c.table).delete();
            c.pk.forEach((col, i) => { q = q.eq(col, c.pk.length > 1 ? parts[i] : key); });
            const { error } = await q;
            if (error) throw error;
          }
          if (c.name === 'staff') {
            for (const e of added) {
              const pw = e.obj?.password;
              if (pw) loginsPending.set(e.key, pw);
              if (e.obj) delete e.obj.password;
            }
          }
        } else {
          for (const e of added) {
            const { data: ins, error } = await db.from(c.table).insert(e.row).select('id').single();
            if (error) throw error;
            if (e.obj && ins?.id) { e.obj.id = ins.id; idsChanged = true; }
          }
          for (const e of changed) {
            const { error } = await db.from(c.table).update(e.row).eq('id', e.key);
            if (error) throw error;
          }
          for (const key of removed) {
            const { error } = await db.from(c.table).delete().eq('id', key);
            if (error) throw error;
          }
        }
        snapshot[c.name] = new Map(c.entries(data).filter(e => !e.key.startsWith(TEMP)).map(e => [e.key, comparable(e.row)]));
      } catch (err: any) {
        errors.push(`${c.name}: ${err?.message || err}`);
      }
    }
    // sign-in accounts for staff added in Staff Master
    for (const [empNo, pw] of [...loginsPending]) {
      const r: any = await manageLogin({ action: 'ensure', emp_no: empNo, password: pw });
      if (r?.error) errors.push(`login for ${empNo}: ${r.error}`); else loginsPending.delete(empNo);
    }
    if (errors.length) throw new Error(errors.join(' · '));
    return { idsChanged };
  }

  async function sync(): Promise<{ idsChanged: boolean }> {
    if (!who) return { idsChanged: false };
    if (syncing) { again = true; return { idsChanged: false }; }
    syncing = true;
    let idsChanged = false;
    try {
      do {
        again = false;
        const r = await syncOnce();
        idsChanged = idsChanged || r.idsChanged;
      } while (again);
    } finally {
      syncing = false;
    }
    return { idsChanged };
  }

  function hasPendingChanges(): boolean {
    return COLLECTIONS.some(c => {
      const before = snapshot[c.name] || new Map();
      const entries = c.entries(data);
      if (entries.length !== before.size) return true;
      return entries.some(e => e.key.startsWith(TEMP) || before.get(e.key) !== comparable(e.row));
    });
  }

  return {
    data, clear, loadAll, loadCycleRows, loadSettings, sync, tempId, hasPendingChanges,
    finalizeCycle, reopenCycle, loadTrends, get who() { return who; },
  };
}

export async function latestAttendanceDate(): Promise<string | null> {
  const { data } = await db.rpc('hr_latest_attendance_date');
  return data || null;
}
