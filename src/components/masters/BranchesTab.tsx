import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

const BranchesTab = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    branch_location: '',
    contact_number: '',
    contact_email: '',
    description: '',
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('branches_master')
      .select('*')
      .order('display_order');

    if (error) {
      toast.error('Failed to fetch branches');
      console.error(error);
    } else {
      setBranches(data || []);
    }
    setLoading(false);
  };

  const validateForm = (): boolean => {
    if (!formData.branch_name || !formData.branch_code || !formData.branch_location) {
      toast.error('Please fill in all required fields');
      return false;
    }
    if (formData.contact_number && !/^\d{10}$/.test(formData.contact_number)) {
      toast.error('Contact number must be exactly 10 digits');
      return false;
    }
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const branchData = {
      branch_name: formData.branch_name,
      branch_code: formData.branch_code,
      branch_location: formData.branch_location,
      contact_number: formData.contact_number || null,
      contact_email: formData.contact_email || null,
      description: formData.description || null,
    };

    if (editingBranch) {
      const { error } = await supabase
        .from('branches_master')
        .update(branchData)
        .eq('id', editingBranch.id);

      if (error) {
        toast.error('Failed to update branch');
        console.error(error);
      } else {
        toast.success('Branch updated successfully');
        setDialogOpen(false);
        resetForm();
        fetchBranches();
      }
    } else {
      const { error } = await supabase
        .from('branches_master')
        .insert([branchData]);

      if (error) {
        toast.error('Failed to create branch');
        console.error(error);
      } else {
        toast.success('Branch created successfully');
        setDialogOpen(false);
        resetForm();
        fetchBranches();
      }
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      branch_name: branch.branch_name,
      branch_code: branch.branch_code,
      branch_location: branch.branch_location,
      contact_number: branch.contact_number || '',
      contact_email: branch.contact_email || '',
      description: branch.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;

    const { error } = await supabase
      .from('branches_master')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete branch');
      console.error(error);
    } else {
      toast.success('Branch deleted successfully');
      fetchBranches();
    }
  };

  const toggleActive = async (branch: Branch) => {
    const { error } = await supabase
      .from('branches_master')
      .update({ is_active: !branch.is_active })
      .eq('id', branch.id);

    if (error) {
      toast.error('Failed to update branch status');
      console.error(error);
    } else {
      toast.success(`Branch ${!branch.is_active ? 'activated' : 'deactivated'}`);
      fetchBranches();
    }
  };

  const updateDisplayOrder = async (id: string, newOrder: number) => {
    const { error } = await supabase
      .from('branches_master')
      .update({ display_order: newOrder })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update order');
      console.error(error);
    } else {
      fetchBranches();
    }
  };

  const resetForm = () => {
    setFormData({ branch_name: '', branch_code: '', branch_location: '', contact_number: '', contact_email: '', description: '' });
    setEditingBranch(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Branches</CardTitle>
            <CardDescription>Manage hospital branches and locations</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Branch
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading branches...</div>
        ) : branches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No branches found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Branch Name</TableHead>
                <TableHead>Branch Code</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact Number</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch, index) => (
                <TableRow key={branch.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">{branch.display_order}</span>
                      <div className="flex flex-col">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => updateDisplayOrder(branch.id, branch.display_order - 1)} disabled={index === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => updateDisplayOrder(branch.id, branch.display_order + 1)} disabled={index === branches.length - 1}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{branch.branch_name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{branch.branch_code}</code>
                  </TableCell>
                  <TableCell>{branch.branch_location}</TableCell>
                  <TableCell>{branch.contact_number || '-'}</TableCell>
                  <TableCell>{branch.contact_email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={branch.is_active ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleActive(branch)}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(branch)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(branch.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
            <DialogDescription>
              {editingBranch ? 'Update the branch details below' : 'Fill in the details to create a new branch'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="branch_name">Branch Name *</Label>
                <Input id="branch_name" value={formData.branch_name} onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })} placeholder="e.g., Main Hospital" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch_code">Branch Code *</Label>
                <Input id="branch_code" value={formData.branch_code} onChange={(e) => setFormData({ ...formData, branch_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="e.g., main_hospital" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch_location">Branch Location *</Label>
                <Input id="branch_location" value={formData.branch_location} onChange={(e) => setFormData({ ...formData, branch_location: e.target.value })} placeholder="e.g., 123 Main Street, City" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_number">Contact Number</Label>
                <Input id="contact_number" value={formData.contact_number} onChange={(e) => setFormData({ ...formData, contact_number: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="e.g., 9876543210" maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} placeholder="e.g., branch@hospital.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description of the branch" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>Cancel</Button>
              <Button type="submit">{editingBranch ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BranchesTab;
