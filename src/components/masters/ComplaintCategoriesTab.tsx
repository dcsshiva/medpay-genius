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

interface ComplaintCategory { id: string; category_name: string; category_code: string; description: string | null; is_active: boolean; display_order: number; }
interface Props { searchTerm?: string; }

const ComplaintCategoriesTab = ({ searchTerm = '' }: Props) => {
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory | null>(null);
  const [formData, setFormData] = useState({ category_name: '', category_code: '', description: '', is_active: true });

  const fetchCategories = async () => {
    try { const { data, error } = await supabase.from('complaint_categories').select('*').order('display_order'); if (error) throw error; setCategories(data || []); }
    catch (error: any) { toast.error('Failed to load: ' + error.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return categories;
    const t = searchTerm.toLowerCase();
    return categories.filter(c => c.category_name.toLowerCase().includes(t) || c.category_code.toLowerCase().includes(t));
  }, [categories, searchTerm]);

  const handleAdd = () => { setSelectedCategory(null); setFormData({ category_name: '', category_code: '', description: '', is_active: true }); setEditDialogOpen(true); };
  const handleEdit = (c: ComplaintCategory) => { setSelectedCategory(c); setFormData({ category_name: c.category_name, category_code: c.category_code, description: c.description || '', is_active: c.is_active }); setEditDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (!formData.category_name.trim() || !formData.category_code.trim()) { toast.error('Name and code required'); return; }
      if (selectedCategory) {
        const { error } = await supabase.from('complaint_categories').update({ category_name: formData.category_name.trim(), category_code: formData.category_code.trim(), description: formData.description.trim() || null, is_active: formData.is_active }).eq('id', selectedCategory.id);
        if (error) throw error; toast.success('Updated');
      } else {
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.display_order), 0);
        const { error } = await supabase.from('complaint_categories').insert({ category_name: formData.category_name.trim(), category_code: formData.category_code.trim(), description: formData.description.trim() || null, is_active: formData.is_active, display_order: maxOrder + 1 });
        if (error) throw error; toast.success('Added');
      }
      setEditDialogOpen(false); fetchCategories();
    } catch (error: any) { toast.error('Failed: ' + error.message); }
  };

  const handleToggleActive = async (c: ComplaintCategory) => {
    try { const { error } = await supabase.from('complaint_categories').update({ is_active: !c.is_active }).eq('id', c.id); if (error) throw error; toast.success(`${!c.is_active ? 'Activated' : 'Deactivated'}`); fetchCategories(); }
    catch { toast.error('Failed'); }
  };

  const handleReorder = async (cat: ComplaintCategory, direction: 'up' | 'down') => {
    const i = categories.findIndex(c => c.id === cat.id);
    const si = direction === 'up' ? i - 1 : i + 1;
    if (si < 0 || si >= categories.length) return;
    const swap = categories[si];
    try {
      await supabase.from('complaint_categories').update({ display_order: swap.display_order }).eq('id', cat.id);
      await supabase.from('complaint_categories').update({ display_order: cat.display_order }).eq('id', swap.id);
      fetchCategories();
    } catch { toast.error('Failed to reorder'); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div><div className="flex items-center gap-2"><CardTitle className="text-lg">Complaint Categories</CardTitle><Badge variant="secondary" className="text-xs">{filtered.length}</Badge></div><CardDescription className="mt-1">Manage complaint category types</CardDescription></div>
          <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />Add Category</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-16" /><Skeleton className="h-8 w-20 ml-auto" /></div>))}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center"><FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" /><p className="text-muted-foreground font-medium">No categories found</p><p className="text-sm text-muted-foreground/70 mt-1">{searchTerm ? 'Try adjusting your search' : 'Click "Add Category" to create one'}</p></div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead className="hidden md:table-cell">Description</TableHead><TableHead className="w-24">Status</TableHead><TableHead className="text-right w-36">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((c, index) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.category_name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.category_code}</code></TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{c.description || '-'}</TableCell>
                    <TableCell><Switch checked={c.is_active} onCheckedChange={() => handleToggleActive(c)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleReorder(c, 'up')} disabled={index === 0}><ArrowUp className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move up</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleReorder(c, 'down')} disabled={index === filtered.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move down</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
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
          <DialogHeader><DialogTitle>{selectedCategory ? 'Edit Complaint Category' : 'Add Complaint Category'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="category_name">Name *</Label><Input id="category_name" value={formData.category_name} onChange={(e) => setFormData({ ...formData, category_name: e.target.value })} placeholder="e.g., Service Quality" /></div>
            <div className="space-y-2"><Label htmlFor="category_code">Code *</Label><Input id="category_code" value={formData.category_code} onChange={(e) => setFormData({ ...formData, category_code: e.target.value })} placeholder="e.g., service_quality" /></div>
            <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" /></div>
            <div className="flex items-center space-x-2"><Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} /><Label htmlFor="is_active">Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ComplaintCategoriesTab;
