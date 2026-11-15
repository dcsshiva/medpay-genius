/**
 * The employee's "Today" and "Next 7 days" on the phone home screen (pure; see staffToday.test.js).
 * A day is, in order: a declared holiday, approved leave (CL / approved leave / week off set by the
 * manager), the Shift Planner entry, or — with nothing planned — the Staff Master shift / weekly off.
 */
import { PLAN_OFF, defaultPlanCode } from './shiftPlan.js';

const pad = (n) => String(n).padStart(2, '0');
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * dayPlan(staff, date, { roster, holidays, leaves }) →
 *  { date, kind: 'holiday' | 'leave' | 'off' | 'shift' | 'none', code, planned, holiday, leaveType }
 *  planned = it comes from the Shift Planner (false = the usual Staff Master shift / weekly off)
 */
export function dayPlan(staff, date, { roster = {}, holidays = [], leaves = [] } = {}) {
  const h = holidays.find(x => x.date === date && !x.suspended);
  if (h) return { date, kind: 'holiday', holiday: h.name, planned: true };
  const l = leaves.find(x => x.empNo === staff.empNo && x.date === date && x.status === 'Approved' && x.type !== 'Permission');
  if (l && l.type !== 'WO') return { date, kind: 'leave', leaveType: l.type, planned: true };
  const key = staff.empNo + '|' + date;
  const planned = Object.prototype.hasOwnProperty.call(roster, key);
  const code = planned ? roster[key] : defaultPlanCode(staff, date);
  if (code === PLAN_OFF || (l && l.type === 'WO')) return { date, kind: 'off', code: PLAN_OFF, planned: planned || !!l };
  if (!code) return { date, kind: 'none', planned: false };
  return { date, kind: 'shift', code, planned };
}

/** the next n days after `today` */
export function upcomingDays(staff, today, n, ctx) {
  return Array.from({ length: n }, (_, i) => dayPlan(staff, addDays(today, i + 1), ctx));
}
