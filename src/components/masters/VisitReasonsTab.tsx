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

interface VisitReason { id: string; reason_name: string; reason_code: string; description: string | null; is_active: boolean; display_order: number; }
interface Props { searchTerm?: string; }

const VisitReasonsTab = ({ searchTerm = '' }: Props) => {
  const [visitReasons, setVisitReasons] = useState<VisitReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<VisitReason | null>(null);
  const [formData, setFormData] = useState({ reason_name: '', reason_code: '', description: '', is_active: true });

  const fetchVisitReasons = async () => {
    try {
      const { data, error } = await supabase.from('visit_reasons').select('*').order('display_order');
      if (error) throw error;
      setVisitReasons(data || []);
    } catch (error: any) { toast.error('Failed to load visit reasons: ' + error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVisitReasons(); }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return visitReasons;
    const t = searchTerm.toLowerCase();
    return visitReasons.filter(r => r.reason_name.toLowerCase().includes(t) || r.reason_code.toLowerCase().includes(t));
  }, [visitReasons, searchTerm]);

  const handleAdd = () => { setSelectedReason(null); setFormData({ reason_name: '', reason_code: '', description: '', is_active: true }); setEditDialogOpen(true); };
  const handleEdit = (reason: VisitReason) => { setSelectedReason(reason); setFormData({ reason_name: reason.reason_name, reason_code: reason.reason_code, description: reason.description || '', is_active: reason.is_active }); setEditDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (!formData.reason_name.trim() || !formData.reason_code.trim()) { toast.error('Name and code are required'); return; }
      if (selectedReason) {
        const { error } = await supabase.from('visit_reasons').update({ reason_name: formData.reason_name.trim(), reason_code: formData.reason_code.trim(), description: formData.description.trim() || null, is_active: formData.is_active }).eq('id', selectedReason.id);
        if (error) throw error; toast.success('Visit reason updated');
      } else {
        const maxOrder = visitReasons.reduce((max, r) => Math.max(max, r.display_order), 0);
        const { error } = await supabase.from('visit_reasons').insert({ reason_name: formData.reason_name.trim(), reason_code: formData.reason_code.trim(), description: formData.description.trim() || null, is_active: formData.is_active, display_order: maxOrder + 1 });
        if (error) throw error; toast.success('Visit reason added');
      }
      setEditDialogOpen(false); fetchVisitReasons();
    } catch (error: any) { toast.error('Failed to save: ' + error.message); }
  };

  const handleToggleActive = async (reason: VisitReason) => {
    try {
      const { error } = await supabase.from('visit_reasons').update({ is_active: !reason.is_active }).eq('id', reason.id);
      if (error) throw error; toast.success(`${!reason.is_active ? 'Activated' : 'Deactivated'}`); fetchVisitReasons();
    } catch (error: any) { toast.error('Failed: ' + error.message); }
  };

  const handleReorder = async (reason: VisitReason, direction: 'up' | 'down') => {
    const currentIndex = visitReasons.findIndex(r => r.id === reason.id);
    if (currentIndex === -1) return;
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= visitReasons.length) return;
    const swapReason = visitReasons[swapIndex];
    try {
      await supabase.from('visit_reasons').update({ display_order: swapReason.display_order }).eq('id', reason.id);
      await supabase.from('visit_reasons').update({ display_order: reason.display_order }).eq('id', swapReason.id);
      fetchVisitReasons();
    } catch (error: any) { toast.error('Failed to reorder'); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div><div className="flex items-center gap-2"><CardTitle className="text-lg">Visit Reasons</CardTitle><Badge variant="secondary" className="text-xs">{filtered.length}</Badge></div><CardDescription className="mt-1">Manage visit reason types</CardDescription></div>
          <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />Add Reason</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-16" /><Skeleton className="h-8 w-20 ml-auto" /></div>))}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center"><FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" /><p className="text-muted-foreground font-medium">No visit reasons found</p><p className="text-sm text-muted-foreground/70 mt-1">{searchTerm ? 'Try adjusting your search' : 'Click "Add Reason" to create one'}</p></div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead className="hidden md:table-cell">Description</TableHead><TableHead className="w-24">Status</TableHead><TableHead className="text-right w-36">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((reason, index) => (
                  <TableRow key={reason.id}>
                    <TableCell className="font-medium">{reason.reason_name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{reason.reason_code}</code></TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{reason.description || '-'}</TableCell>
                    <TableCell><Switch checked={reason.is_active} onCheckedChange={() => handleToggleActive(reason)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleReorder(reason, 'up')} disabled={index === 0}><ArrowUp className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move up</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleReorder(reason, 'down')} disabled={index === filtered.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move down</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(reason)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
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
          <DialogHeader><DialogTitle>{selectedReason ? 'Edit Visit Reason' : 'Add Visit Reason'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="reason_name">Name *</Label><Input id="reason_name" value={formData.reason_name} onChange={(e) => setFormData({ ...formData, reason_name: e.target.value })} placeholder="e.g., Regular Checkup" /></div>
            <div className="space-y-2"><Label htmlFor="reason_code">Code *</Label><Input id="reason_code" value={formData.reason_code} onChange={(e) => setFormData({ ...formData, reason_code: e.target.value })} placeholder="e.g., regular_checkup" /></div>
            <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" /></div>
            <div className="flex items-center space-x-2"><Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} /><Label htmlFor="is_active">Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VisitReasonsTab;
