import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, History } from 'lucide-react';
import { useShiftDefinitions } from '@/lib/attendanceShifts';
import { StaffHrFields, BranchHistoryRow, fetchBranchHistory } from '@/lib/hrms/staffHr';
import { formatDateIST } from '@/lib/dateUtils';

interface Props {
  value: StaffHrFields;
  onChange: (v: StaffHrFields) => void;
  /** id of the staff being edited (excluded from the manager list, used for history) */
  staffId?: string | null;
  /** branch currently saved on the record — used to show the transfer-note field */
  savedBranchId?: string | null;
}

const NONE = '__none__';

const StaffHrFieldsSection: React.FC<Props> = ({ value, onChange, staffId, savedBranchId }) => {
  const { shifts } = useShiftDefinitions();
  const [managers, setManagers] = useState<Array<{ id: string; full_name: string; staff_code: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; branch_name: string }>>([]);
  const [history, setHistory] = useState<BranchHistoryRow[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: staffRows }, { data: branchRows }] = await Promise.all([
        supabase.from('staff').select('id, full_name, staff_code').eq('is_active', true).order('full_name'),
        (supabase as any).from('branches_master').select('id, branch_name').eq('is_active', true).order('display_order'),
      ]);
      setManagers((staffRows || []) as any);
      setBranches((branchRows || []) as any);
    })();
  }, []);

  useEffect(() => {
    if (staffId) fetchBranchHistory(staffId).then(setHistory);
    else setHistory([]);
  }, [staffId]);

  const set = <K extends keyof StaffHrFields>(k: K, v: StaffHrFields[K]) => onChange({ ...value, [k]: v });
  const branchChanged = !!savedBranchId && !!value.work_branch_id && value.work_branch_id !== savedBranchId;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
        <Briefcase className="h-4 w-4 text-primary" />
        <span className="uppercase tracking-wide">HR &amp; Payroll</span>
      </div>
      <div className="space-y-3 pl-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Reporting Manager</Label>
            <Select value={value.reporting_manager_id || NONE} onValueChange={v => set('reporting_manager_id', v === NONE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-72">
                <SelectItem value={NONE}>— None —</SelectItem>
                {managers.filter(m => m.id !== staffId).map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.staff_code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Work Branch / Unit</Label>
            <Select value={value.work_branch_id || NONE} onValueChange={v => set('work_branch_id', v === NONE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Not assigned" /></SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value={NONE}>— Not assigned —</SelectItem>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {branchChanged && (
          <div className="space-y-1.5">
            <Label>Transfer note</Label>
            <Input
              value={value.branch_change_note}
              onChange={e => set('branch_change_note', e.target.value)}
              placeholder="e.g. Transferred to branch clinic from next cycle"
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Default Shift</Label>
            <Select value={value.default_shift_id || NONE} onValueChange={v => set('default_shift_id', v === NONE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Auto" /></SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value={NONE}>Auto-detect from punch</SelectItem>
                {shifts.filter(s => s.is_active).map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.shift_code ? `${s.shift_code} · ` : ''}{s.shift_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>CL / month</Label>
            <Input type="number" min={0} step="0.5" value={value.monthly_cl} onChange={e => set('monthly_cl', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Permission hrs / month</Label>
            <Input type="number" min={0} step="0.5" value={value.monthly_permission_hours} onChange={e => set('monthly_permission_hours', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label className="text-sm">PF applicable</Label>
            <Switch checked={value.pf_applicable} onCheckedChange={v => set('pf_applicable', v)} />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label className="text-sm">OT eligible</Label>
            <Switch checked={value.ot_eligible} onCheckedChange={v => set('ot_eligible', v)} />
          </div>
          <div className="space-y-1.5">
            <Label>ESI</Label>
            <Select value={value.esi_mode} onValueChange={v => set('esi_mode', v as StaffHrFields['esi_mode'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="auto">Automatic (by ESI ceiling)</SelectItem>
                <SelectItem value="yes">Always apply</SelectItem>
                <SelectItem value="no">Not applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Other deduction (₹ / month)</Label>
            <Input type="number" min={0} value={value.other_deduction} onChange={e => set('other_deduction', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Date of Joining</Label>
            <Input type="date" value={value.date_of_joining} onChange={e => set('date_of_joining', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input type="date" value={value.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Textarea rows={2} value={value.address} onChange={e => set('address', e.target.value)} />
        </div>

        {history.length > 0 && (
          <div className="rounded-md border p-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
              <History className="h-3.5 w-3.5" /> Branch history
            </div>
            <ul className="text-xs space-y-0.5">
              {history.map(h => (
                <li key={h.id} className="flex justify-between gap-2">
                  <span>{h.branch?.branch_name || '—'}{h.note ? ` · ${h.note}` : ''}</span>
                  <span className="text-muted-foreground">{formatDateIST(h.effective_from)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffHrFieldsSection;
