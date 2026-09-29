import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

export interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  default_priority: string;
  is_active: boolean;
  display_order: number;
}

export const fetchTaskTemplates = async (activeOnly = true): Promise<TaskTemplate[]> => {
  let q = (supabase as any).from('task_templates').select('*').order('display_order').order('title');
  if (activeOnly) q = q.eq('is_active', true);
  const { data } = await q;
  return (data || []) as TaskTemplate[];
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged?: () => void;
}

/** HRMS: manage reusable task templates. */
const TaskTemplatesDialog: React.FC<Props> = ({ open, onOpenChange, onChanged }) => {
  const [rows, setRows] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', default_priority: 'medium' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setRows(await fetchTaskTemplates(false));
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const add = async () => {
    if (!draft.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const { error } = await (supabase as any).from('task_templates').insert({
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      default_priority: draft.default_priority,
      display_order: rows.length + 1,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDraft({ title: '', description: '', default_priority: 'medium' });
    toast.success('Template added');
    load(); onChanged?.();
  };

  const update = async (t: TaskTemplate, patch: Partial<TaskTemplate>) => {
    const { error } = await (supabase as any).from('task_templates').update(patch).eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    load(); onChanged?.();
  };

  const remove = async (t: TaskTemplate) => {
    if (!window.confirm(`Delete template "${t.title}"?`)) return;
    const { error } = await (supabase as any).from('task_templates').delete().eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    load(); onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task templates</DialogTitle>
          <DialogDescription>Reusable tasks you can pick when assigning work.</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-2">
            <Input placeholder="Template title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
            <Select value={draft.default_priority} onValueChange={v => setDraft({ ...draft, default_priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['low', 'medium', 'high', 'urgent'].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea rows={2} placeholder="Description / checklist" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
          <div className="flex justify-end">
            <Button size="sm" onClick={add} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add template
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {rows.map(t => <TemplateRow key={t.id} t={t} onSave={update} onDelete={remove} />)}
            {rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No templates yet.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TemplateRow: React.FC<{
  t: TaskTemplate;
  onSave: (t: TaskTemplate, patch: Partial<TaskTemplate>) => void;
  onDelete: (t: TaskTemplate) => void;
}> = ({ t, onSave, onDelete }) => {
  const [title, setTitle] = useState(t.title);
  const [description, setDescription] = useState(t.description || '');
  const [priority, setPriority] = useState(t.default_priority);
  const dirty = title !== t.title || description !== (t.description || '') || priority !== t.default_priority;

  return (
    <div className={`rounded-md border p-2 space-y-2 ${t.is_active ? '' : 'opacity-60'}`}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-2 items-center">
        <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9" />
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['low', 'medium', 'high', 'urgent'].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1 justify-end">
          {dirty && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onSave(t, { title: title.trim(), description: description.trim() || null, default_priority: priority })}>
              <Save className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => onSave(t, { is_active: !t.is_active })}>
            {t.is_active ? 'Disable' : 'Enable'}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(t)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="text-xs" />
    </div>
  );
};

export default TaskTemplatesDialog;
