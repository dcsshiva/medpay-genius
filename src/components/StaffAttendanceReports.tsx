import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download, Loader2, BarChart3, Users, Clock, AlertTriangle, Printer } from 'lucide-react';
import { printReport, autoFitColumns } from '@/lib/printUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDay } from 'date-fns';

interface AttendanceRow {
  staff_id: string;
  attendance_status: string;
  activity_date: string;
  shift_start_time: string | null;
  shift_end_time: string | null;
}

interface StaffInfo {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
  department: string | null;
}

interface StaffSummary {
  staff_code: string;
  full_name: string;
  role: string;
  department: string;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  leave: number;
  totalHours: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const StaffAttendanceReports: React.FC = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [staffList, setStaffList] = useState<StaffInfo[]>([]);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const years = useMemo(() => {
    const y: string[] = [];
    for (let i = now.getFullYear(); i >= now.getFullYear() - 4; i--) y.push(String(i));
    return y;
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const date = new Date(Number(selectedYear), Number(selectedMonth), 1);
      const from = format(startOfMonth(date), 'yyyy-MM-dd');
      const to = format(endOfMonth(date), 'yyyy-MM-dd');

      const [staffRes, attRes] = await Promise.all([
        supabase.from('staff').select('id, staff_code, full_name, role, department').eq('is_active', true).order('staff_code'),
        supabase.from('staff_daily_activities').select('staff_id, attendance_status, activity_date, shift_start_time, shift_end_time').gte('activity_date', from).lte('activity_date', to),
      ]);

      if (staffRes.error) throw staffRes.error;
      if (attRes.error) throw attRes.error;

      setStaffList(staffRes.data || []);
      setRecords(attRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load report data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalWorkingDays = useMemo(() => {
    const date = new Date(Number(selectedYear), Number(selectedMonth), 1);
    const days = getDaysInMonth(date);
    let count = 0;
    for (let d = 1; d <= days; d++) {
      const dayOfWeek = new Date(Number(selectedYear), Number(selectedMonth), d).getDay();
      if (dayOfWeek !== 0) count++; // Exclude Sundays
    }
    return count;
  }, [selectedMonth, selectedYear]);

  const staffSummaries: StaffSummary[] = useMemo(() => {
    const map: Record<string, AttendanceRow[]> = {};
    records.forEach(r => {
      if (!map[r.staff_id]) map[r.staff_id] = [];
      map[r.staff_id].push(r);
    });

    return staffList.map(s => {
      const rows = map[s.id] || [];
      const counts = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 };
      let totalMinutes = 0;

      rows.forEach(r => {
        const status = r.attendance_status as keyof typeof counts;
        if (counts[status] !== undefined) counts[status]++;
        if (r.shift_start_time && r.shift_end_time) {
          const [sh, sm] = r.shift_start_time.split(':').map(Number);
          const [eh, em] = r.shift_end_time.split(':').map(Number);
          totalMinutes += (eh * 60 + em) - (sh * 60 + sm);
        }
      });

      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      return {
        staff_code: s.staff_code,
        full_name: s.full_name,
        role: s.role,
        department: s.department || '-',
        ...counts,
        totalHours: `${hrs}h ${mins}m`,
      };
    });
  }, [staffList, records]);

  const overallCounts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 };
    records.forEach(r => {
      const s = r.attendance_status as keyof typeof c;
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }, [records]);

  const lateTrendData = useMemo(() => {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    records.filter(r => r.attendance_status === 'late').forEach(r => {
      const day = getDay(new Date(r.activity_date));
      dayCounts[day]++;
    });
    return DAY_NAMES.map((name, i) => ({ day: name, lateCount: dayCounts[i] }));
  }, [records]);

  const totalRecords = records.length;
  const pctPresent = totalRecords ? ((overallCounts.present / totalRecords) * 100).toFixed(1) : '0';
  const pctAbsent = totalRecords ? ((overallCounts.absent / totalRecords) * 100).toFixed(1) : '0';
  const pctLate = totalRecords ? ((overallCounts.late / totalRecords) * 100).toFixed(1) : '0';

  const exportToExcel = () => {
    const rows = staffSummaries.map(s => ({
      'Staff Code': s.staff_code,
      'Name': s.full_name,
      'Role': s.role,
      'Department': s.department,
      'Present': s.present,
      'Absent': s.absent,
      'Late': s.late,
      'Half Day': s.half_day,
      'Leave': s.leave,
      'Total Hours': s.totalHours,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    autoFitColumns(ws, rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    XLSX.writeFile(wb, `attendance_report_${MONTHS[Number(selectedMonth)]}_${selectedYear}.xlsx`);
    toast.success('Report exported');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading}>
          <Download className="h-4 w-4 mr-1" /> Export Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const cols = [
            { label: 'Staff Code', key: 'Staff Code' },
            { label: 'Name', key: 'Name' },
            { label: 'Role', key: 'Role' },
            { label: 'Present', key: 'Present' },
            { label: 'Absent', key: 'Absent' },
            { label: 'Late', key: 'Late' },
            { label: 'Leave', key: 'Leave' },
            { label: 'Total Hours', key: 'Total Hours' },
          ];
          const data = staffSummaries.map(s => ({
            'Staff Code': s.staff_code,
            'Name': s.full_name,
            'Role': s.role,
            'Present': s.present,
            'Absent': s.absent,
            'Late': s.late,
            'Leave': s.leave,
            'Total Hours': s.totalHours,
          }));
          printReport({ title: `Attendance Report - ${MONTHS[Number(selectedMonth)]} ${selectedYear}`, columns: cols, data });
        }} disabled={loading}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card><CardContent className="pt-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-2xl font-bold">{totalWorkingDays}</div>
              <p className="text-xs text-muted-foreground">Working Days</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-600">{pctPresent}%</div>
              <p className="text-xs text-muted-foreground">Present ({overallCounts.present})</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-red-600">{pctAbsent}%</div>
              <p className="text-xs text-muted-foreground">Absent ({overallCounts.absent})</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <div className="text-2xl font-bold text-yellow-600">{pctLate}%</div>
              <p className="text-xs text-muted-foreground">Late ({overallCounts.late})</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{overallCounts.half_day}</div>
              <p className="text-xs text-muted-foreground">Half Days</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{overallCounts.leave}</div>
              <p className="text-xs text-muted-foreground">On Leave</p>
            </CardContent></Card>
          </div>

          {/* Late Trend Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Late Arrivals by Day of Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lateTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="lateCount" name="Late Count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Per-Staff Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Staff-wise Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Role</TableHead>
                      <TableHead className="hidden md:table-cell">Dept</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Half Day</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Leave</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffSummaries.map(s => (
                      <TableRow key={s.staff_code}>
                        <TableCell className="font-mono text-xs">{s.staff_code}</TableCell>
                        <TableCell className="font-medium text-sm">{s.full_name}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs capitalize">{s.role.replace('_', ' ')}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{s.department}</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">{s.present}</TableCell>
                        <TableCell className="text-center text-red-600 font-medium">{s.absent}</TableCell>
                        <TableCell className="text-center text-yellow-600 font-medium">{s.late}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell text-orange-600">{s.half_day}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell text-blue-600">{s.leave}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{s.totalHours}</TableCell>
                      </TableRow>
                    ))}
                    {staffSummaries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">No staff data</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StaffAttendanceReports;
