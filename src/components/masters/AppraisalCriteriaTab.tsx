import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Pencil, ArrowUp, ArrowDown, FolderOpen } from 'lucide-react';

interface AppraisalCriteria { id: string; criteria_name: string; criteria_code: string; description: string | null; max_score: number; weight: number; is_active: boolean; display_order: number; }
interface Props { searchTerm?: string; }

const AppraisalCriteriaTab = ({ searchTerm = '' }: Props) => {
  const [criteria, setCriteria] = useState<AppraisalCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState<AppraisalCriteria | null>(null);
  const [formData, setFormData] = useState({ criteria_name: '', criteria_code: '', description: '', is_active: true });

  const fetchCriteria = async () => {
    try {
      const { data, error } = await (supabase as any).from('appraisal_criteria_master').select('*').order('display_order');
      if (error) throw error; setCriteria(data || []);
    } catch (error: any) { toast.error('Failed to load criteria: ' + error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCriteria(); }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return criteria;
    const t = searchTerm.toLowerCase();
    return criteria.filter(c => c.criteria_name.toLowerCase().includes(t) || c.criteria_code.toLowerCase().includes(t));
  }, [criteria, searchTerm]);

  const handleAdd = () => { setSelectedCriteria(null); setFormData({ criteria_name: '', criteria_code: '', description: '', is_active: true }); setEditDialogOpen(true); };
  const handleEdit = (item: AppraisalCriteria) => { setSelectedCriteria(item); setFormData({ criteria_name: item.criteria_name, criteria_code: item.criteria_code, description: item.description || '', is_active: item.is_active }); setEditDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (!formData.criteria_name.trim() || !formData.criteria_code.trim()) { toast.error('Name and code required'); return; }
      if (selectedCriteria) {
        const { error } = await (supabase as any).from('appraisal_criteria_master').update({ criteria_name: formData.criteria_name.trim(), criteria_code: formData.criteria_code.trim(), description: formData.description.trim() || null, weight: 1.0, is_active: formData.is_active }).eq('id', selectedCriteria.id);
        if (error) throw error; toast.success('Updated');
      } else {
        const maxOrder = criteria.reduce((max, c) => Math.max(max, c.display_order), 0);
        const { error } = await (supabase as any).from('appraisal_criteria_master').insert({ criteria_name: formData.criteria_name.trim(), criteria_code: formData.criteria_code.trim(), description: formData.description.trim() || null, weight: 1.0, is_active: formData.is_active, display_order: maxOrder + 1 });
        if (error) throw error; toast.success('Added');
      }
      setEditDialogOpen(false); fetchCriteria();
    } catch (error: any) { toast.error('Failed: ' + error.message); }
  };

  const handleToggleActive = async (item: AppraisalCriteria) => {
    try { const { error } = await (supabase as any).from('appraisal_criteria_master').update({ is_active: !item.is_active }).eq('id', item.id); if (error) throw error; toast.success(`${!item.is_active ? 'Activated' : 'Suspended'}`); fetchCriteria(); }
    catch (error: any) { toast.error('Failed'); }
  };

  const handleReorder = async (item: AppraisalCriteria, direction: 'up' | 'down') => {
    const i = criteria.findIndex(c => c.id === item.id);
    const si = direction === 'up' ? i - 1 : i + 1;
    if (si < 0 || si >= criteria.length) return;
    const swap = criteria[si];
    try {
      await (supabase as any).from('appraisal_criteria_master').update({ display_order: swap.display_order }).eq('id', item.id);
      await (supabase as any).from('appraisal_criteria_master').update({ display_order: item.display_order }).eq('id', swap.id);
      fetchCriteria();
    } catch { toast.error('Failed to reorder'); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div><div className="flex items-center gap-2"><CardTitle className="text-lg">Appraisal Criteria</CardTitle><Badge variant="secondary" className="text-xs">{filtered.length}</Badge></div><CardDescription className="mt-1">Manage appraisal evaluation criteria</CardDescription></div>
          <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />Add Criteria</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-16" /><Skeleton className="h-8 w-20 ml-auto" /></div>))}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center"><FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" /><p className="text-muted-foreground font-medium">No criteria found</p><p className="text-sm text-muted-foreground/70 mt-1">{searchTerm ? 'Try adjusting your search' : 'Click "Add Criteria" to create one'}</p></div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead className="hidden md:table-cell">Description</TableHead><TableHead className="w-24">Status</TableHead><TableHead className="text-right w-36">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.criteria_name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.criteria_code}</code></TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{item.description || '-'}</TableCell>
                    <TableCell><Switch checked={item.is_active} onCheckedChange={() => handleToggleActive(item)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleReorder(item, 'up')} disabled={index === 0}><ArrowUp className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move up</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleReorder(item, 'down')} disabled={index === filtered.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move down</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedCriteria ? 'Edit Appraisal Criteria' : 'Add Appraisal Criteria'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="criteria_name">Name *</Label><Input id="criteria_name" value={formData.criteria_name} onChange={(e) => { const name = e.target.value; const code = !selectedCriteria ? name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_') : formData.criteria_code; setFormData({ ...formData, criteria_name: name, criteria_code: code }); }} placeholder="e.g., Punctuality" /></div>
            <div className="space-y-2"><Label htmlFor="criteria_code">Code *</Label><Input id="criteria_code" value={formData.criteria_code} disabled placeholder="Auto-generated from name" /></div>
            <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" /></div>
            <div className="flex items-center space-x-2"><Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} /><Label htmlFor="is_active">Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AppraisalCriteriaTab;
