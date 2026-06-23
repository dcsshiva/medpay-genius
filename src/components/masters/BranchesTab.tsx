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

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
  branch_location: string;
  contact_number: string | null;
  contact_email: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface BranchesTabProps { searchTerm?: string; }

const BranchesTab = ({ searchTerm = '' }: BranchesTabProps) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({ branch_name: '', branch_code: '', branch_location: '', contact_number: '', contact_email: '', description: '' });

  useEffect(() => { fetchBranches(); }, []);

  const fetchBranches = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('branches_master').select('*').order('display_order');
    if (error) { toast.error('Failed to fetch branches'); } else { setBranches(data || []); }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return branches;
    const t = searchTerm.toLowerCase();
    return branches.filter(b => b.branch_name.toLowerCase().includes(t) || b.branch_code.toLowerCase().includes(t) || b.branch_location.toLowerCase().includes(t));
  }, [branches, searchTerm]);

  const validateForm = (): boolean => {
    if (!formData.branch_name || !formData.branch_code || !formData.branch_location) { toast.error('Please fill in all required fields'); return false; }
    if (formData.contact_number && !/^\d{10}$/.test(formData.contact_number)) { toast.error('Contact number must be exactly 10 digits'); return false; }
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) { toast.error('Please enter a valid email address'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const branchData = { branch_name: formData.branch_name, branch_code: formData.branch_code, branch_location: formData.branch_location, contact_number: formData.contact_number || null, contact_email: formData.contact_email || null, description: formData.description || null };
    if (editingBranch) {
      const { error } = await supabase.from('branches_master').update(branchData).eq('id', editingBranch.id);
      if (error) { toast.error('Failed to update branch'); } else { toast.success('Branch updated'); setDialogOpen(false); resetForm(); fetchBranches(); }
    } else {
      const { error } = await supabase.from('branches_master').insert([branchData]);
      if (error) { toast.error('Failed to create branch'); } else { toast.success('Branch created'); setDialogOpen(false); resetForm(); fetchBranches(); }
    }
  };

  const handleEdit = async (branch: Branch) => {
    let fresh: Branch = branch;
    try {
      const { data } = await supabase.from('branches_master').select('*').eq('id', branch.id).maybeSingle();
      if (data) fresh = data as Branch;
    } catch { /* fall back */ }
    setEditingBranch(fresh);
    setFormData({ branch_name: fresh.branch_name, branch_code: fresh.branch_code, branch_location: fresh.branch_location, contact_number: fresh.contact_number || '', contact_email: fresh.contact_email || '', description: fresh.description || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    const { error } = await supabase.from('branches_master').delete().eq('id', id);
    if (!error) { toast.success('Branch deleted'); fetchBranches(); } else toast.error('Failed to delete branch');
  };

  const toggleActive = async (branch: Branch) => {
    const { error } = await supabase.from('branches_master').update({ is_active: !branch.is_active }).eq('id', branch.id);
    if (!error) { toast.success(`Branch ${!branch.is_active ? 'activated' : 'deactivated'}`); fetchBranches(); }
  };

  const updateDisplayOrder = async (id: string, newOrder: number) => {
    const { error } = await supabase.from('branches_master').update({ display_order: newOrder }).eq('id', id);
    if (!error) fetchBranches();
  };

  const resetForm = () => { setFormData({ branch_name: '', branch_code: '', branch_location: '', contact_number: '', contact_email: '', description: '' }); setEditingBranch(null); };
  const handleDialogClose = () => { setDialogOpen(false); resetForm(); };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2"><CardTitle className="text-lg">Branches</CardTitle><Badge variant="secondary" className="text-xs">{filtered.length}</Badge></div>
            <CardDescription className="mt-1">Manage hospital branches and locations</CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Branch</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-8 w-16" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-36" /><Skeleton className="h-6 w-16" /><Skeleton className="h-8 w-20 ml-auto" /></div>))}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" /><p className="text-muted-foreground font-medium">No branches found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{searchTerm ? 'Try adjusting your search term' : 'Click "Add Branch" to create one'}</p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="hidden lg:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="text-right w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((branch, index) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground w-4">{branch.display_order}</span>
                        <div className="flex flex-col">
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => updateDisplayOrder(branch.id, branch.display_order - 1)} disabled={index === 0}><ArrowUp className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent>Move up</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => updateDisplayOrder(branch.id, branch.display_order + 1)} disabled={index === filtered.length - 1}><ArrowDown className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent>Move down</TooltipContent></Tooltip>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{branch.branch_name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{branch.branch_code}</code></TableCell>
                    <TableCell className="text-sm">{branch.branch_location}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{branch.contact_number || '-'}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{branch.contact_email || '-'}</TableCell>
                    <TableCell><Switch checked={branch.is_active} onCheckedChange={() => toggleActive(branch)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(branch)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(branch.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
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
          <DialogHeader><DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle><DialogDescription>{editingBranch ? 'Update the branch details' : 'Fill in the details to create a new branch'}</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label htmlFor="branch_name">Branch Name *</Label><Input id="branch_name" value={formData.branch_name} onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })} placeholder="e.g., Main Hospital" required /></div>
              <div className="space-y-2"><Label htmlFor="branch_code">Branch Code *</Label><Input id="branch_code" value={formData.branch_code} onChange={(e) => setFormData({ ...formData, branch_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="e.g., main_hospital" required /></div>
              <div className="space-y-2"><Label htmlFor="branch_location">Branch Location *</Label><Input id="branch_location" value={formData.branch_location} onChange={(e) => setFormData({ ...formData, branch_location: e.target.value })} placeholder="e.g., 123 Main Street, City" required /></div>
              <div className="space-y-2"><Label htmlFor="contact_number">Contact Number</Label><Input id="contact_number" value={formData.contact_number} onChange={(e) => setFormData({ ...formData, contact_number: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="e.g., 9876543210" maxLength={10} /></div>
              <div className="space-y-2"><Label htmlFor="contact_email">Contact Email</Label><Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} placeholder="e.g., branch@hospital.com" /></div>
              <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" rows={3} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={handleDialogClose}>Cancel</Button><Button type="submit" disabled={loading}>{editingBranch ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BranchesTab;
