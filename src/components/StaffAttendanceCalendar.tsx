import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSunday } from 'date-fns';

interface Props {
  staffId: string;
}

const statusColors: Record<string, string> = {
  present: 'bg-green-500',
  absent: 'bg-red-500',
  late: 'bg-yellow-500',
  half_day: 'bg-orange-500',
  leave: 'bg-blue-500',
};

const StaffAttendanceCalendar: React.FC<Props> = ({ staffId }) => {
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('staff_daily_activities')
        .select('activity_date, attendance_status')
        .eq('staff_id', staffId)
        .gte('activity_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('activity_date', format(monthEnd, 'yyyy-MM-dd'));

      const map: Record<string, string> = {};
      data?.forEach((d: any) => { map[d.activity_date] = d.attendance_status; });
      setAttendanceMap(map);
      setLoading(false);
    };
    fetch();
  }, [staffId]);

  const counts = {
    present: Object.values(attendanceMap).filter(s => s === 'present' || s === 'late').length,
    absent: Object.values(attendanceMap).filter(s => s === 'absent').length,
    late: Object.values(attendanceMap).filter(s => s === 'late').length,
    leave: Object.values(attendanceMap).filter(s => s === 'leave' || s === 'half_day').length,
  };

  if (loading) {
    return <Card className="animate-pulse"><CardContent className="p-4"><div className="h-32 bg-muted rounded" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span className="font-semibold">{format(now, 'MMMM yyyy')}</span>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" /> Present: {counts.present}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3 text-red-600" /> Absent: {counts.absent}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3 text-yellow-600" /> Late: {counts.late}
          </Badge>
        </div>

        {/* Mini calendar grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="text-muted-foreground font-medium py-1">{d}</span>
          ))}
          {/* Empty cells for first day offset */}
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
            <span key={`e-${i}`} />
          ))}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const status = attendanceMap[dateStr];
            const isSun = isSunday(day);
            const isFuture = day > now;

            return (
              <div
                key={dateStr}
                className={`relative aspect-square flex items-center justify-center rounded text-xs ${
                  isToday(day) ? 'ring-2 ring-primary font-bold' : ''
                } ${isSun ? 'text-muted-foreground/50' : ''}`}
              >
                {format(day, 'd')}
                {status && !isFuture && (
                  <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${statusColors[status] || 'bg-gray-400'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {Object.entries(statusColors).slice(0, 4).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className="capitalize">{key.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StaffAttendanceCalendar;
