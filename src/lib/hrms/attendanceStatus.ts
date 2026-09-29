/** HRMS attendance statuses (enum public.attendance_status) and free-text mapping. */
export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'leave', label: 'Leave (CL)' },
  { value: 'weekly_off', label: 'Weekly Off' },
  { value: 'holiday', label: 'Holiday' },
];

const VALID_STATUSES: string[] = ATTENDANCE_STATUSES.map(s => s.value);

/** HRMS: maps free-text status from templates / device exports to our enum (null = unknown). */
export const mapStatusText = (raw: string): string | null => {
  const s = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!s) return null;
  if (VALID_STATUSES.includes(s)) return s;
  if (/^(wo|w_o|weekly_off|week_off|weekoff|off)$/.test(s)) return 'weekly_off';
  if (/holiday|^h$|^ph$/.test(s)) return 'holiday';
  if (/half/.test(s)) return 'half_day';
  if (/^(cl|casual_leave|leave|on_leave|el|sl)$/.test(s)) return 'leave';
  if (/^(a|ab|absent|not_present)$/.test(s)) return 'absent';
  if (/^(p|present)$/.test(s)) return 'present';
  if (/^(l|late)$/.test(s)) return 'late';
  return null;
};
