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

interface Role {
  id: string;
  role_name: string;
  role_code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface RolesTabProps {
  searchTerm?: string;
}

const RolesTab = ({ searchTerm = '' }: RolesTabProps) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    role_name: '',
    role_code: '',
    description: '',
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('roles_master')
      .select('*')
      .order('display_order');

    if (error) {
      toast.error('Failed to fetch roles');
      console.error(error);
    } else {
      setRoles(data || []);
    }
    setLoading(false);
  };

  const filteredRoles = useMemo(() => {
    if (!searchTerm) return roles;
    const term = searchTerm.toLowerCase();
    return roles.filter(r =>
      r.role_name.toLowerCase().includes(term) ||
      r.role_code.toLowerCase().includes(term) ||
      (r.description && r.description.toLowerCase().includes(term))
    );
  }, [roles, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role_name || !formData.role_code) {
      toast.error('Please fill in all required fields');
      return;
    }
    const roleData = {
      role_name: formData.role_name,
      role_code: formData.role_code,
      description: formData.description || null,
    };
    if (editingRole) {
      const { error } = await supabase.from('roles_master').update(roleData).eq('id', editingRole.id);
      if (error) { toast.error('Failed to update role'); console.error(error); }
      else { toast.success('Role updated successfully'); setDialogOpen(false); resetForm(); fetchRoles(); }
    } else {
      const { error } = await supabase.from('roles_master').insert([roleData]);
      if (error) { toast.error('Failed to create role'); console.error(error); }
      else { toast.success('Role created successfully'); setDialogOpen(false); resetForm(); fetchRoles(); }
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({ role_name: role.role_name, role_code: role.role_code, description: role.description || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    const { error } = await supabase.from('roles_master').delete().eq('id', id);
    if (error) { toast.error('Failed to delete role'); console.error(error); }
    else { toast.success('Role deleted successfully'); fetchRoles(); }
  };

  const toggleActive = async (role: Role) => {
    const { error } = await supabase.from('roles_master').update({ is_active: !role.is_active }).eq('id', role.id);
    if (error) { toast.error('Failed to update role status'); console.error(error); }
    else { toast.success(`Role ${!role.is_active ? 'activated' : 'deactivated'}`); fetchRoles(); }
  };

  const updateDisplayOrder = async (id: string, newOrder: number) => {
    const { error } = await supabase.from('roles_master').update({ display_order: newOrder }).eq('id', id);
    if (error) { toast.error('Failed to update order'); console.error(error); }
    else { fetchRoles(); }
  };

  const resetForm = () => { setFormData({ role_name: '', role_code: '', description: '' }); setEditingRole(null); };
  const handleDialogClose = () => { setDialogOpen(false); resetForm(); };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Staff Roles</CardTitle>
              <Badge variant="secondary" className="text-xs">{filteredRoles.length}</Badge>
            </div>
            <CardDescription className="mt-1">Manage staff role types</CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Role
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48 hidden md:block" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">No roles found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {searchTerm ? 'Try adjusting your search term' : 'Click "Add Role" to create one'}
            </p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="text-right w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role, index) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground w-4">{role.display_order}</span>
                        <div className="flex flex-col">
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => updateDisplayOrder(role.id, role.display_order - 1)} disabled={index === 0}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger><TooltipContent>Move up</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => updateDisplayOrder(role.id, role.display_order + 1)} disabled={index === filteredRoles.length - 1}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger><TooltipContent>Move down</TooltipContent></Tooltip>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{role.role_name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{role.role_code}</code></TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell max-w-[200px] truncate">{role.description || '-'}</TableCell>
                    <TableCell>
                      <Switch checked={role.is_active} onCheckedChange={() => toggleActive(role)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(role)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(role.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
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
            <DialogTitle>{editingRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
            <DialogDescription>{editingRole ? 'Update the role details below' : 'Fill in the details to create a new role'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role_name">Role Name *</Label>
                <Input id="role_name" value={formData.role_name} onChange={(e) => setFormData({ ...formData, role_name: e.target.value })} placeholder="e.g., Staff Nurse" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role_code">Role Code *</Label>
                <Input id="role_code" value={formData.role_code} onChange={(e) => setFormData({ ...formData, role_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="e.g., staff_nurse" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description of the role" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>Cancel</Button>
              <Button type="submit">{editingRole ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RolesTab;
