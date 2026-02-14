import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Calendar, Download, Upload, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface StaffRow {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
  department: string | null;
}

interface AttendanceRecord {
  id?: string;
  staff_id: string;
  attendance_status: string;
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
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, attendanceRes] = await Promise.all([
        supabase.from('staff').select('id, staff_code, full_name, role, department').eq('is_active', true).order('staff_code'),
        supabase.from('staff_daily_activities').select('id, staff_id, attendance_status, shift_start_time, shift_end_time').eq('activity_date', selectedDate),
      ]);

      if (staffRes.error) throw staffRes.error;
      if (attendanceRes.error) throw attendanceRes.error;

      setStaffList(staffRes.data || []);
      const map: Record<string, AttendanceRecord> = {};
      (attendanceRes.data || []).forEach((r: any) => {
        map[r.staff_id] = {
          id: r.id,
          staff_id: r.staff_id,
          attendance_status: r.attendance_status,
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
    const rows = staffList.map(s => ({
      staff_code: s.staff_code,
      full_name: s.full_name,
      attendance_status: '',
      shift_start_time: '',
      shift_end_time: '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_template_${selectedDate}.xlsx`);
    toast.success('Template downloaded');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      const staffCodeMap: Record<string, string> = {};
      staffList.forEach(s => { staffCodeMap[s.staff_code.toLowerCase()] = s.id; });

      let success = 0, skipped = 0;
      for (const row of rows) {
        const code = String(row.staff_code || '').trim().toLowerCase();
        const staffId = staffCodeMap[code];
        if (!staffId) { skipped++; continue; }

        const status = String(row.attendance_status || '').trim().toLowerCase();
        if (!['present', 'late', 'absent', 'half_day', 'leave'].includes(status)) { skipped++; continue; }

        const record: any = {
          staff_id: staffId,
          activity_date: selectedDate,
          attendance_status: status,
          shift_start_time: row.shift_start_time ? String(row.shift_start_time) : null,
          shift_end_time: row.shift_end_time ? String(row.shift_end_time) : null,
          recorded_by: user?.id,
        };

        const { error } = await supabase.from('staff_daily_activities').upsert(record, {
          onConflict: 'staff_id,activity_date',
        });
        if (error) { skipped++; continue; }
        success++;
      }

      toast.success(`Imported ${success} records${skipped ? `, ${skipped} skipped` : ''}`);
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
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Import
              </Button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </div>
          </div>
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
    </div>
  );
};

export default StaffAttendanceManagement;
