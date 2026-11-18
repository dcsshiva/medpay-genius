/* Late arrivals and double shifts (pure; tests in lateRule.test.js).
 *
 * Late arrivals: lateness inside the shift's grace, or covered by its monthly extra-late allowance, has no
 * effect. Any other late day not fully covered by an approved permission is a "late day". Every
 * `every`-th late day in the pay cycle (3rd, 6th, …) costs `lopDays` (½) day of pay. Minutes are not
 * deducted.
 *
 * Double shifts: a Shift Master shift with payDays 2 (e.g. MS + AS, AS + NS, NS + MS) counts as two days'
 * attendance. The day is present once, and the extra day is paid at the cycle's per-day rate.
 */
export const LATE_DEFAULTS = { every: 3, lopDays: 0.5 };

const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));

export function lateRule(settings) {
  const s = settings || {};
  const every = Math.floor(num(s.lateLopEvery));
  const lopDays = num(s.lateLopDays);
  return {
    every: every >= 1 ? every : LATE_DEFAULTS.every,
    lopDays: lopDays >= 0 ? lopDays : LATE_DEFAULTS.lopDays,
  };
}

/** one more late day: the new count and the loss of pay (days) it triggers */
export function addLateDay(count, rule) {
  const c = (count || 0) + 1;
  return { count: c, lopDays: c % rule.every === 0 ? rule.lopDays : 0 };
}

export function fmtDays(d) {
  if (d === 0.5) return '½';
  const whole = Math.floor(d), frac = d - whole;
  return frac === 0.5 ? (whole + '½') : String(Math.round(d * 100) / 100);
}

/** the text added to a late day's note */
export function lateDayNote(step, rule) {
  if (step.lopDays > 0) return 'late day ' + step.count + ' this cycle → ' + fmtDays(step.lopDays) + ' day loss of pay';
  const left = rule.every - (step.count % rule.every);
  return 'late day ' + step.count + ' this cycle (' + left + ' more = ' + fmtDays(rule.lopDays) + ' day loss of pay)';
}

/** loss of pay (days) for n late days */
export function lateLopDays(n, rule) {
  return Math.floor((n || 0) / rule.every) * rule.lopDays;
}

/** extra days of attendance a shift gives (payDays 2 → 1) */
export function extraDaysFor(shift) {
  const d = num(shift && shift.payDays);
  return d > 1 ? Math.round((d - 1) * 2) / 2 : 0;
}
