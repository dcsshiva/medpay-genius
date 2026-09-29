import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Calculator, Download, CheckCircle, Search, Printer, Info } from 'lucide-react';
import { printReport, autoFitColumns } from '@/lib/printUtils';
import { formatCurrency } from '@/lib/currency';
import * as XLSX from 'xlsx';
import { loadCycleData, computeForStaff } from '@/lib/hrms/payrollData';
import { fetchPayrollSettings, cycleForMonth, PayCycle } from '@/lib/hrms/payCycle';
import PayslipView, { PayslipRecord, printPayslip, cycleLabel } from '@/components/hrms/PayslipView';

type PayrollRecord = PayslipRecord;

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2024, i);
  return { value: String(i + 1).padStart(2, '0'), label: d.toLocaleString('default', { month: 'long' }) };
});

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
};

/**
 * HRMS payroll: generates one record per staff for a pay cycle using the shared payroll engine
 * (src/lib/hrms/payrollEngine.ts). "Month" = the month the pay cycle ENDS in
 * (e.g. September = 25 Aug – 24 Sep with the default cycle start day of 25).
 */
const StaffPayrollGeneration: React.FC = () => {
  const { user } = useAuth();
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(currentYear));
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailRecord, setDetailRecord] = useState<PayrollRecord | null>(null);
  const [cycle, setCycle] = useState<PayCycle | null>(null);

  const payrollMonth = `${year}-${month}`;

  useEffect(() => {
    fetchPayrollSettings().then(s => setCycle(cycleForMonth(payrollMonth, s.cycle_start_day)));
  }, [payrollMonth]);

  const fetchPayrolls = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_payroll')
      .select('*, staff(full_name, staff_code, department)')
      .eq('payroll_month', payrollMonth)
      .order('created_at', { ascending: false });
    if (data) setPayrolls(data as any);
    if (error) console.error(error);
    setLoading(false);
  };

  useEffect(() => { fetchPayrolls(); }, [payrollMonth]);

  const generatePayroll = async () => {
    setGenerating(true);
    try {
      const data = await loadCycleData(payrollMonth);
      const withSalary = data.staff.filter(s => data.salaries[s.id]);
      if (!withSalary.length) {
        toast.error('No active salary structures found. Set up salary structures first.');
        return;
      }

      // Never overwrite approved / paid payroll
      const { data: existing } = await supabase
        .from('staff_payroll')
        .select('staff_id, status')
        .eq('payroll_month', payrollMonth);
      const locked = new Set((existing || []).filter((e: any) => e.status !== 'draft').map((e: any) => e.staff_id));

      const asOf = new Date().toISOString().slice(0, 10);
      const records: any[] = [];
      for (const s of withSalary) {
        if (locked.has(s.id)) continue;
        const r = computeForStaff(data, s.id, asOf);
        if (!r) continue;
        const sal = data.salaries[s.id];
        records.push({
          staff_id: s.id,
          payroll_month: payrollMonth,
          cycle_start: data.cycle.start,
          cycle_end: data.cycle.end,
          total_working_days: r.cycleDays,
          present_days: r.presentDays,
          absent_days: r.absentDays,
          late_days: r.lateDays,
          overtime_hours: Math.round((r.otMinutes / 60) * 100) / 100,
          ot_minutes: r.otMinutes,
          basic_salary: sal.basic_salary,
          hra: sal.hra,
          conveyance: sal.conveyance,
          medical: sal.medical,
          other_allowances: sal.other_allowances,
          gross_salary: r.gross,
          absent_deduction: r.lopDeduction,
          late_deduction: r.lateDeduction,
          other_deductions: r.otherDeduction,
          pf_amount: r.pf,
          esi_amount: r.esi,
          pt_amount: r.pt,
          statutory_deductions: r.statutory,
          total_deductions: r.totalDeductions,
          overtime_pay: r.otPay,
          net_salary: r.net,
          lop_days: r.lopDays,
          cl_used: r.clUsed,
          late_minutes: r.lateMinutes,
          permission_used_minutes: r.permissionUsed,
          ledger: r.rows,
          generated_by: user?.id,
          status: 'draft',
        });
      }

      if (records.length) {
        const { error } = await supabase.from('staff_payroll').upsert(records as any, { onConflict: 'staff_id,payroll_month' });
        if (error) throw error;
      }

      const noSalary = data.staff.length - withSalary.length;
      toast.success(
        `Payroll generated for ${records.length} staff` +
        (locked.size ? ` · ${locked.size} approved/paid left unchanged` : '') +
        (noSalary ? ` · ${noSalary} without a salary structure skipped` : ''),
      );
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'approved') { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
    if (status === 'paid') { updates.paid_at = new Date().toISOString(); }

    const { error } = await supabase.from('staff_payroll').update(updates).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Payroll ${status}`);
    fetchPayrolls();
  };

  const bulkUpdateStatus = async (status: string) => {
    const draftIds = payrolls.filter(p => p.status === (status === 'approved' ? 'draft' : 'approved')).map(p => p.id);
    if (!draftIds.length) { toast.info('No records to update'); return; }

    const updates: any = { status };
    if (status === 'approved') { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
    if (status === 'paid') { updates.paid_at = new Date().toISOString(); }

    const { error } = await supabase.from('staff_payroll').update(updates).in('id', draftIds);
    if (error) { toast.error(error.message); return; }
    toast.success(`${draftIds.length} records updated to ${status}`);
    fetchPayrolls();
  };

  const n = (v: any) => Number(v || 0);

  const filteredPayrolls = useMemo(() => payrolls.filter(p =>
    !searchTerm || p.staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.staff?.staff_code?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [payrolls, searchTerm]);

  const exportToExcel = () => {
    const rows = filteredPayrolls.map(p => ({
      'Staff Code': p.staff?.staff_code,
      'Staff Name': p.staff?.full_name,
      'Department': p.staff?.department || '-',
      'Cycle': cycleLabel(p),
      'Days': p.total_working_days,
      'Present': p.present_days,
      'CL Used': n(p.cl_used),
      'LOP Days': n(p.lop_days),
      'Late Days': p.late_days,
      'Late Min': n(p.late_minutes),
      'Permission Min': n(p.permission_used_minutes),
      'OT Min': n(p.ot_minutes),
      'Basic': p.basic_salary,
      'HRA': p.hra,
      'Conveyance': p.conveyance,
      'Medical': p.medical,
      'Other Allow.': p.other_allowances,
      'Gross': p.gross_salary,
      'LOP Ded.': p.absent_deduction,
      'Late Ded.': p.late_deduction,
      'PF': n(p.pf_amount),
      'ESI': n(p.esi_amount),
      'PT': n(p.pt_amount),
      'Other Ded.': p.other_deductions,
      'Total Ded.': p.total_deductions,
      'OT Pay': p.overtime_pay,
      'Net Pay': p.net_salary,
      'Status': p.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    autoFitColumns(ws, rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `Payroll_${payrollMonth}.xlsx`);
  };

  const totals = useMemo(() => ({
    gross: filteredPayrolls.reduce((s, p) => s + n(p.gross_salary), 0),
    attendance: filteredPayrolls.reduce((s, p) => s + n(p.absent_deduction) + n(p.late_deduction), 0),
    statutory: filteredPayrolls.reduce((s, p) => s + n(p.pf_amount) + n(p.esi_amount) + n(p.pt_amount) + n(p.other_deductions), 0),
    ot: filteredPayrolls.reduce((s, p) => s + n(p.overtime_pay), 0),
    net: filteredPayrolls.reduce((s, p) => s + n(p.net_salary), 0),
  }), [filteredPayrolls]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Payroll Management</h2>

      {/* Cycle selector */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <Label>Cycle ending in</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={generatePayroll} disabled={generating}>
          <Calculator className="h-4 w-4 mr-1" /> {generating ? 'Generating...' : 'Generate Payroll'}
        </Button>
        {payrolls.length > 0 && (
          <>
            <Button variant="outline" onClick={exportToExcel}><Download className="h-4 w-4 mr-1" /> Export</Button>
            <Button variant="outline" onClick={() => {
              const cols = [
                { label: 'Staff Code', key: 'Staff Code' },
                { label: 'Name', key: 'Name' },
                { label: 'Gross', key: 'Gross' },
                { label: 'LOP / Late', key: 'LOP / Late' },
                { label: 'Statutory', key: 'Statutory' },
                { label: 'OT', key: 'OT' },
                { label: 'Net Pay', key: 'Net Pay' },
                { label: 'Status', key: 'Status' },
              ];
              const data = filteredPayrolls.map(p => ({
                'Staff Code': p.staff?.staff_code || '',
                'Name': p.staff?.full_name || '',
                'Gross': formatCurrency(n(p.gross_salary)),
                'LOP / Late': formatCurrency(n(p.absent_deduction) + n(p.late_deduction)),
                'Statutory': formatCurrency(n(p.pf_amount) + n(p.esi_amount) + n(p.pt_amount) + n(p.other_deductions)),
                'OT': formatCurrency(n(p.overtime_pay)),
                'Net Pay': formatCurrency(n(p.net_salary)),
                'Status': p.status,
              }));
              printReport({ title: `Payroll - ${cycle?.label || payrollMonth}`, columns: cols, data });
            }}><Printer className="h-4 w-4 mr-1" /> Print</Button>
            <Button variant="outline" onClick={() => bulkUpdateStatus('approved')}>Approve All Drafts</Button>
            <Button variant="outline" onClick={() => bulkUpdateStatus('paid')}>Mark All Paid</Button>
          </>
        )}
      </div>

      {cycle && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Pay cycle <b>{cycle.label}</b>. Lateness uses each shift's grace and extra-late allowance, then the
            permission balance, then a per-minute deduction. Absences use CL before loss of pay. Days after today are
            not counted until they happen. Approved and paid records are never overwritten.
          </span>
        </div>
      )}

      {/* Summary Cards */}
      {payrolls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Gross payroll</p><p className="text-xl font-bold">{formatCurrency(totals.gross)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">LOP / lateness</p><p className="text-xl font-bold text-destructive">{formatCurrency(totals.attendance)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">PF + ESI + PT + other</p><p className="text-xl font-bold">{formatCurrency(totals.statutory)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Overtime pay</p><p className="text-xl font-bold">{formatCurrency(totals.ot)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Net payable</p><p className="text-xl font-bold text-primary">{formatCurrency(totals.net)}</p></CardContent></Card>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      {/* Payroll Table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">CL used</TableHead>
                <TableHead className="text-center">LOP days</TableHead>
                <TableHead className="text-center">Late (min)</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">LOP / Late</TableHead>
                <TableHead className="text-right">Statutory</TableHead>
                <TableHead className="text-right">OT</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filteredPayrolls.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No payroll records for this cycle</TableCell></TableRow>
              ) : filteredPayrolls.map(p => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailRecord(p)}>
                  <TableCell>
                    <p className="font-medium">{p.staff?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.staff?.staff_code}</p>
                  </TableCell>
                  <TableCell className="text-center">{p.present_days}/{p.total_working_days}</TableCell>
                  <TableCell className="text-center">{n(p.cl_used)}</TableCell>
                  <TableCell className="text-center">{n(p.lop_days)}</TableCell>
                  <TableCell className="text-center">{n(p.late_minutes)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(n(p.gross_salary))}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(n(p.absent_deduction) + n(p.late_deduction))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(n(p.pf_amount) + n(p.esi_amount) + n(p.pt_amount) + n(p.other_deductions))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(n(p.overtime_pay))}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(n(p.net_salary))}</TableCell>
                  <TableCell><Badge className={statusColors[p.status] || ''}>{p.status}</Badge></TableCell>
                  <TableCell>
                    {p.status === 'draft' && (
                      <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); updateStatus(p.id, 'approved'); }}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payslip Dialog */}
      <Dialog open={!!detailRecord} onOpenChange={() => setDetailRecord(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payslip - {detailRecord?.staff?.full_name}</DialogTitle>
          </DialogHeader>
          {detailRecord && <PayslipView p={detailRecord} />}
          <DialogFooter className="gap-2">
            <Badge className={statusColors[detailRecord?.status || ''] || ''}>{detailRecord?.status}</Badge>
            {detailRecord && (
              <Button variant="outline" onClick={() => printPayslip(detailRecord)}>
                <Printer className="h-4 w-4 mr-1" /> Print payslip
              </Button>
            )}
            {detailRecord?.status === 'draft' && (
              <Button onClick={() => { updateStatus(detailRecord.id, 'approved'); setDetailRecord(null); }}>Approve</Button>
            )}
            {detailRecord?.status === 'approved' && (
              <Button onClick={() => { updateStatus(detailRecord.id, 'paid'); setDetailRecord(null); }}>Mark Paid</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffPayrollGeneration;
