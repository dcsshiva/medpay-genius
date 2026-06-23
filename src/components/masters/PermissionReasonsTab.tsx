import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, FolderOpen } from 'lucide-react';

interface PermissionReason { id: string; reason_name: string; reason_code: string; description: string | null; is_active: boolean; display_order: number; }
interface Props { searchTerm?: string; }

const PermissionReasonsTab = ({ searchTerm = '' }: Props) => {
  const [reasons, setReasons] = useState<PermissionReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<PermissionReason | null>(null);
  const [formData, setFormData] = useState({ reason_name: '', reason_code: '', description: '' });

  useEffect(() => { fetchReasons(); }, []);

  const fetchReasons = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('permission_reasons_master').select('*').order('display_order');
    if (error) { toast.error('Failed to fetch permission reasons'); } else { setReasons(data || []); }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return reasons;
    const t = searchTerm.toLowerCase();
    return reasons.filter(r => r.reason_name.toLowerCase().includes(t) || r.reason_code.toLowerCase().includes(t));
  }, [reasons, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason_name || !formData.reason_code) { toast.error('Please fill in all required fields'); return; }
    const data = { reason_name: formData.reason_name, reason_code: formData.reason_code, description: formData.description || null };
    if (editingReason) {
      const { error } = await supabase.from('permission_reasons_master').update(data).eq('id', editingReason.id);
      if (!error) { toast.success('Updated'); setDialogOpen(false); resetForm(); fetchReasons(); } else toast.error('Failed');
    } else {
      const { error } = await supabase.from('permission_reasons_master').insert([data]);
      if (!error) { toast.success('Created'); setDialogOpen(false); resetForm(); fetchReasons(); } else toast.error('Failed');
    }
  };

  const handleEdit = async (r: PermissionReason) => {
    let fresh: PermissionReason = r;
    try {
      const { data } = await supabase.from('permission_reasons_master').select('*').eq('id', r.id).maybeSingle();
      if (data) fresh = data as PermissionReason;
    } catch { /* fall back */ }
    setEditingReason(fresh);
    setFormData({ reason_name: fresh.reason_name, reason_code: fresh.reason_code, description: fresh.description || '' });
    setDialogOpen(true);
  };
  const handleDelete = async (id: string) => { if (!confirm('Delete this permission reason?')) return; const { error } = await supabase.from('permission_reasons_master').delete().eq('id', id); if (!error) { toast.success('Deleted'); fetchReasons(); } };
  const toggleActive = async (r: PermissionReason) => { const { error } = await supabase.from('permission_reasons_master').update({ is_active: !r.is_active }).eq('id', r.id); if (!error) { toast.success(`${!r.is_active ? 'Activated' : 'Deactivated'}`); fetchReasons(); } };
  const updateDisplayOrder = async (id: string, newOrder: number) => { await supabase.from('permission_reasons_master').update({ display_order: newOrder }).eq('id', id); fetchReasons(); };
  const resetForm = () => { setFormData({ reason_name: '', reason_code: '', description: '' }); setEditingReason(null); };
  const handleDialogClose = () => { setDialogOpen(false); resetForm(); };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div><div className="flex items-center gap-2"><CardTitle className="text-lg">Permission Reasons</CardTitle><Badge variant="secondary" className="text-xs">{filtered.length}</Badge></div><CardDescription className="mt-1">Manage permission application reasons</CardDescription></div>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Reason</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-8 w-16" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-16" /><Skeleton className="h-8 w-20 ml-auto" /></div>))}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center"><FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" /><p className="text-muted-foreground font-medium">No permission reasons found</p><p className="text-sm text-muted-foreground/70 mt-1">{searchTerm ? 'Try adjusting your search' : 'Click "Add Reason" to create one'}</p></div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader><TableRow><TableHead className="w-20">Order</TableHead><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead className="hidden md:table-cell">Description</TableHead><TableHead className="w-24">Status</TableHead><TableHead className="text-right w-32">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((r, index) => (
                  <TableRow key={r.id}>
                    <TableCell><div className="flex items-center gap-1"><span className="text-xs text-muted-foreground w-4">{r.display_order}</span><div className="flex flex-col"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => updateDisplayOrder(r.id, r.display_order - 1)} disabled={index === 0}><ArrowUp className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent>Move up</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => updateDisplayOrder(r.id, r.display_order + 1)} disabled={index === filtered.length - 1}><ArrowDown className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent>Move down</TooltipContent></Tooltip></div></div></TableCell>
                    <TableCell className="font-medium">{r.reason_name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.reason_code}</code></TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell max-w-[200px] truncate">{r.description || '-'}</TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} /></TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-1"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingReason ? 'Edit Permission Reason' : 'Add New Permission Reason'}</DialogTitle><DialogDescription>{editingReason ? 'Update details' : 'Fill in the details'}</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label htmlFor="reason_name">Reason Name *</Label><Input id="reason_name" value={formData.reason_name} onChange={(e) => setFormData({ ...formData, reason_name: e.target.value })} placeholder="e.g., Personal Work" required /></div>
              <div className="space-y-2"><Label htmlFor="reason_code">Reason Code *</Label><Input id="reason_code" value={formData.reason_code} onChange={(e) => setFormData({ ...formData, reason_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="e.g., personal_work" required /></div>
              <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" rows={3} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={handleDialogClose}>Cancel</Button><Button type="submit" disabled={loading}>{editingReason ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PermissionReasonsTab;
