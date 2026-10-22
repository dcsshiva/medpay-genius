// Pure payslip helpers shared by the payroll calculation and the Unit 1 payslip.

const n = (v) => { const x = typeof v === 'string' ? parseFloat(v) : v; return Number.isFinite(x) ? Number(x) : 0; };
const r2 = (v) => Math.round(v * 100) / 100;

/** Standard earnings lines for a staff member. Empty structure → whole salary shown as Basic. */
export function earningsLines(emp) {
  const list = (Array.isArray(emp?.earnings) ? emp.earnings : [])
    .map(e => ({ label: String(e.label || '').trim(), amount: n(e.amount) }))
    .filter(e => e.label && e.amount > 0);
  if (list.length) return list;
  return [{ label: 'BASIC', amount: n(emp?.netSalary) }];
}

export function earningsTotal(emp) {
  return r2(earningsLines(emp).reduce((s, e) => s + e.amount, 0));
}

/** PF is worked out on Basic (the whole salary when no breakdown is set). */
export function pfBase(emp) {
  const basic = earningsLines(emp).find(e => /^basic$/i.test(e.label));
  return basic ? basic.amount : earningsTotal(emp);
}

/** One-off deductions an admin added for this pay cycle only. */
export function cycleAdjustments(emp, cycleKey) {
  const all = emp?.cycleAdjustments && typeof emp.cycleAdjustments === 'object' ? emp.cycleAdjustments : {};
  return (Array.isArray(all[cycleKey]) ? all[cycleKey] : [])
    .map(a => ({ label: String(a.label || 'Other').trim() || 'Other', amount: n(a.amount), note: a.note || '' }))
    .filter(a => a.amount > 0);
}

/** Employee + employer statutory amounts for a gross salary. */
export function statutory(emp, settings) {
  const gross = earningsTotal(emp);
  const pfOn = !!(settings?.pf?.enabled && emp?.pfApplicable);
  const esiOn = !!(settings?.esi?.enabled && emp?.esiApplicable && gross <= n(settings?.esi?.ceiling));
  const pf = pfOn ? r2(pfBase(emp) * n(settings.pf.rate) / 100) : 0;
  const esi = esiOn ? r2(gross * n(settings.esi.rate) / 100) : 0;
  const employerPf = pfOn ? r2(pfBase(emp) * n(settings.pf.employerRate ?? settings.pf.rate) / 100) : 0;
  const employerEsi = esiOn ? r2(gross * n(settings.esi.employerRate ?? 3.25) / 100) : 0;
  return { gross, pf, esi, employerPf, employerEsi };
}

/** Everything printed on the payslip, from a staff record and its cycle summary. */
export function buildPayslip({ emp, summary, settings, rows }) {
  const s = summary || {};
  const earnings = (Array.isArray(s.earnings) && s.earnings.length ? s.earnings : earningsLines(emp)).map(e => ({ ...e }));
  if (n(s.otPay) > 0.5) earnings.push({ label: 'OVERTIME', amount: r2(n(s.otPay)) });
  const adj = Array.isArray(s.adjustments) ? s.adjustments : [];
  const adjTotal = adj.reduce((t, a) => t + n(a.amount), 0);
  const deductions = [
    { label: 'EPF', amount: r2(n(s.pfDeduction)) },
    { label: 'ESI', amount: r2(n(s.esiDeduction)) },
    ...(n(s.ptDeduction) > 0 ? [{ label: 'PROFESSIONAL TAX', amount: r2(n(s.ptDeduction)) }] : []),
    { label: 'TDS', amount: r2(n(s.tdsDeduction)) },
    { label: 'OTHERS', amount: r2(n(s.otherDeduction) - adjTotal) },
    ...adj.map(a => ({ label: String(a.label).toUpperCase(), amount: r2(n(a.amount)) })),
    ...(n(s.totalDeduction) > 0.5 ? [{ label: 'LOP / LATE', amount: r2(n(s.totalDeduction)) }] : []),
  ];
  const earningsSum = r2(earnings.reduce((t, e) => t + e.amount, 0));
  const deductionsSum = r2(deductions.reduce((t, d) => t + d.amount, 0));
  const st = statutory(emp, settings);
  const employerPf = s.employerPf ?? st.employerPf;
  const employerEsi = s.employerEsi ?? st.employerEsi;
  const list = Array.isArray(rows) ? rows : [];
  const workingDays = Math.max(0, list.length - n(s.woDays) - n(s.holidayDays));
  return {
    earnings, deductions, earningsSum, deductionsSum,
    net: r2(earningsSum - deductionsSum),
    employerPf: r2(n(employerPf)), employerEsi: r2(n(employerEsi)),
    ctc: r2(n(s.grossPay ?? st.gross) + n(employerPf) + n(employerEsi)),
    workingDays, lopDays: n(s.absentDays),
  };
}
