import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useShiftDefinitions, ShiftDefinition, hhmm } from '@/lib/attendanceShifts';
import { isManagerLike } from '@/lib/accessLevels';

interface Props { searchTerm?: string }

const TIME_FIELDS = ['start_time', 'end_time', 'window_from', 'window_to'] as const;

const ShiftsTab: React.FC<Props> = ({ searchTerm = '' }) => {
  const { userRole, userDesignation, userProfile } = useAuth();
  const canEdit = isManagerLike(userRole, userDesignation, (userProfile as any)?.role);
  const { shifts, loading, reload } = useShiftDefinitions();
  const [draft, setDraft] = useState<Record<string, Partial<ShiftDefinition>>>({});
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  const value = (s: ShiftDefinition, field: keyof ShiftDefinition) =>
    (draft[s.id]?.[field] ?? s[field]) as any;

  const setField = (id: string, field: keyof ShiftDefinition, v: any) =>
    setDraft(prev => ({ ...prev, [id]: { ...prev[id], [field]: v } }));

  const save = async () => {
    setSaving(true);
    try {
      for (const [id, changes] of Object.entries(draft)) {
        const { error } = await (supabase as any)
          .from('shift_definitions')
          .update(changes)
          .eq('id', id);
        if (error) throw error;
      }
      setDraft({});
      toast.success('Shift settings saved');
      reload();
    } catch (e: any) {
      toast.error('Could not save shifts: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const nextCode = () => {
    const codes = new Set(shifts.map(s => s.shift_code));
    let n = 1;
    while (codes.has('S' + n)) n++;
    return 'S' + n;
  };

  const addShift = async () => {
    setAdding(true);
    try {
      const code = nextCode();
      const { error } = await (supabase as any).from('shift_definitions').insert({
        shift_code: code,
        shift_letter: code.slice(-1),
        shift_name: 'New Shift ' + code,
        start_time: '09:00:00',
        end_time: '18:00:00',
        window_from: '08:00:00',
        window_to: '10:00:00',
        grace_minutes: 15,
        extra_late_minutes: 15,
        extra_late_max_per_month: 3,
        sort_order: shifts.length + 1,
        is_active: true,
      });
      if (error) throw error;
      toast.success('Shift ' + code + ' added — set its timings and Save');
      reload();
    } catch (e: any) {
      toast.error('Could not add shift: ' + e.message);
    } finally {
      setAdding(false);
    }
  };

  const removeShift = async (s: ShiftDefinition) => {
    if (!window.confirm(`Delete shift "${s.shift_name}"? Staff mapped to it will fall back to auto-detection.`)) return;
    const { error } = await (supabase as any).from('shift_definitions').delete().eq('id', s.id);
    if (error) { toast.error('Could not delete: ' + error.message); return; }
    toast.success('Shift deleted');
    reload();
  };

  const rows = shifts.filter(s => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return s.shift_name.toLowerCase().includes(q) || (s.shift_code || '').toLowerCase().includes(q);
  });

  const numCell = (s: ShiftDefinition, field: keyof ShiftDefinition, w = 'w-[80px]') => (
    <TableCell>
      <Input
        type="number"
        min={0}
        disabled={!canEdit}
        value={value(s, field) ?? 0}
        onChange={e => setField(s.id, field, Number(e.target.value))}
        className={`h-9 text-xs ${w}`}
      />
    </TableCell>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" /> Shift Master
        </CardTitle>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addShift} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add shift
            </Button>
            {Object.keys(draft).length > 0 && (
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-4 space-y-1">
          <p>
            A punch is placed in the shift whose detection window it falls into (or the staff member's default shift /
            Shift Planner override). A punch outside every window joins the nearest shift.
          </p>
          <p>
            <b>Grace</b> is always forgiven. <b>Extra-late</b> is a further band forgiven only up to{' '}
            <b>Times / cycle</b> per pay cycle. Beyond that, the full late time is taken from the permission balance
            and then deducted from pay.
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No shifts yet. Use “Add shift”.</p>
        ) : (
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead className="w-[70px]">Badge</TableHead>
                  <TableHead className="min-w-[160px]">Shift name</TableHead>
                  <TableHead className="w-[120px]">Start</TableHead>
                  <TableHead className="w-[120px]">End</TableHead>
                  <TableHead className="w-[120px]">Window from</TableHead>
                  <TableHead className="w-[120px]">Window to</TableHead>
                  <TableHead className="w-[90px]">Grace (min)</TableHead>
                  <TableHead className="w-[100px]">Extra-late (min)</TableHead>
                  <TableHead className="w-[90px]">Times / cycle</TableHead>
                  <TableHead className="w-[70px]">Active</TableHead>
                  {canEdit && <TableHead className="w-[50px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Input
                        disabled={!canEdit}
                        value={value(s, 'shift_code') || ''}
                        onChange={e => setField(s.id, 'shift_code', e.target.value.toUpperCase())}
                        className="h-9 text-xs w-[70px] font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        disabled={!canEdit}
                        maxLength={2}
                        value={value(s, 'shift_letter') || ''}
                        onChange={e => setField(s.id, 'shift_letter', e.target.value.toUpperCase())}
                        className="h-9 text-xs w-[55px] font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        disabled={!canEdit}
                        value={value(s, 'shift_name') || ''}
                        onChange={e => setField(s.id, 'shift_name', e.target.value)}
                        className="h-9 text-xs"
                      />
                    </TableCell>
                    {TIME_FIELDS.map(f => (
                      <TableCell key={f}>
                        <Input
                          type="time"
                          disabled={!canEdit}
                          value={hhmm(value(s, f)) || ''}
                          onChange={e => setField(s.id, f, e.target.value + ':00')}
                          className="h-9 text-xs w-[110px]"
                        />
                      </TableCell>
                    ))}
                    {numCell(s, 'grace_minutes')}
                    {numCell(s, 'extra_late_minutes')}
                    {numCell(s, 'extra_late_max_per_month')}
                    <TableCell>
                      <Switch
                        disabled={!canEdit}
                        checked={!!value(s, 'is_active')}
                        onCheckedChange={v => setField(s.id, 'is_active', v)}
                      />
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeShift(s)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShiftsTab;
