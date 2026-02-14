import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Calculator, Download, CheckCircle, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import * as XLSX from 'xlsx';

interface PayrollRecord {
  id: string;
  staff_id: string;
  payroll_month: string;
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
  staff?: { full_name: string; staff_code: string; department: string | null };
}

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

const StaffPayrollGeneration: React.FC = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(currentYear));
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailRecord, setDetailRecord] = useState<PayrollRecord | null>(null);
  const [activeTab, setActiveTab] = useState('generate');

  const payrollMonth = `${year}-${month}`;

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
      // Get all active salary structures
      const { data: salaryStructures, error: ssError } = await supabase
        .from('staff_salary_structure')
        .select('*, staff(full_name, staff_code)')
        .eq('is_active', true);

      if (ssError) throw ssError;
      if (!salaryStructures?.length) {
        toast.error('No active salary structures found. Set up salary structures first.');
        setGenerating(false);
        return;
      }

      // Get attendance data for the month
      const startDate = `${payrollMonth}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      const { data: attendance } = await supabase
        .from('staff_daily_activities')
        .select('staff_id, attendance_status, shift_start_time, shift_end_time')
        .gte('activity_date', startDate)
        .lte('activity_date', endDate);

      // Calculate total working days (weekdays in month)
      const totalWorkingDays = (() => {
        let count = 0;
        const d = new Date(parseInt(year), parseInt(month) - 1, 1);
        while (d.getMonth() === parseInt(month) - 1) {
          if (d.getDay() !== 0) count++; // Exclude Sundays
          d.setDate(d.getDate() + 1);
        }
        return count;
      })();

      const attendanceMap: Record<string, { present: number; absent: number; late: number; overtime: number }> = {};
      attendance?.forEach((a: any) => {
        if (!attendanceMap[a.staff_id]) attendanceMap[a.staff_id] = { present: 0, absent: 0, late: 0, overtime: 0 };
        const m = attendanceMap[a.staff_id];
        if (a.attendance_status === 'present') m.present++;
        else if (a.attendance_status === 'absent') m.absent++;
        if (a.attendance_status === 'late') { m.late++; m.present++; }
        // Calculate overtime from shift times (hours beyond 8-hour shift)
        if (a.shift_start_time && a.shift_end_time) {
          const start = new Date(`2000-01-01T${a.shift_start_time}`);
          const end = new Date(`2000-01-01T${a.shift_end_time}`);
          const hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          if (hoursWorked > 8) m.overtime += hoursWorked - 8;
        }
      });

      const payrollRecords = salaryStructures.map(ss => {
        const att = attendanceMap[ss.staff_id] || { present: 0, absent: 0, late: 0, overtime: 0 };
        const grossSalary = ss.basic_salary + ss.hra + ss.conveyance + ss.medical + ss.other_allowances;
        const perDayRate = grossSalary / totalWorkingDays;
        const absentDeduction = att.absent * perDayRate;
        const lateDeduction = Math.floor(att.late / 3) * perDayRate; // 3 lates = 1 absent
        const overtimePay = att.overtime * (perDayRate / 8) * 1.5;
        const totalDeductions = absentDeduction + lateDeduction;
        const netSalary = grossSalary - totalDeductions + overtimePay;

        return {
          staff_id: ss.staff_id,
          payroll_month: payrollMonth,
          total_working_days: totalWorkingDays,
          present_days: att.present,
          absent_days: att.absent,
          late_days: att.late,
          overtime_hours: att.overtime,
          basic_salary: ss.basic_salary,
          hra: ss.hra,
          conveyance: ss.conveyance,
          medical: ss.medical,
          other_allowances: ss.other_allowances,
          gross_salary: grossSalary,
          absent_deduction: Math.round(absentDeduction * 100) / 100,
          late_deduction: Math.round(lateDeduction * 100) / 100,
          other_deductions: 0,
          total_deductions: Math.round(totalDeductions * 100) / 100,
          overtime_pay: Math.round(overtimePay * 100) / 100,
          net_salary: Math.round(netSalary * 100) / 100,
          generated_by: user?.id,
          status: 'draft',
        };
      });

      // Upsert payroll records
      const { error } = await supabase.from('staff_payroll').upsert(payrollRecords, { onConflict: 'staff_id,payroll_month' });
      if (error) throw error;

      toast.success(`Payroll generated for ${payrollRecords.length} staff members`);
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

  const exportToExcel = () => {
    const rows = filteredPayrolls.map(p => ({
      'Staff Code': p.staff?.staff_code,
      'Staff Name': p.staff?.full_name,
      'Department': p.staff?.department || '-',
      'Working Days': p.total_working_days,
      'Present': p.present_days,
      'Absent': p.absent_days,
      'Late': p.late_days,
      'OT Hours': p.overtime_hours,
      'Basic': p.basic_salary,
      'HRA': p.hra,
      'Conveyance': p.conveyance,
      'Medical': p.medical,
      'Other': p.other_allowances,
      'Gross': p.gross_salary,
      'Absent Ded.': p.absent_deduction,
      'Late Ded.': p.late_deduction,
      'Total Ded.': p.total_deductions,
      'OT Pay': p.overtime_pay,
      'Net Salary': p.net_salary,
      'Status': p.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `Payroll_${payrollMonth}.xlsx`);
  };

  const filteredPayrolls = useMemo(() => payrolls.filter(p =>
    !searchTerm || p.staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.staff?.staff_code?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [payrolls, searchTerm]);

  const totals = useMemo(() => ({
    gross: filteredPayrolls.reduce((s, p) => s + p.gross_salary, 0),
    deductions: filteredPayrolls.reduce((s, p) => s + p.total_deductions, 0),
    net: filteredPayrolls.reduce((s, p) => s + p.net_salary, 0),
  }), [filteredPayrolls]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Payroll Management</h2>

      {/* Month/Year Selector */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <Label>Month</Label>
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
            <Button variant="outline" onClick={() => bulkUpdateStatus('approved')}>Approve All Drafts</Button>
            <Button variant="outline" onClick={() => bulkUpdateStatus('paid')}>Mark All Paid</Button>
          </>
        )}
      </div>

      {/* Summary Cards */}
      {payrolls.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Gross</p><p className="text-xl font-bold">{formatCurrency(totals.gross)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Deductions</p><p className="text-xl font-bold text-destructive">{formatCurrency(totals.deductions)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Net Salary</p><p className="text-xl font-bold text-primary">{formatCurrency(totals.net)}</p></CardContent></Card>
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
                <TableHead className="text-center">Absent</TableHead>
                <TableHead className="text-center">Late</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filteredPayrolls.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No payroll records for this month</TableCell></TableRow>
              ) : filteredPayrolls.map(p => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailRecord(p)}>
                  <TableCell>
                    <p className="font-medium">{p.staff?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.staff?.staff_code}</p>
                  </TableCell>
                  <TableCell className="text-center">{p.present_days}/{p.total_working_days}</TableCell>
                  <TableCell className="text-center">{p.absent_days}</TableCell>
                  <TableCell className="text-center">{p.late_days}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.gross_salary)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(p.total_deductions)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(p.net_salary)}</TableCell>
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

      {/* Detail Dialog */}
      <Dialog open={!!detailRecord} onOpenChange={() => setDetailRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payslip - {detailRecord?.staff?.full_name}</DialogTitle>
          </DialogHeader>
          {detailRecord && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Month</span><span className="font-medium">{detailRecord.payroll_month}</span></div>
              <div className="border-t pt-2 space-y-1">
                <p className="font-semibold">Earnings</p>
                <div className="flex justify-between"><span>Basic Salary</span><span>{formatCurrency(detailRecord.basic_salary)}</span></div>
                <div className="flex justify-between"><span>HRA</span><span>{formatCurrency(detailRecord.hra)}</span></div>
                <div className="flex justify-between"><span>Conveyance</span><span>{formatCurrency(detailRecord.conveyance)}</span></div>
                <div className="flex justify-between"><span>Medical</span><span>{formatCurrency(detailRecord.medical)}</span></div>
                <div className="flex justify-between"><span>Other Allowances</span><span>{formatCurrency(detailRecord.other_allowances)}</span></div>
                <div className="flex justify-between"><span>Overtime Pay</span><span>{formatCurrency(detailRecord.overtime_pay)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Gross</span><span>{formatCurrency(detailRecord.gross_salary + detailRecord.overtime_pay)}</span></div>
              </div>
              <div className="border-t pt-2 space-y-1">
                <p className="font-semibold">Deductions</p>
                <div className="flex justify-between"><span>Absent ({detailRecord.absent_days} days)</span><span>{formatCurrency(detailRecord.absent_deduction)}</span></div>
                <div className="flex justify-between"><span>Late ({detailRecord.late_days} days)</span><span>{formatCurrency(detailRecord.late_deduction)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total Deductions</span><span className="text-destructive">{formatCurrency(detailRecord.total_deductions)}</span></div>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Net Salary</span><span className="text-primary">{formatCurrency(detailRecord.net_salary)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Badge className={statusColors[detailRecord?.status || ''] || ''}>{detailRecord?.status}</Badge>
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
