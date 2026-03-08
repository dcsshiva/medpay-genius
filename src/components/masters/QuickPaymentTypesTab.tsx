import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, ChevronUp, ChevronDown, FolderOpen } from 'lucide-react';

interface QuickPaymentType { id: string; type_code: string; type_name: string; description: string | null; is_active: boolean; display_order: number; }
interface Props { searchTerm?: string; }

const QuickPaymentTypesTab = ({ searchTerm = '' }: Props) => {
  const [types, setTypes] = useState<QuickPaymentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingType, setEditingType] = useState<QuickPaymentType | null>(null);
  const [formData, setFormData] = useState({ type_code: '', type_name: '', description: '', is_active: true, display_order: 0 });

  useEffect(() => { fetchTypes(); }, []);

  const fetchTypes = async () => {
    try {
      const { data, error } = await supabase.from('quick_payment_types').select('*').order('display_order', { ascending: true });
      if (error) throw error; setTypes(data || []);
    } catch (error: any) { toast.error('Failed to fetch quick payment types'); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return types;
    const t = searchTerm.toLowerCase();
    return types.filter(tp => tp.type_name.toLowerCase().includes(t) || tp.type_code.toLowerCase().includes(t));
  }, [types, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingType) {
        const { error } = await supabase.from('quick_payment_types').update(formData).eq('id', editingType.id);
        if (error) throw error; toast.success('Updated');
      } else {
        const { error } = await supabase.from('quick_payment_types').insert([formData]);
        if (error) throw error; toast.success('Created');
      }
      setOpen(false); resetForm(); fetchTypes();
    } catch (error: any) { toast.error(error.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quick payment type?')) return;
    try { const { error } = await supabase.from('quick_payment_types').delete().eq('id', id); if (error) throw error; toast.success('Deleted'); fetchTypes(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try { const { error } = await supabase.from('quick_payment_types').update({ is_active: !currentStatus }).eq('id', id); if (error) throw error; toast.success(`${!currentStatus ? 'Activated' : 'Deactivated'}`); fetchTypes(); }
    catch { toast.error('Failed'); }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const index = types.findIndex(t => t.id === id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === types.length - 1) return;
    const newTypes = [...types];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newTypes[index], newTypes[targetIndex]] = [newTypes[targetIndex], newTypes[index]];
    try {
      for (const [idx, type] of newTypes.entries()) { await supabase.from('quick_payment_types').update({ display_order: idx }).eq('id', type.id); }
      fetchTypes();
    } catch { toast.error('Failed to reorder'); }
  };

  const resetForm = () => { setFormData({ type_code: '', type_name: '', description: '', is_active: true, display_order: types.length }); setEditingType(null); };
  const openEditDialog = (type: QuickPaymentType) => { setEditingType(type); setFormData({ type_code: type.type_code, type_name: type.type_name, description: type.description || '', is_active: type.is_active, display_order: type.display_order }); setOpen(true); };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div><div className="flex items-center gap-2"><CardTitle className="text-lg">Quick Payment Types</CardTitle><Badge variant="secondary" className="text-xs">{filtered.length}</Badge></div><CardDescription className="mt-1">Manage quick payment type categories</CardDescription></div>
          <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Type</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-8 w-16" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-16" /><Skeleton className="h-8 w-20 ml-auto" /></div>))}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center"><FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" /><p className="text-muted-foreground font-medium">No payment types found</p><p className="text-sm text-muted-foreground/70 mt-1">{searchTerm ? 'Try adjusting your search' : 'Click "Add Type" to create one'}</p></div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader><TableRow><TableHead className="w-20">Order</TableHead><TableHead>Type Name</TableHead><TableHead>Code</TableHead><TableHead className="hidden md:table-cell">Description</TableHead><TableHead className="w-24">Status</TableHead><TableHead className="text-right w-32">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((type, index) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleReorder(type.id, 'up')} disabled={index === 0}><ChevronUp className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move up</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleReorder(type.id, 'down')} disabled={index === filtered.length - 1}><ChevronDown className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move down</TooltipContent></Tooltip>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{type.type_name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{type.type_code}</code></TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{type.description || '-'}</TableCell>
                    <TableCell><Switch checked={type.is_active} onCheckedChange={() => handleToggleActive(type.id, type.is_active)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditDialog(type)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(type.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingType ? 'Edit Quick Payment Type' : 'Add Quick Payment Type'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="type_name">Type Name *</Label><Input id="type_name" value={formData.type_name} onChange={(e) => setFormData({ ...formData, type_name: e.target.value })} placeholder="e.g., Vendor Payment" required /></div>
            <div className="space-y-2"><Label htmlFor="type_code">Type Code *</Label><Input id="type_code" value={formData.type_code} onChange={(e) => setFormData({ ...formData, type_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="e.g., vendor_payment" required disabled={!!editingType} /></div>
            <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" /></div>
            <div className="flex items-center space-x-2"><Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} /><Label htmlFor="is_active">Active</Label></div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuickPaymentTypesTab;
