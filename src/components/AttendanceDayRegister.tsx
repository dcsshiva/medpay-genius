import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays } from 'lucide-react';
import { format, getDay } from 'date-fns';

export interface RegisterStaff {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
  department: string | null;
}

export interface RegisterRecord {
  staff_id: string;
  attendance_status: string;
  activity_date: string;
  shift_start_time: string | null;
  shift_end_time: string | null;
}

interface Props {
  staffList: RegisterStaff[];
  records: RegisterRecord[];
  /** Inclusive list of dates (yyyy-MM-dd) to show as columns */
  days: string[];
}

const STATUS_META: Record<string, { letter: string; cls: string; label: string }> = {
  present: { letter: 'P', cls: 'bg-green-100 text-green-700', label: 'Present' },
  absent: { letter: 'A', cls: 'bg-red-100 text-red-700', label: 'Absent' },
  late: { letter: 'L', cls: 'bg-yellow-100 text-yellow-700', label: 'Late' },
  half_day: { letter: 'H', cls: 'bg-orange-100 text-orange-700', label: 'Half Day' },
  leave: { letter: 'Lv', cls: 'bg-blue-100 text-blue-700', label: 'Leave' },
};

export const registerCellText = (status?: string): string =>
  status && STATUS_META[status] ? STATUS_META[status].letter : '';

const fmtTime = (t: string | null) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

const AttendanceDayRegister: React.FC<Props> = ({ staffList, records, days }) => {
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, RegisterRecord>> = {};
    records.forEach(r => {
      if (!map[r.staff_id]) map[r.staff_id] = {};
      map[r.staff_id][r.activity_date] = r;
    });
    return map;
  }, [records]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Day-wise Register
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-auto max-h-[70vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 top-0 z-20 bg-card min-w-[150px] shadow-[1px_0_0_0_hsl(var(--border))]">Staff</TableHead>
                {days.map(d => {
                  const date = new Date(d + 'T00:00:00');
                  const isSun = getDay(date) === 0;
                  return (
                    <TableHead
                      key={d}
                      className={`text-center min-w-[34px] px-1 sticky top-0 z-10 bg-card ${isSun ? 'bg-muted text-muted-foreground' : ''}`}
                    >
                      <div className="text-[11px] leading-tight font-semibold">{format(date, 'd')}</div>
                      <div className="text-[9px] leading-tight font-normal text-muted-foreground">{format(date, 'EEE')}</div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="sticky left-0 z-10 bg-card shadow-[1px_0_0_0_hsl(var(--border))]">
                    <div className="text-xs font-medium leading-tight">{s.full_name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{s.staff_code}</div>
                  </TableCell>
                  {days.map(d => {
                    const rec = lookup[s.id]?.[d];
                    const meta = rec ? STATUS_META[rec.attendance_status] : undefined;
                    const isSun = getDay(new Date(d + 'T00:00:00')) === 0;
                    const tooltip = rec
                      ? `${format(new Date(d + 'T00:00:00'), 'dd MMM yyyy')} — ${meta?.label || rec.attendance_status}${
                          rec.shift_start_time ? ` | In: ${fmtTime(rec.shift_start_time)}` : ''
                        }${rec.shift_end_time ? ` | Out: ${fmtTime(rec.shift_end_time)}` : ''}`
                      : `${format(new Date(d + 'T00:00:00'), 'dd MMM yyyy')} — Unmarked`;
                    return (
                      <TableCell
                        key={d}
                        title={tooltip}
                        className={`text-center px-0.5 py-1 ${isSun && !meta ? 'bg-muted/40' : ''}`}
                      >
                        {meta ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${meta.cls}`}>
                            {meta.letter}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-[10px]">·</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {staffList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={days.length + 1} className="text-center text-muted-foreground py-8">
                    No staff data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
          {Object.entries(STATUS_META).map(([key, m]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${m.cls}`}>{m.letter}</span>
              <span>{m.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground/50">·</span>
            <span>Unmarked</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceDayRegister;
