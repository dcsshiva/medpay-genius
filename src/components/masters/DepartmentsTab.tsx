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

interface Department {
  id: string;
  department_name: string;
  department_code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface DepartmentsTabProps { searchTerm?: string; }

const DepartmentsTab = ({ searchTerm = '' }: DepartmentsTabProps) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ department_name: '', department_code: '', description: '' });

  useEffect(() => { fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('departments_master').select('*').order('display_order');
    if (error) { toast.error('Failed to fetch departments'); console.error(error); }
    else { setDepartments(data || []); }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return departments;
    const t = searchTerm.toLowerCase();
    return departments.filter(d => d.department_name.toLowerCase().includes(t) || d.department_code.toLowerCase().includes(t) || (d.description && d.description.toLowerCase().includes(t)));
  }, [departments, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department_name || !formData.department_code) { toast.error('Please fill in all required fields'); return; }
    const data = { department_name: formData.department_name, department_code: formData.department_code, description: formData.description || null };
    if (editingDepartment) {
      const { error } = await supabase.from('departments_master').update(data).eq('id', editingDepartment.id);
      if (error) { toast.error('Failed to update department'); } else { toast.success('Department updated'); setDialogOpen(false); resetForm(); fetchDepartments(); }
    } else {
      const { error } = await supabase.from('departments_master').insert([data]);
      if (error) { toast.error('Failed to create department'); } else { toast.success('Department created'); setDialogOpen(false); resetForm(); fetchDepartments(); }
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({ department_name: dept.department_name, department_code: dept.department_code, description: dept.description || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    const { error } = await supabase.from('departments_master').delete().eq('id', id);
    if (error) { toast.error('Failed to delete department'); } else { toast.success('Department deleted'); fetchDepartments(); }
  };

  const toggleActive = async (dept: Department) => {
    const { error } = await supabase.from('departments_master').update({ is_active: !dept.is_active }).eq('id', dept.id);
    if (error) { toast.error('Failed to update status'); } else { toast.success(`Department ${!dept.is_active ? 'activated' : 'deactivated'}`); fetchDepartments(); }
  };

  const updateDisplayOrder = async (id: string, newOrder: number) => {
    const { error } = await supabase.from('departments_master').update({ display_order: newOrder }).eq('id', id);
    if (!error) fetchDepartments();
  };

  const resetForm = () => { setFormData({ department_name: '', department_code: '', description: '' }); setEditingDepartment(null); };
  const handleDialogClose = () => { setDialogOpen(false); resetForm(); };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Departments</CardTitle>
              <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
            </div>
            <CardDescription className="mt-1">Manage hospital departments</CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Department</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-8 w-16" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-48 hidden md:block" /><Skeleton className="h-6 w-16" /><Skeleton className="h-8 w-20 ml-auto" /></div>))}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">No departments found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{searchTerm ? 'Try adjusting your search term' : 'Click "Add Department" to create one'}</p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="text-right w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((dept, index) => (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground w-4">{dept.display_order}</span>
                        <div className="flex flex-col">
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => updateDisplayOrder(dept.id, dept.display_order - 1)} disabled={index === 0}><ArrowUp className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent>Move up</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => updateDisplayOrder(dept.id, dept.display_order + 1)} disabled={index === filtered.length - 1}><ArrowDown className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent>Move down</TooltipContent></Tooltip>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{dept.department_name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{dept.department_code}</code></TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell max-w-[200px] truncate">{dept.description || '-'}</TableCell>
                    <TableCell><Switch checked={dept.is_active} onCheckedChange={() => toggleActive(dept)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(dept)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(dept.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
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

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDepartment ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            <DialogDescription>{editingDepartment ? 'Update the department details below' : 'Fill in the details to create a new department'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label htmlFor="department_name">Department Name *</Label><Input id="department_name" value={formData.department_name} onChange={(e) => setFormData({ ...formData, department_name: e.target.value })} placeholder="e.g., Emergency" required /></div>
              <div className="space-y-2"><Label htmlFor="department_code">Department Code *</Label><Input id="department_code" value={formData.department_code} onChange={(e) => setFormData({ ...formData, department_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="e.g., emergency" required /></div>
              <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" rows={3} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={handleDialogClose}>Cancel</Button><Button type="submit" disabled={loading}>{editingDepartment ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DepartmentsTab;
