import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Download, Loader2, BarChart3, Users, Clock, AlertTriangle, Printer,
  Search, ChevronLeft, ChevronRight, LayoutGrid, ListChecks, CalendarCheck,
} from 'lucide-react';
import { printReport, autoFitColumns } from '@/lib/printUtils';
import { fetchAllPaginated } from '@/lib/fetchAllPaginated';
import AttendanceDayRegister, { registerCellText } from '@/components/AttendanceDayRegister';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDay, eachDayOfInterval, addDays, parseISO } from 'date-fns';

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

const STATUS_LABELS: Record<string, string> = {
  present: 'Present', absent: 'Absent', late: 'Late', half_day: 'Half Day', leave: 'Leave',
};

const STATUS_BADGE: Record<string, string> = {
  present: 'bg-green-100 text-green-700 border-green-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
  late: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  half_day: 'bg-orange-100 text-orange-700 border-orange-200',
  leave: 'bg-blue-100 text-blue-700 border-blue-200',
};

const fmtTime = (t: string | null) => {
  if (!t) return '-';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

type ViewMode = 'summary' | 'register' | 'daywise';
type PeriodMode = 'month' | 'range';

const StaffAttendanceReports: React.FC = () => {
  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('register');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [rangeFrom, setRangeFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [rangeTo, setRangeTo] = useState(format(now, 'yyyy-MM-dd'));
  const [dayDate, setDayDate] = useState(format(now, 'yyyy-MM-dd'));
  const [dayFilter, setDayFilter] = useState<'all' | 'absent' | 'late' | 'unmarked' | 'present'>('all');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const [staffList, setStaffList] = useState<StaffInfo[]>([]);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const years = useMemo(() => {
    const y: string[] = [];
    for (let i = now.getFullYear(); i >= now.getFullYear() - 4; i--) y.push(String(i));
    return y.push ? y : y;
  }, []);

  // Effective date range for fetching
  const { fromDate, toDate } = useMemo(() => {
    if (periodMode === 'range') {
      return { fromDate: rangeFrom, toDate: rangeTo };
    }
    const date = new Date(Number(selectedYear), Number(selectedMonth), 1);
    return {
      fromDate: format(startOfMonth(date), 'yyyy-MM-dd'),
      toDate: format(endOfMonth(date), 'yyyy-MM-dd'),
    };
  }, [periodMode, rangeFrom, rangeTo, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, attRows] = await Promise.all([
        supabase.from('staff').select('id, staff_code, full_name, role, department').eq('is_active', true).order('staff_code'),
        fetchAllPaginated<AttendanceRow>(() =>
          supabase
            .from('staff_daily_activities')
            .select('staff_id, attendance_status, activity_date, shift_start_time, shift_end_time')
            .gte('activity_date', fromDate)
            .lte('activity_date', toDate)
            .order('activity_date') as any
        ),
      ]);

      if (staffRes.error) throw staffRes.error;
      setStaffList(staffRes.data || []);
      setRecords(attRows);
    } catch (err: any) {
      toast.error('Failed to load report data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // All days in the selected period (cap at 62 columns for usability)
  const periodDays = useMemo(() => {
    try {
      const start = parseISO(fromDate);
      const end = parseISO(toDate);
      if (end < start) return [];
      const all = eachDayOfInterval({ start, end });
      const capped = all.length > 62 ? all.slice(0, 62) : all;
      return capped.map(d => format(d, 'yyyy-MM-dd'));
    } catch {
      return [];
    }
  }, [fromDate, toDate]);

  const periodLabel = useMemo(() => {
    if (periodMode === 'range') {
      return `${format(parseISO(fromDate), 'dd MMM yyyy')} – ${format(parseISO(toDate), 'dd MMM yyyy')}`;
    }
    return `${MONTHS[Number(selectedMonth)]} ${selectedYear}`;
  }, [periodMode, fromDate, toDate, selectedMonth, selectedYear]);

  const departments = useMemo(
    () => Array.from(new Set(staffList.map(s => s.department).filter(Boolean))) as string[],
    [staffList]
  );
  const roles = useMemo(
    () => Array.from(new Set(staffList.map(s => s.role).filter(Boolean))),
    [staffList]
  );

  // Filtered staff list (search / dept / role)
  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffList.filter(s => {
      if (q && !s.full_name.toLowerCase().includes(q) && !s.staff_code.toLowerCase().includes(q)) return false;
      if (deptFilter !== 'all' && (s.department || '-') !== deptFilter) return false;
      if (roleFilter !== 'all' && s.role !== roleFilter) return false;
      return true;
    });
  }, [staffList, search, deptFilter, roleFilter]);

  const filteredIds = useMemo(() => new Set(filteredStaff.map(s => s.id)), [filteredStaff]);
  const filteredRecords = useMemo(() => records.filter(r => filteredIds.has(r.staff_id)), [records, filteredIds]);

  const totalWorkingDays = useMemo(() => {
    return periodDays.filter(d => getDay(new Date(d + 'T00:00:00')) !== 0).length;
  }, [periodDays]);

  const staffSummaries: StaffSummary[] = useMemo(() => {
    const map: Record<string, AttendanceRow[]> = {};
    filteredRecords.forEach(r => {
      if (!map[r.staff_id]) map[r.staff_id] = [];
      map[r.staff_id].push(r);
    });

    return filteredStaff.map(s => {
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
  }, [filteredStaff, filteredRecords]);

  const overallCounts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 };
    filteredRecords.forEach(r => {
      const s = r.attendance_status as keyof typeof c;
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }, [filteredRecords]);

  const lateTrendData = useMemo(() => {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    filteredRecords.filter(r => r.attendance_status === 'late').forEach(r => {
      const day = getDay(new Date(r.activity_date));
      dayCounts[day]++;
    });
    return DAY_NAMES.map((name, i) => ({ day: name, lateCount: dayCounts[i] }));
  }, [filteredRecords]);

  // ---- Per-day view data ----
  const dayLookup = useMemo(() => {
    const map: Record<string, AttendanceRow> = {};
    records.forEach(r => {
      if (r.activity_date === dayDate) map[r.staff_id] = r;
    });
    return map;
  }, [records, dayDate]);

  const dayRows = useMemo(() => {
    return filteredStaff.map(s => {
      const rec = dayLookup[s.id];
      let hours = '-';
      if (rec?.shift_start_time && rec?.shift_end_time) {
        const [sh, sm] = rec.shift_start_time.split(':').map(Number);
        const [eh, em] = rec.shift_end_time.split(':').map(Number);
        const mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins > 0) hours = `${Math.floor(mins / 60)}h ${mins % 60}m`;
      }
      return {
        staff: s,
        status: rec?.attendance_status || null,
        in: rec?.shift_start_time || null,
        out: rec?.shift_end_time || null,
        hours,
      };
    });
  }, [filteredStaff, dayLookup]);

  const dayCounts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0, unmarked: 0 };
    dayRows.forEach(r => {
      if (!r.status) c.unmarked++;
      else if (c[r.status as keyof typeof c] !== undefined) (c as any)[r.status]++;
    });
    return c;
  }, [dayRows]);

  const filteredDayRows = useMemo(() => {
    if (dayFilter === 'all') return dayRows;
    if (dayFilter === 'unmarked') return dayRows.filter(r => !r.status);
    if (dayFilter === 'present') return dayRows.filter(r => r.status === 'present' || r.status === 'half_day');
    return dayRows.filter(r => r.status === dayFilter);
  }, [dayRows, dayFilter]);

  const totalRecords = filteredRecords.length;
  const pctPresent = totalRecords ? ((overallCounts.present / totalRecords) * 100).toFixed(1) : '0';
  const pctAbsent = totalRecords ? ((overallCounts.absent / totalRecords) * 100).toFixed(1) : '0';
  const pctLate = totalRecords ? ((overallCounts.late / totalRecords) * 100).toFixed(1) : '0';

  // ---- Exports ----
  const registerLookup = useMemo(() => {
    const map: Record<string, Record<string, AttendanceRow>> = {};
    filteredRecords.forEach(r => {
      if (!map[r.staff_id]) map[r.staff_id] = {};
      map[r.staff_id][r.activity_date] = r;
    });
    return map;
  }, [filteredRecords]);

  const exportSummaryExcel = () => {
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
    XLSX.writeFile(wb, `attendance_summary_${fromDate}_to_${toDate}.xlsx`);
    toast.success('Summary exported');
  };

  const exportRegisterExcel = () => {
    const rows = filteredStaff.map(s => {
      const row: Record<string, any> = {
        'Staff Code': s.staff_code,
        'Name': s.full_name,
        'Role': s.role,
      };
      periodDays.forEach(d => {
        row[format(new Date(d + 'T00:00:00'), 'dd-MMM')] = registerCellText(registerLookup[s.id]?.[d]?.attendance_status);
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    autoFitColumns(ws, rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Day-wise Register');
    XLSX.writeFile(wb, `attendance_register_${fromDate}_to_${toDate}.xlsx`);
    toast.success('Register exported');
  };

  const exportDayExcel = () => {
    const rows = filteredDayRows.map(r => ({
      'Staff Code': r.staff.staff_code,
      'Name': r.staff.full_name,
      'Role': r.staff.role,
      'Department': r.staff.department || '-',
      'Status': r.status ? STATUS_LABELS[r.status] : 'Unmarked',
      'Shift Start': fmtTime(r.in),
      'Shift End': fmtTime(r.out),
      'Hours': r.hours,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    autoFitColumns(ws, rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Day-wise');
    XLSX.writeFile(wb, `attendance_daywise_${dayDate}.xlsx`);
    toast.success('Day-wise report exported');
  };

  const printSummary = () => {
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
      'Staff Code': s.staff_code, 'Name': s.full_name, 'Role': s.role,
      'Present': s.present, 'Absent': s.absent, 'Late': s.late,
      'Leave': s.leave, 'Total Hours': s.totalHours,
    }));
    printReport({ title: `Attendance Summary - ${periodLabel}`, columns: cols, data });
  };

  const printRegister = () => {
    const cols = [
      { label: 'Code', key: 'Staff Code' },
      { label: 'Name', key: 'Name' },
      ...periodDays.map(d => ({ label: format(new Date(d + 'T00:00:00'), 'd'), key: format(new Date(d + 'T00:00:00'), 'dd-MMM') })),
    ];
    const data = filteredStaff.map(s => {
      const row: Record<string, any> = { 'Staff Code': s.staff_code, 'Name': s.full_name };
      periodDays.forEach(d => {
        row[format(new Date(d + 'T00:00:00'), 'dd-MMM')] = registerCellText(registerLookup[s.id]?.[d]?.attendance_status) || '-';
      });
      return row;
    });
    printReport({
      title: `Attendance Register - ${periodLabel}`,
      subtitle: 'P = Present, L = Late, A = Absent, H = Half Day, Lv = Leave, - = Unmarked',
      columns: cols,
      data,
      orientation: 'landscape',
    });
  };

  const printDay = () => {
    const cols = [
      { label: 'Code', key: 'Staff Code' },
      { label: 'Name', key: 'Name' },
      { label: 'Role', key: 'Role' },
      { label: 'Status', key: 'Status' },
      { label: 'In', key: 'In' },
      { label: 'Out', key: 'Out' },
      { label: 'Hours', key: 'Hours' },
    ];
    const data = filteredDayRows.map(r => ({
      'Staff Code': r.staff.staff_code,
      'Name': r.staff.full_name,
      'Role': r.staff.role.replace(/_/g, ' '),
      'Status': r.status ? STATUS_LABELS[r.status] : 'Unmarked',
      'In': fmtTime(r.in),
      'Out': fmtTime(r.out),
      'Hours': r.hours,
    }));
    printReport({
      title: `Day-wise Attendance - ${format(parseISO(dayDate), 'dd MMM yyyy (EEE)')}`,
      columns: cols,
      data,
      orientation: 'landscape',
    });
  };

  const viewButtons: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'register', label: 'Day-wise Register', icon: <LayoutGrid className="h-4 w-4" /> },
    { key: 'daywise', label: 'Per Day', icon: <CalendarCheck className="h-4 w-4" /> },
    { key: 'summary', label: 'Staff Summary', icon: <ListChecks className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4">
      {/* View switcher */}
      <div className="flex flex-wrap gap-2">
        {viewButtons.map(v => (
          <Button
            key={v.key}
            variant={viewMode === v.key ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode(v.key)}
          >
            {v.icon} {v.label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {viewMode !== 'daywise' && (
          <>
            <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
              <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="range">Date Range</SelectItem>
              </SelectContent>
            </Select>
            {periodMode === 'month' ? (
              <>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="w-[150px] h-9" />
                <span className="text-muted-foreground text-sm">to</span>
                <Input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="w-[150px] h-9" />
              </>
            )}
          </>
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name / code"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 w-[170px] h-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          {viewMode === 'summary' && (
            <>
              <Button variant="outline" size="sm" onClick={exportSummaryExcel} disabled={loading}>
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={printSummary} disabled={loading}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </>
          )}
          {viewMode === 'register' && (
            <>
              <Button variant="outline" size="sm" onClick={exportRegisterExcel} disabled={loading}>
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={printRegister} disabled={loading}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </>
          )}
          {viewMode === 'daywise' && (
            <>
              <Button variant="outline" size="sm" onClick={exportDayExcel} disabled={loading}>
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={printDay} disabled={loading}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* ================= SUMMARY VIEW ================= */}
          {viewMode === 'summary' && (
            <>
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
                            <TableCell className="hidden md:table-cell text-xs capitalize">{s.role.replace(/_/g, ' ')}</TableCell>
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

          {/* ================= REGISTER VIEW ================= */}
          {viewMode === 'register' && (
            <AttendanceDayRegister staffList={filteredStaff} records={filteredRecords} days={periodDays} />
          )}

          {/* ================= PER-DAY VIEW ================= */}
          {viewMode === 'daywise' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" /> Day-wise Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date nav */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline" size="icon" className="h-9 w-9"
                    onClick={() => setDayDate(format(addDays(parseISO(dayDate), -1), 'yyyy-MM-dd'))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Input type="date" value={dayDate} onChange={e => setDayDate(e.target.value)} className="w-[160px] h-9" />
                  <Button
                    variant="outline" size="icon" className="h-9 w-9"
                    onClick={() => setDayDate(format(addDays(parseISO(dayDate), 1), 'yyyy-MM-dd'))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">{format(parseISO(dayDate), 'EEEE, dd MMM yyyy')}</span>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => {
                      const t = format(new Date(), 'yyyy-MM-dd');
                      setDayDate(t);
                      setPeriodMode('range');
                      setRangeFrom(t);
                      setRangeTo(t);
                    }}
                  >
                    Today
                  </Button>
                </div>

                {/* Note about data range */}
                {(dayDate < fromDate || dayDate > toDate) && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    This date is outside the loaded period ({periodLabel}). Adjust the Month/Date Range above (switch to the Register or Summary view) to include it.
                  </p>
                )}

                {/* Quick filter chips */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={dayFilter === 'all' ? 'default' : 'outline'}
                    className="cursor-pointer h-8 px-3"
                    onClick={() => setDayFilter('all')}
                  >
                    All: {dayRows.length}
                  </Badge>
                  <Badge
                    variant={dayFilter === 'present' ? 'default' : 'outline'}
                    className={`cursor-pointer h-8 px-3 ${dayFilter !== 'present' ? STATUS_BADGE.present : ''}`}
                    onClick={() => setDayFilter('present')}
                  >
                    Present: {dayCounts.present + dayCounts.half_day}
                  </Badge>
                  <Badge
                    variant={dayFilter === 'absent' ? 'default' : 'outline'}
                    className={`cursor-pointer h-8 px-3 ${dayFilter !== 'absent' ? STATUS_BADGE.absent : ''}`}
                    onClick={() => setDayFilter('absent')}
                  >
                    Absent: {dayCounts.absent}
                  </Badge>
                  <Badge
                    variant={dayFilter === 'late' ? 'default' : 'outline'}
                    className={`cursor-pointer h-8 px-3 ${dayFilter !== 'late' ? STATUS_BADGE.late : ''}`}
                    onClick={() => setDayFilter('late')}
                  >
                    Late: {dayCounts.late}
                  </Badge>
                  <Badge
                    variant={dayFilter === 'unmarked' ? 'default' : 'outline'}
                    className="cursor-pointer h-8 px-3"
                    onClick={() => setDayFilter('unmarked')}
                  >
                    Unmarked: {dayCounts.unmarked}
                  </Badge>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block border rounded-md overflow-auto max-h-[60vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[90px]">Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Dept</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Shift Start</TableHead>
                        <TableHead>Shift End</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDayRows.map(r => (
                        <TableRow key={r.staff.id}>
                          <TableCell className="font-mono text-xs">{r.staff.staff_code}</TableCell>
                          <TableCell className="font-medium text-sm">{r.staff.full_name}</TableCell>
                          <TableCell className="text-xs capitalize">{r.staff.role.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-xs">{r.staff.department || '-'}</TableCell>
                          <TableCell>
                            {r.status ? (
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${STATUS_BADGE[r.status]}`}>
                                {STATUS_LABELS[r.status]}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Unmarked</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{fmtTime(r.in)}</TableCell>
                          <TableCell className="text-xs">{fmtTime(r.out)}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{r.hours}</TableCell>
                        </TableRow>
                      ))}
                      {filteredDayRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No staff match this filter</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {filteredDayRows.map(r => (
                    <div key={r.staff.id} className="border rounded-lg p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">{r.staff.full_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{r.staff.staff_code} · <span className="capitalize font-sans">{r.staff.role.replace(/_/g, ' ')}</span></div>
                        </div>
                        {r.status ? (
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${STATUS_BADGE[r.status]}`}>
                            {STATUS_LABELS[r.status]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unmarked</span>
                        )}
                      </div>
                      {r.status && (
                        <div className="text-xs text-muted-foreground flex gap-4">
                          <span>In: {fmtTime(r.in)}</span>
                          <span>Out: {fmtTime(r.out)}</span>
                          <span>Hours: {r.hours}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredDayRows.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">No staff match this filter</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default StaffAttendanceReports;
