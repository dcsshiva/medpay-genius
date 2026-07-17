import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { printReport, PrintColumn } from './printUtils';
import { formatDateIST, formatDateTimeIST } from './dateUtils';

export interface LeaveRow {
  id: string;
  application_type: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  reason_details: string | null;
  notes: string | null;
  leave_start_date: string | null;
  leave_end_date: string | null;
  leave_days: number | null;
  leave_reason: string | null;
  is_half_day: boolean | null;
  permission_date: string | null;
  permission_start_time: string | null;
  permission_end_time: string | null;
  permission_duration_minutes: number | null;
  permission_reason: string | null;
  applicant?: { full_name?: string; staff_code?: string; role?: string } | null;
  approved_by_staff?: { full_name?: string; staff_code?: string } | null;
}

const titleCase = (s?: string | null) =>
  (s || '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const toRow = (a: LeaveRow) => {
  const isLeave = a.application_type === 'leave';
  return {
    'Applicant': a.applicant?.full_name || '-',
    'Staff Code': a.applicant?.staff_code || '-',
    'Role': titleCase(a.applicant?.role),
    'Type': titleCase(a.application_type),
    'From': isLeave ? formatDateIST(a.leave_start_date || '') : formatDateIST(a.permission_date || ''),
    'To': isLeave ? formatDateIST(a.leave_end_date || '') : formatDateIST(a.permission_date || ''),
    'Days / Duration': isLeave
      ? `${a.leave_days ?? ''} ${a.is_half_day ? 'half day' : 'day(s)'}`
      : `${a.permission_start_time || ''}-${a.permission_end_time || ''} (${a.permission_duration_minutes || 0} min)`,
    'Reason': titleCase(isLeave ? a.leave_reason : a.permission_reason),
    'Reason Details': a.reason_details || '-',
    'Applicant Notes': a.notes || '-',
    'Status': titleCase(a.status),
    'Applied On': formatDateTimeIST(a.created_at),
    'Actioned By': a.approved_by_staff?.full_name || '-',
    'Actioned On': a.approved_at ? formatDateTimeIST(a.approved_at) : '-',
    'Rejection Reason': a.rejection_reason || '-',
  };
};

const autoFit = (rows: Record<string, any>[]) => {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  return headers.map(h => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[h] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
  });
};

export const exportLeaveApplicationsToExcel = (
  applications: LeaveRow[],
  tabLabel: string
) => {
  const rows = applications.map(toRow);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoFit(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tabLabel.slice(0, 31));
  const fname = `leave-applications-${tabLabel.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`;
  XLSX.writeFile(wb, fname);
};

export const printLeaveApplications = (
  applications: LeaveRow[],
  tabLabel: string,
  subtitle?: string
) => {
  const columns: PrintColumn[] = [
    { label: 'Applicant', key: 'Applicant' },
    { label: 'Code', key: 'Staff Code' },
    { label: 'Type', key: 'Type' },
    { label: 'From', key: 'From' },
    { label: 'To', key: 'To' },
    { label: 'Days/Duration', key: 'Days / Duration' },
    { label: 'Reason', key: 'Reason' },
    { label: 'Status', key: 'Status' },
    { label: 'Applied On', key: 'Applied On' },
    { label: 'Actioned By', key: 'Actioned By' },
    { label: 'Actioned On', key: 'Actioned On' },
    { label: 'Rejection Reason', key: 'Rejection Reason' },
  ];
  printReport({
    title: `Leave & Permission - ${tabLabel}`,
    subtitle,
    columns,
    data: applications.map(toRow),
    orientation: 'landscape',
  });
};
