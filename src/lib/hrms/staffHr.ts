import { supabase } from '@/integrations/supabase/client';

/** HRMS fields kept on the staff row (see migration 0008). */
export interface StaffHrFields {
  reporting_manager_id: string;   // '' = none
  work_branch_id: string;         // '' = none
  default_shift_id: string;       // '' = auto-detect from punch
  monthly_cl: string;
  monthly_permission_hours: string;
  pf_applicable: boolean;
  esi_mode: 'auto' | 'yes' | 'no';
  ot_eligible: boolean;
  other_deduction: string;
  date_of_birth: string;
  date_of_joining: string;
  address: string;
  branch_change_note: string;     // UI only — written to staff_branch_history
}

export const emptyStaffHr = (): StaffHrFields => ({
  reporting_manager_id: '',
  work_branch_id: '',
  default_shift_id: '',
  monthly_cl: '1',
  monthly_permission_hours: '4',
  pf_applicable: true,
  esi_mode: 'auto',
  ot_eligible: false,
  other_deduction: '0',
  date_of_birth: '',
  date_of_joining: '',
  address: '',
  branch_change_note: '',
});

export const staffHrFromRow = (row: any): StaffHrFields => ({
  reporting_manager_id: row?.reporting_manager_id || '',
  work_branch_id: row?.work_branch_id || '',
  default_shift_id: row?.default_shift_id || '',
  monthly_cl: String(row?.monthly_cl ?? 1),
  monthly_permission_hours: String(row?.monthly_permission_hours ?? 4),
  pf_applicable: row?.pf_applicable ?? true,
  esi_mode: row?.esi_applicable === true ? 'yes' : row?.esi_applicable === false ? 'no' : 'auto',
  ot_eligible: !!row?.ot_eligible,
  other_deduction: String(row?.other_deduction ?? 0),
  date_of_birth: row?.date_of_birth || '',
  date_of_joining: row?.date_of_joining || '',
  address: row?.address || '',
  branch_change_note: '',
});

const num = (v: string, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

/**
 * Persists the HR fields on a staff row and records a branch-transfer history entry
 * whenever the work branch changes (or is set for the first time).
 */
export async function saveStaffHrFields(
  staffId: string,
  hr: StaffHrFields,
  previousBranchId: string | null | undefined,
  userId?: string | null,
): Promise<void> {
  if (hr.reporting_manager_id && hr.reporting_manager_id === staffId) {
    throw new Error('A staff member cannot be their own reporting manager');
  }
  const { error } = await (supabase as any)
    .from('staff')
    .update({
      reporting_manager_id: hr.reporting_manager_id || null,
      work_branch_id: hr.work_branch_id || null,
      default_shift_id: hr.default_shift_id || null,
      monthly_cl: num(hr.monthly_cl, 1),
      monthly_permission_hours: num(hr.monthly_permission_hours, 4),
      pf_applicable: hr.pf_applicable,
      esi_applicable: hr.esi_mode === 'auto' ? null : hr.esi_mode === 'yes',
      ot_eligible: hr.ot_eligible,
      other_deduction: num(hr.other_deduction, 0),
      date_of_birth: hr.date_of_birth || null,
      date_of_joining: hr.date_of_joining || null,
      address: hr.address.trim() || null,
    })
    .eq('id', staffId);
  if (error) throw error;

  const newBranch = hr.work_branch_id || null;
  if (newBranch && newBranch !== (previousBranchId || null)) {
    await (supabase as any).from('staff_branch_history').insert({
      staff_id: staffId,
      branch_id: newBranch,
      effective_from: new Date().toISOString().slice(0, 10),
      note: hr.branch_change_note.trim() || (previousBranchId ? 'Branch transfer' : 'Initial assignment'),
      created_by: userId || null,
    });
  }
}

export interface BranchHistoryRow {
  id: string;
  branch_id: string | null;
  effective_from: string;
  note: string | null;
  branch?: { branch_name: string } | null;
}

export async function fetchBranchHistory(staffId: string): Promise<BranchHistoryRow[]> {
  const { data } = await (supabase as any)
    .from('staff_branch_history')
    .select('id, branch_id, effective_from, note, branch:branches_master(branch_name)')
    .eq('staff_id', staffId)
    .order('effective_from', { ascending: false });
  return (data || []) as BranchHistoryRow[];
}
