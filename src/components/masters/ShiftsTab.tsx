import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useShiftDefinitions, ShiftDefinition, hhmm } from '@/lib/attendanceShifts';
import { isManagerLike } from '@/lib/accessLevels';

interface Props { searchTerm?: string }

const ShiftsTab: React.FC<Props> = ({ searchTerm = '' }) => {
  const { userRole, userDesignation, userProfile } = useAuth();
  const canEdit = isManagerLike(userRole, userDesignation, (userProfile as any)?.role);
  const { shifts, loading, reload } = useShiftDefinitions();
  const [draft, setDraft] = useState<Record<string, Partial<ShiftDefinition>>>({});
  const [saving, setSaving] = useState(false);

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
      toast.success('Shift timings saved');
      reload();
    } catch (e: any) {
      toast.error('Could not save shifts: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const rows = shifts.filter(s =>
    !searchTerm || s.shift_name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" /> Shift Timings
        </CardTitle>
        {canEdit && Object.keys(draft).length > 0 && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          A punch is placed in the shift whose detection window it falls into. Anyone arriving later than the
          grace minutes is marked Late. A punch outside every window joins the nearest shift and is marked Late.
        </p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift</TableHead>
                  <TableHead className="w-[120px]">Start</TableHead>
                  <TableHead className="w-[120px]">End</TableHead>
                  <TableHead className="w-[130px]">Window From</TableHead>
                  <TableHead className="w-[130px]">Window To</TableHead>
                  <TableHead className="w-[110px]">Grace (min)</TableHead>
                  <TableHead className="w-[90px]">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.shift_name}</TableCell>
                    {(['start_time', 'end_time', 'window_from', 'window_to'] as const).map(f => (
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
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        disabled={!canEdit}
                        value={value(s, 'grace_minutes') ?? 0}
                        onChange={e => setField(s.id, 'grace_minutes', Number(e.target.value))}
                        className="h-9 text-xs w-[90px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        disabled={!canEdit}
                        checked={!!value(s, 'is_active')}
                        onCheckedChange={v => setField(s.id, 'is_active', v)}
                      />
                    </TableCell>
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
