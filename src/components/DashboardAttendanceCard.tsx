import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { CalendarCheck, ChevronRight, Clock, Loader2, Palmtree, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PeriodMode = 'latest' | 'day' | 'week' | 'month';

interface AttendanceCounts {
  totalStaff: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
}

interface Props {
  onOpenReports?: () => void;
  staffId?: string;
}

const EMPTY_COUNTS: AttendanceCounts = {
  totalStaff: 0,
  present: 0,
  absent: 0,
  late: 0,
  halfDay: 0,
  leave: 0,
};

const DashboardAttendanceCard: React.FC<Props> = ({ onOpenReports, staffId }) => {
  const isPersonal = Boolean(staffId);
  const [mode, setMode] = useState<PeriodMode>('latest');
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [counts, setCounts] = useState<AttendanceCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const anchor = latestDate || selectedDate;
    if (mode === 'month') {
      const monthDate = parseISO(`${selectedMonth}-01`);
      return {
        from: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
        to: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
      };
    }
    if (mode === 'week') {
      const date = parseISO(selectedDate);
      return {
        from: format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    }
    const date = mode === 'latest' ? anchor : selectedDate;
    return { from: date, to: date };
  }, [latestDate, mode, selectedDate, selectedMonth]);

  const periodLabel = useMemo(() => {
    if (mode === 'latest' && !latestDate) return 'No attendance records yet';
    if (!range.from || !range.to) return 'No attendance imported';
    if (range.from === range.to) return format(parseISO(range.from), 'dd MMM yyyy');
    return `${format(parseISO(range.from), 'dd MMM')} – ${format(parseISO(range.to), 'dd MMM yyyy')}`;
  }, [latestDate, mode, range]);

  const loadCounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const staffRequest = staffId
        ? supabase.from('staff').select('id').eq('id', staffId).eq('is_active', true)
        : supabase.from('staff').select('id').eq('is_active', true).not('biometric_code', 'is', null);
      let latestRequest = supabase
        .from('staff_daily_activities')
        .select('activity_date')
        .order('activity_date', { ascending: false })
        .limit(1);
      if (staffId) latestRequest = latestRequest.eq('staff_id', staffId);

      const [{ data: staffRows, error: staffError }, { data: newestRows, error: latestError }] = await Promise.all([
        staffRequest,
        latestRequest,
      ]);

      if (staffError) throw staffError;
      if (latestError) throw latestError;

      const activeStaffIds = (staffRows || []).map((staff) => staff.id);
      const newestDate = newestRows?.[0]?.activity_date || null;
      setLatestDate(newestDate);

      if (newestDate && mode === 'latest' && selectedDate !== newestDate) {
        setSelectedDate(newestDate);
        setSelectedMonth(newestDate.slice(0, 7));
      }

      const effectiveFrom = mode === 'latest' && newestDate ? newestDate : range.from;
      const effectiveTo = mode === 'latest' && newestDate ? newestDate : range.to;

      if (!newestDate || activeStaffIds.length === 0 || !effectiveFrom || !effectiveTo) {
        setCounts({ ...EMPTY_COUNTS, totalStaff: activeStaffIds.length });
        return;
      }

        const countStatus = (status: 'present' | 'absent' | 'late' | 'half_day' | 'leave') =>
        supabase
          .from('staff_daily_activities')
          .select('id', { count: 'exact', head: true })
          .in('staff_id', activeStaffIds)
          .eq('attendance_status', status)
          .gte('activity_date', effectiveFrom)
          .lte('activity_date', effectiveTo);

        const [presentRes, absentRes, lateRes, halfDayRes, leaveRes] = await Promise.all([
        countStatus('present'),
        countStatus('absent'),
        countStatus('late'),
          countStatus('half_day'),
          countStatus('leave'),
      ]);

        const queryError = presentRes.error || absentRes.error || lateRes.error || halfDayRes.error || leaveRes.error;
      if (queryError) throw queryError;

      setCounts({
        totalStaff: activeStaffIds.length,
        present: presentRes.count || 0,
        absent: absentRes.count || 0,
        late: lateRes.count || 0,
          halfDay: halfDayRes.count || 0,
          leave: leaveRes.count || 0,
      });
    } catch (loadError) {
      console.error('Unable to load dashboard attendance:', loadError);
      setCounts(EMPTY_COUNTS);
      setError('Attendance summary unavailable');
    } finally {
      setLoading(false);
    }
    }, [mode, range.from, range.to, selectedDate, staffId]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const metrics = isPersonal
    ? [
        { label: 'Present', value: counts.present, icon: CalendarCheck, className: 'text-success' },
        { label: 'Absent', value: counts.absent, icon: CalendarCheck, className: 'text-destructive' },
        { label: 'Late', value: counts.late, icon: Clock, className: 'text-warning' },
        { label: 'Half-day', value: counts.halfDay, icon: Clock, className: 'text-warning' },
        { label: 'Leave', value: counts.leave, icon: Palmtree, className: 'text-info' },
      ]
    : [
        { label: 'Total Staff', value: counts.totalStaff, icon: Users, className: 'text-foreground' },
        { label: 'Present', value: counts.present, icon: CalendarCheck, className: 'text-success' },
        { label: 'Absent', value: counts.absent, icon: CalendarCheck, className: 'text-destructive' },
        { label: 'Late', value: counts.late, icon: Clock, className: 'text-warning' },
      ];

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3 sm:flex sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="h-5 w-5 text-primary" /> {isPersonal ? 'My Attendance' : 'Attendance'}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
        </div>
          <div className="flex flex-wrap items-center gap-2">
          <Select value={mode} onValueChange={(value) => setMode(value as PeriodMode)}>
            <SelectTrigger className="h-9 w-[112px]" aria-label="Attendance period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          {(mode === 'day' || mode === 'week') && (
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                if (event.target.value) setSelectedDate(event.target.value);
              }}
              className="h-9 w-[145px]"
              aria-label={mode === 'day' ? 'Attendance date' : 'Attendance week'}
            />
          )}
          {mode === 'month' && (
            <Input
              type="month"
              value={selectedMonth}
              onChange={(event) => {
                if (event.target.value) setSelectedMonth(event.target.value);
              }}
              className="h-9 w-[145px]"
              aria-label="Attendance month"
            />
          )}
            {onOpenReports && (
              <Button variant="ghost" size="sm" onClick={onOpenReports} className="h-9 px-2">
                {isPersonal ? 'Calendar' : 'Reports'} <ChevronRight className="h-4 w-4" />
              </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex min-h-[72px] items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="min-h-[72px] content-center text-sm text-destructive">{error}</div>
        ) : (
            <div className={`grid grid-cols-2 divide-x divide-y overflow-hidden rounded-md border ${isPersonal ? 'sm:grid-cols-5 sm:divide-y-0' : 'sm:grid-cols-4 sm:divide-y-0'}`}>
            {metrics.map(({ label, value, icon: Icon, className }) => (
              <div key={label} className="min-w-0 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </div>
                <div className={`mt-1 text-2xl font-bold ${className}`}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardAttendanceCard;