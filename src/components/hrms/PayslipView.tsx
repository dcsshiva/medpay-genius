import React from 'react';
import { formatCurrency } from '@/lib/currency';

/** Row shape from public.staff_payroll (with the HRMS columns from migration 0012). */
export interface PayslipRecord {
  id: string;
  staff_id: string;
  payroll_month: string;
  cycle_start?: string | null;
  cycle_end?: string | null;
  total_working_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  overtime_hours: number;
  basic_salary: number;
  hra: number;
  conveyance: number;
  medical: number;
  other_allowances: number;
  gross_salary: number;
  absent_deduction: number;
  late_deduction: number;
  other_deductions: number;
  total_deductions: number;
  overtime_pay: number;
  net_salary: number;
  status: string;
  notes: string | null;
  lop_days?: number;
  cl_used?: number;
  late_minutes?: number;
  permission_used_minutes?: number;
  ot_minutes?: number;
  pf_amount?: number;
  esi_amount?: number;
  pt_amount?: number;
  statutory_deductions?: number;
  ledger?: any;
  staff?: { full_name: string; staff_code: string; department: string | null };
}

const fmtD = (iso?: string | null) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export const cycleLabel = (p: PayslipRecord) =>
  p.cycle_start && p.cycle_end ? `${fmtD(p.cycle_start)} – ${fmtD(p.cycle_end)}` : p.payroll_month;

const mins = (m?: number) => {
  const v = Number(m || 0);
  if (!v) return '0m';
  const h = Math.floor(v / 60), r = v % 60;
  return h ? `${h}h${r ? ` ${r}m` : ''}` : `${r}m`;
};

const Line = ({ label, value, bold, danger }: { label: string; value: string; bold?: boolean; danger?: boolean }) => (
  <div className={`flex justify-between ${bold ? 'font-bold border-t pt-1' : ''}`}>
    <span>{label}</span>
    <span className={danger ? 'text-destructive' : ''}>{value}</span>
  </div>
);

/** HRMS payslip body (earnings, attendance, deductions, net). */
const PayslipView: React.FC<{ p: PayslipRecord }> = ({ p }) => {
  const n = (v: any) => Number(v || 0);
  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">Pay cycle</span><span className="font-medium">{cycleLabel(p)}</span></div>

      <div className="border-t pt-2 space-y-1">
        <p className="font-semibold">Earnings</p>
        <Line label="Basic Salary" value={formatCurrency(n(p.basic_salary))} />
        <Line label="HRA" value={formatCurrency(n(p.hra))} />
        <Line label="Conveyance" value={formatCurrency(n(p.conveyance))} />
        <Line label="Medical" value={formatCurrency(n(p.medical))} />
        <Line label="Other Allowances" value={formatCurrency(n(p.other_allowances))} />
        <Line label={`Overtime (${mins(p.ot_minutes)})`} value={formatCurrency(n(p.overtime_pay))} />
        <Line label="Total Earnings" value={formatCurrency(n(p.gross_salary) + n(p.overtime_pay))} bold />
      </div>

      <div className="border-t pt-2 space-y-1">
        <p className="font-semibold">Attendance</p>
        <Line label="Days in cycle" value={String(p.total_working_days)} />
        <Line label="Present days" value={String(p.present_days)} />
        <Line label="CL used" value={String(n(p.cl_used))} />
        <Line label="Loss-of-pay days" value={String(n(p.lop_days))} />
        <Line label="Late (charged)" value={`${p.late_days} day(s) · ${mins(p.late_minutes)}`} />
        <Line label="Permission used" value={mins(p.permission_used_minutes)} />
      </div>

      <div className="border-t pt-2 space-y-1">
        <p className="font-semibold">Deductions</p>
        <Line label="Loss of pay (absence)" value={formatCurrency(n(p.absent_deduction))} />
        <Line label="Lateness" value={formatCurrency(n(p.late_deduction))} />
        <Line label="Provident Fund (PF)" value={formatCurrency(n(p.pf_amount))} />
        <Line label="ESI" value={formatCurrency(n(p.esi_amount))} />
        <Line label="Professional Tax" value={formatCurrency(n(p.pt_amount))} />
        <Line label="Other deduction" value={formatCurrency(n(p.other_deductions))} />
        <Line label="Total Deductions" value={formatCurrency(n(p.total_deductions))} bold danger />
      </div>

      <div className="border-t pt-2 flex justify-between text-lg font-bold">
        <span>Net Pay</span><span className="text-primary">{formatCurrency(n(p.net_salary))}</span>
      </div>
    </div>
  );
};

/** Opens a clean printable payslip in a new window. */
export function printPayslip(p: PayslipRecord, orgName = 'Payslip') {
  const n = (v: any) => Number(v || 0);
  const esc = (v: any) => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
  const c = (v: number) => formatCurrency(v);
  const row = (a: string, b: string) => `<tr><td>${a}</td><td class="r">${b}</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${esc(p.staff?.staff_code)} ${esc(p.payroll_month)}</title>
<style>
 body{font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#111;margin:32px;font-size:13px}
 h1{font-size:18px;margin:0} .muted{color:#666} table{width:100%;border-collapse:collapse;margin-top:6px}
 td{padding:4px 0;border-bottom:1px solid #eee} .r{text-align:right} h3{font-size:13px;margin:16px 0 0}
 .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px} .net{font-size:16px;font-weight:700;margin-top:16px;display:flex;justify-content:space-between;border-top:2px solid #111;padding-top:8px}
</style></head><body>
<h1>${esc(orgName)}</h1>
<div class="muted">Payslip · ${cycleLabel(p)}</div>
<p><b>${esc(p.staff?.full_name)}</b> (${esc(p.staff?.staff_code)})${p.staff?.department ? ' · ' + esc(p.staff.department) : ''}</p>
<div class="grid"><div>
<h3>Earnings</h3><table>
${row('Basic Salary', c(n(p.basic_salary)))}${row('HRA', c(n(p.hra)))}${row('Conveyance', c(n(p.conveyance)))}
${row('Medical', c(n(p.medical)))}${row('Other Allowances', c(n(p.other_allowances)))}${row('Overtime', c(n(p.overtime_pay)))}
${row('<b>Total Earnings</b>', '<b>' + c(n(p.gross_salary) + n(p.overtime_pay)) + '</b>')}
</table>
<h3>Attendance</h3><table>
${row('Days in cycle', String(p.total_working_days))}${row('Present days', String(p.present_days))}
${row('CL used', String(n(p.cl_used)))}${row('Loss-of-pay days', String(n(p.lop_days)))}
${row('Late minutes charged', String(n(p.late_minutes)))}${row('Permission used (min)', String(n(p.permission_used_minutes)))}
</table></div><div>
<h3>Deductions</h3><table>
${row('Loss of pay (absence)', c(n(p.absent_deduction)))}${row('Lateness', c(n(p.late_deduction)))}
${row('Provident Fund', c(n(p.pf_amount)))}${row('ESI', c(n(p.esi_amount)))}${row('Professional Tax', c(n(p.pt_amount)))}
${row('Other deduction', c(n(p.other_deductions)))}${row('<b>Total Deductions</b>', '<b>' + c(n(p.total_deductions)) + '</b>')}
</table></div></div>
<div class="net"><span>Net Pay</span><span>${c(n(p.net_salary))}</span></div>
<p class="muted" style="margin-top:24px">Computer-generated payslip.</p>
<script>window.onload=()=>window.print()</script>
</body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

export default PayslipView;
