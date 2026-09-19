import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Calendar, Download, Upload, Loader2, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import StaffAttendanceReports from './StaffAttendanceReports';
import { useShiftDefinitions, resolveShift } from '@/lib/attendanceShifts';
import { isManagerLike } from '@/lib/accessLevels';

interface StaffRow {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
  department: string | null;
  biometric_code?: string | null;
}


interface AttendanceRecord {
  id?: string;
  staff_id: string;
  attendance_status: string;
  shift_name?: string | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
}

const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'leave', label: 'Leave' },
];

const StaffAttendanceManagement: React.FC = () => {
  const { user, userRole, userDesignation, userProfile } = useAuth();
  const canImport = isManagerLike(userRole, userDesignation, userProfile?.role);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const { shifts } = useShiftDefinitions();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, attendanceRes] = await Promise.all([
        (supabase.from('staff') as any).select('*').eq('is_active', true).not('role', 'in', '(doctor,admin)').order('staff_code'),
        supabase.from('staff_daily_activities').select('id, staff_id, attendance_status, shift_name, shift_start_time, shift_end_time').eq('activity_date', selectedDate),
      ]);

      if (staffRes.error) throw staffRes.error;
      if (attendanceRes.error) throw attendanceRes.error;

      setStaffList((staffRes.data || []) as StaffRow[]);

      const map: Record<string, AttendanceRecord> = {};
      (attendanceRes.data || []).forEach((r: any) => {
        map[r.staff_id] = {
          id: r.id,
          staff_id: r.staff_id,
          attendance_status: r.attendance_status,
          shift_name: (r as any).shift_name,
          shift_start_time: r.shift_start_time,
          shift_end_time: r.shift_end_time,
        };
      });
      setAttendanceMap(map);
    } catch (err: any) {
      toast.error('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const upsertAttendance = async (staffId: string, field: string, value: string) => {
    const existing = attendanceMap[staffId];
    const record: any = {
      staff_id: staffId,
      activity_date: selectedDate,
      attendance_status: existing?.attendance_status || 'present',
      shift_start_time: existing?.shift_start_time || null,
      shift_end_time: existing?.shift_end_time || null,
      recorded_by: user?.id,
      [field]: value || null,
    };

    if (existing?.id) {
      const { error } = await supabase.from('staff_daily_activities').update({
        [field]: value || null,
        recorded_by: user?.id,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
      if (error) { toast.error('Update failed: ' + error.message); return; }
    } else {
      const { data, error } = await supabase.from('staff_daily_activities').insert(record).select('id').single();
      if (error) { toast.error('Insert failed: ' + error.message); return; }
      record.id = data.id;
    }

    setAttendanceMap(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], ...record, id: existing?.id || record.id },
    }));
  };

  const downloadTemplate = () => {
    const sample = {
      staff_code: '⚠️ SAMPLE ROW - ignored on import',
      full_name: 'John Smith (sample)',
      attendance_status: 'present | late | absent | half_day | leave',
      shift_start_time: '09:00',
      shift_end_time: '17:30',
    };
    const rows = [sample, ...staffList.map(s => ({
      staff_code: s.staff_code,
      full_name: s.full_name,
      attendance_status: '',
      shift_start_time: '',
      shift_end_time: '',
    }))];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 34 }, { wch: 26 }, { wch: 40 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_template_${selectedDate}.xlsx`);
    toast.success('Template downloaded (first row is a sample and is skipped on import)');
  };

  const isSampleRow = (row: any) => {
    const text = Object.values(row || {}).map(v => String(v ?? '')).join(' ').toLowerCase();
    return text.includes('⚠️') || text.includes('sample row') || text.includes('(sample)');
  };

  const norm = (v: any) => String(v ?? '').trim().toLowerCase().replace(/^(mr|mrs|ms|dr)\.?\s+/i, '').replace(/\s+/g, ' ');

  const excelDateToISO = (raw: any): string | null => {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') {
      const d = XLSX.SSF.parse_date_code(raw);
      if (!d) return null;
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
    const s = String(raw).trim();
    const m = s.match(/(\d{1,2})[-/\s]([A-Za-z]{3,}|\d{1,2})[-/\s](\d{2,4})/);
    if (m) {
      const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const monRaw = m[2].toLowerCase();
      const mon = /^\d+$/.test(monRaw) ? parseInt(monRaw, 10) : months.indexOf(monRaw.slice(0, 3)) + 1;
      if (!mon) return null;
      const year = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
      return `${year}-${String(mon).padStart(2, '0')}-${String(parseInt(m[1], 10)).padStart(2, '0')}`;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : format(d, 'yyyy-MM-dd');
  };

  /** Detects and parses a biometric "Employee Punch Monitor" export. */
  const parsePunchSheet = (grid: any[][]) => {
    let headerIdx = -1;
    let empCol = -1, nameCol = -1, punchCol = -1, statusCol = -1, lastPunchCol = -1;

    for (let r = 0; r < Math.min(grid.length, 40); r++) {
      const row = grid[r] || [];
      const idx = row.findIndex(c => norm(c) === 'emp code');
      if (idx >= 0) {
        headerIdx = r;
        empCol = idx;
        row.forEach((c, i) => {
          const label = norm(c);
          if (label === 'name') nameCol = i;
          else if (label === 'punch records') punchCol = i;
          else if (label === 'status') statusCol = i;
          else if (label === 'last punch') lastPunchCol = i;
        });
        break;
      }
    }
    if (headerIdx === -1) return null;

    // Date lives in a header cell above the table ("Date  06-Aug-2026")
    let punchDate: string | null = null;
    for (let r = 0; r < headerIdx; r++) {
      const row = grid[r] || [];
      const labelIdx = row.findIndex(c => norm(c) === 'date');
      if (labelIdx >= 0) {
        for (let c = labelIdx + 1; c < row.length; c++) {
          const iso = excelDateToISO(row[c]);
          if (iso) { punchDate = iso; break; }
        }
      }
      if (punchDate) break;
    }

    const records = grid.slice(headerIdx + 1)
      .map(row => ({
        empCode: String(row?.[empCol] ?? '').trim(),
        name: String(row?.[nameCol] ?? '').trim(),
        punches: String(row?.[punchCol] ?? '').split(',').map(p => p.trim()).filter(p => /^\d{1,2}:\d{2}/.test(p)),
        lastPunch: String(row?.[lastPunchCol] ?? '').trim(),
        status: norm(row?.[statusCol]),
      }))
      .filter(r => r.empCode);

    return records.length ? { punchDate, records } : null;
  };
  /**
   * Detects and parses a multi-day "Daily Attendance Report (Summary Report)" export.
   * Layout: repeated blocks of
   *   Employee Code: <code>  Employee Name : <name>
   *   Date | InTime | OutTime | Shift | Total Duration | Status
   *   <one row per date …>
   *   Total Duration=… , PresentDays=… (block footer)
   */
  const parseRangeSummarySheet = (grid: any[][]) => {
    type Day = { date: string; inTime: string; outTime: string; status: string };
    const blocks: { empCode: string; name: string; days: Day[] }[] = [];

    const cells = (r: number) => (grid[r] || []).map(c => String(c ?? '').trim());

    for (let r = 0; r < grid.length; r++) {
      const row = cells(r);
      const codeIdx = row.findIndex(c => /^employee\s*code\s*:?$/i.test(c));
      if (codeIdx < 0) continue;

      // employee code = first non-empty cell to the right
      let empCode = '';
      let nameLabelIdx = -1;
      for (let c = codeIdx + 1; c < row.length; c++) {
        if (/^employee\s*name\s*:?$/i.test(row[c])) { nameLabelIdx = c; break; }
        if (!empCode && row[c]) empCode = row[c];
      }
      let name = '';
      if (nameLabelIdx >= 0) {
        for (let c = nameLabelIdx + 1; c < row.length; c++) {
          if (row[c]) { name = row[c]; break; }
        }
      }
      if (!empCode) continue;

      // locate the column header row for this block
      let headerIdx = -1;
      for (let h = r + 1; h < Math.min(r + 5, grid.length); h++) {
        if (cells(h).some(c => /^date$/i.test(c))) { headerIdx = h; break; }
      }
      if (headerIdx === -1) continue;

      const hdr = cells(headerIdx);
      const col = (re: RegExp) => hdr.findIndex(c => re.test(c));
      const dateCol = col(/^date$/i);
      const inCol = col(/^in\s*time$/i);
      const outCol = col(/^out\s*time$/i);
      const statusCol = col(/^status$/i);

      const days: Day[] = [];
      let rr = headerIdx + 1;
      for (; rr < grid.length; rr++) {
        const dr = cells(rr);
        const joined = dr.join(' ');
        if (/employee\s*code\s*:?/i.test(joined)) break;
        if (/total\s*duration\s*=/i.test(joined)) break;
        const iso = excelDateToISO(dr[dateCol]);
        if (!iso) continue;
        days.push({
          date: iso,
          inTime: inCol >= 0 ? dr[inCol] : '',
          outTime: outCol >= 0 ? dr[outCol] : '',
          status: statusCol >= 0 ? dr[statusCol] : '',
        });
      }

      if (days.length) blocks.push({ empCode, name, days });
      r = rr - 1;
    }

    return blocks.length ? blocks : null;
  };

  /** Maps a summary-report status + punch times to our attendance status. */
  const mapRangeStatus = (
    rawStatus: string,
    inTime: string,
  ): { status: string; shiftName: string | null } => {
    const s = rawStatus.toLowerCase();
    const punched = /^\d{1,2}:\d{2}/.test(inTime);
    if (s.includes('half')) return { status: 'half_day', shiftName: null };
    if (s.includes('holiday') || s.includes('leave')) return { status: 'leave', shiftName: null };
    if (punched) {
      const r = resolveShift(inTime, shifts);
      return { status: r.isLate ? 'late' : 'present', shiftName: r.shiftName };
    }
    return { status: 'absent', shiftName: null };
  };


  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });

      const punch = parsePunchSheet(grid);
      const range = punch ? null : parseRangeSummarySheet(grid);
      const upserts: any[] = [];
      let skipped = 0;
      const unmatched: string[] = [];
      const createdStaff: string[] = [];

      let targetDate = selectedDate;
      let rangeFrom = '';
      let rangeTo = '';

      if (range) {
        // ---- Multi-day summary report ----
        const byBiometric: Record<string, string> = {};
        const byName: Record<string, string> = {};
        staffList.forEach(s => {
          const bio = String(s.biometric_code ?? '').trim().toLowerCase();
          if (bio) byBiometric[bio] = s.id;
          byName[norm(s.full_name)] = s.id;
        });

        for (const block of range) {
          let staffId = byBiometric[block.empCode.toLowerCase()] || byName[norm(block.name)];

          if (!staffId) {
            const { data: newId, error: createErr } = await supabase.rpc(
              'create_placeholder_staff_from_biometric',
              { _biometric_code: block.empCode, _full_name: block.name || null },
            );
            if (createErr || !newId) {
              skipped += block.days.length;
              if (unmatched.length < 8) unmatched.push(`${block.empCode} ${block.name}`.trim());
              continue;
            }
            staffId = newId as string;
            byBiometric[block.empCode.toLowerCase()] = staffId;
            createdStaff.push(`${block.empCode} ${block.name}`.trim());
          }

          for (const day of block.days) {
            if (!rangeFrom || day.date < rangeFrom) rangeFrom = day.date;
            if (!rangeTo || day.date > rangeTo) rangeTo = day.date;
            const start = /^\d{1,2}:\d{2}/.test(day.inTime) ? day.inTime.slice(0, 5) : null;
            const end = /^\d{1,2}:\d{2}/.test(day.outTime) ? day.outTime.slice(0, 5) : null;
            const mapped = mapRangeStatus(day.status, day.inTime);
            upserts.push({
              staff_id: staffId,
              activity_date: day.date,
              attendance_status: mapped.status,
              shift_name: mapped.shiftName,
              shift_start_time: start,
              shift_end_time: end,
              recorded_by: user?.id,
            });
          }
        }
        if (rangeTo) targetDate = rangeTo;
      } else if (punch) {
        // ---- Biometric punch file ----

        if (punch.punchDate) targetDate = punch.punchDate;

        const byBiometric: Record<string, string> = {};
        const byName: Record<string, string> = {};
        staffList.forEach(s => {
          const bio = String(s.biometric_code ?? '').trim().toLowerCase();
          if (bio) byBiometric[bio] = s.id;
          byName[norm(s.full_name)] = s.id;
        });

        for (const rec of punch.records) {
          let staffId = byBiometric[rec.empCode.toLowerCase()] || byName[norm(rec.name)];

          // Biometric code present in the file but no staff record yet →
          // create a placeholder staff record so attendance is never lost.
          if (!staffId) {
            const { data: newId, error: createErr } = await supabase.rpc(
              'create_placeholder_staff_from_biometric',
              { _biometric_code: rec.empCode, _full_name: rec.name || null },
            );
            if (createErr || !newId) {
              skipped++;
              if (unmatched.length < 8) unmatched.push(`${rec.empCode} ${rec.name}`.trim());
              continue;
            }
            staffId = newId as string;
            byBiometric[rec.empCode.toLowerCase()] = staffId;
            createdStaff.push(`${rec.empCode} ${rec.name}`.trim());
          }


          const start = rec.punches[0] || null;
          const end = rec.punches.length > 1 ? rec.punches[rec.punches.length - 1] : (rec.lastPunch || null);
          let status: string;
          let shiftName: string | null = null;
          if (rec.punches.length || rec.lastPunch) {
            const r = resolveShift(start, shifts);
            shiftName = r.shiftName;
            status = r.isLate ? 'late' : 'present';
          } else {
            status = 'absent';
          }

          upserts.push({
            staff_id: staffId,
            activity_date: targetDate,
            attendance_status: status,
            shift_name: shiftName,
            shift_start_time: start ? start.slice(0, 5) : null,
            shift_end_time: end ? end.slice(0, 5) : null,
            recorded_by: user?.id,
          });
        }
      } else {
        // ---- Standard template ----
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        const staffCodeMap: Record<string, string> = {};
        staffList.forEach(s => { staffCodeMap[s.staff_code.toLowerCase()] = s.id; });

        for (const row of rows) {
          if (isSampleRow(row)) continue; // omit sample row
          const staffId = staffCodeMap[String(row.staff_code || '').trim().toLowerCase()];
          if (!staffId) { skipped++; continue; }

          const status = String(row.attendance_status || '').trim().toLowerCase();
          if (!['present', 'late', 'absent', 'half_day', 'leave'].includes(status)) { skipped++; continue; }

          upserts.push({
            staff_id: staffId,
            activity_date: selectedDate,
            attendance_status: status,
            shift_start_time: row.shift_start_time ? String(row.shift_start_time).slice(0, 5) : null,
            shift_end_time: row.shift_end_time ? String(row.shift_end_time).slice(0, 5) : null,
            recorded_by: user?.id,
          });
        }
      }

      let success = 0;
      let saveError: string | null = null;
      let rejected = 0;
      const noteError = (error: any, count: number) => {
        rejected += count;
        if (!saveError) {
          const msg = String(error?.message || '');
          saveError = /row-level security|permission denied/i.test(msg)
            ? 'You do not have permission to save attendance records. Ask an admin to grant attendance access.'
            : msg || 'Unknown database error';
        }
      };
      if (range) {
        // batch upserts — a month × 60 staff is ~1,800 rows
        for (let i = 0; i < upserts.length; i += 200) {
          const chunk = upserts.slice(i, i + 200);
          const { error } = await supabase.from('staff_daily_activities').upsert(chunk, {
            onConflict: 'staff_id,activity_date',
          });
          if (error) { noteError(error, chunk.length); continue; }
          success += chunk.length;
        }
      } else {
        for (const record of upserts) {
          const { error } = await supabase.from('staff_daily_activities').upsert(record, {
            onConflict: 'staff_id,activity_date',
          });
          if (error) { noteError(error, 1); continue; }
          success++;
        }
      }

      if (saveError) {
        toast.error(`${rejected} record(s) could not be saved`, { description: saveError });
      }

      if ((punch || range) && targetDate !== selectedDate) setSelectedDate(targetDate);

      const descParts: string[] = [];
      if (createdStaff.length) {
        descParts.push(
          `${createdStaff.length} new staff record(s) created from biometric codes (${createdStaff.slice(0, 6).join(', ')}${createdStaff.length > 6 ? '…' : ''}) — complete their details in Staff Master.`
        );
      }
      if (unmatched.length) {
        descParts.push(`Could not map: ${unmatched.join(', ')}${skipped > unmatched.length ? '…' : ''}`);
      }

      toast.success(
        range
          ? `Range report imported: ${success} record(s) for ${range.length} staff (${rangeFrom} to ${rangeTo})${skipped ? `, ${skipped} skipped` : ''}`
          : `${punch ? 'Punch file' : 'Template'} imported: ${success} record(s) for ${targetDate}${skipped ? `, ${skipped} skipped` : ''}`,
        descParts.length ? { description: descParts.join(' ') } : undefined
      );


      fetchData();
    } catch (err: any) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-50';
      case 'late': return 'text-yellow-600 bg-yellow-50';
      case 'absent': return 'text-red-600 bg-red-50';
      case 'half_day': return 'text-orange-600 bg-orange-50';
      case 'leave': return 'text-blue-600 bg-blue-50';
      default: return '';
    }
  };

  const presentCount = Object.values(attendanceMap).filter(a => a.attendance_status === 'present').length;
  const absentCount = Object.values(attendanceMap).filter(a => a.attendance_status === 'absent').length;
  const lateCount = Object.values(attendanceMap).filter(a => a.attendance_status === 'late').length;
  const unmarkedCount = staffList.length - Object.keys(attendanceMap).length;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="daily" className="w-full">
        <TabsList>
          <TabsTrigger value="daily" className="gap-1.5">
            <Calendar className="h-4 w-4" /> Daily Entry
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Staff Attendance
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-auto"
                  />
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-1" /> Template
                  </Button>
                  {shifts.filter(s => s.is_active).length > 0 && (
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      Late after:{' '}
                      {shifts
                        .filter(s => s.is_active)
                        .map(s => {
                          const [h, m] = s.start_time.slice(0, 5).split(':').map(Number);
                          const t = (h * 60 + m + (s.grace_minutes || 0)) % 1440;
                          const hh = String(Math.floor(t / 60)).padStart(2, '0');
                          const mm = String(t % 60).padStart(2, '0');
                          return `${s.shift_name.replace(/ shift$/i, '')} ${hh}:${mm}`;
                        })
                        .join(' · ')}
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                    {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    Import
                  </Button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Import accepts our template (first sample row is ignored), a single-day biometric “Employee Punch Monitor” export,
                or a multi-day “Daily Attendance Report (Summary Report)” covering a full week or month — the format is detected
                automatically and staff are matched by their biometric code, then by name. The shift (morning / second / night)
                is detected from the first punch using the shift timings set in Masters → Shifts.
              </p>
            </CardHeader>

            <CardContent>
              {/* Summary chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium">Total: {staffList.length}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Present: {presentCount}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">Absent: {absentCount}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">Late: {lateCount}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">Unmarked: {unmarkedCount}</span>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="border rounded-md overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Role</TableHead>
                        <TableHead className="hidden md:table-cell">Department</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="w-[120px] hidden md:table-cell">Shift</TableHead>
                        <TableHead className="w-[120px] hidden sm:table-cell">Shift Start</TableHead>
                        <TableHead className="w-[120px] hidden sm:table-cell">Shift End</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffList.map(staff => {
                        const att = attendanceMap[staff.id];
                        return (
                          <TableRow key={staff.id}>
                            <TableCell className="font-mono text-xs">{staff.staff_code}</TableCell>
                            <TableCell className="font-medium text-sm">{staff.full_name}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs capitalize">{staff.role?.replace('_', ' ')}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs">{staff.department || '-'}</TableCell>
                            <TableCell>
                              <Select
                                value={att?.attendance_status || ''}
                                onValueChange={val => upsertAttendance(staff.id, 'attendance_status', val)}
                              >
                                <SelectTrigger className={`h-8 text-xs ${att ? getStatusColor(att.attendance_status) : ''}`}>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ATTENDANCE_STATUSES.map(s => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs">
                              {att?.shift_name || '-'}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Input
                                type="time"
                                value={att?.shift_start_time || ''}
                                onChange={e => upsertAttendance(staff.id, 'shift_start_time', e.target.value)}
                                className="h-8 text-xs"
                              />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Input
                                type="time"
                                value={att?.shift_end_time || ''}
                                onChange={e => upsertAttendance(staff.id, 'shift_end_time', e.target.value)}
                                className="h-8 text-xs"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {staffList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No active staff found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <StaffAttendanceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffAttendanceManagement;
