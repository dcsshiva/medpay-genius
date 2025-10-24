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

interface Role {
  id: string;
  role_name: string;
  role_code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

const RolesTab = () => {
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
      const { error } = await supabase
        .from('roles_master')
        .update(roleData)
        .eq('id', editingRole.id);

      if (error) {
        toast.error('Failed to update role');
        console.error(error);
      } else {
        toast.success('Role updated successfully');
        setDialogOpen(false);
        resetForm();
        fetchRoles();
      }
    } else {
      const { error } = await supabase
        .from('roles_master')
        .insert([roleData]);

      if (error) {
        toast.error('Failed to create role');
        console.error(error);
      } else {
        toast.success('Role created successfully');
        setDialogOpen(false);
        resetForm();
        fetchRoles();
      }
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      role_name: role.role_name,
      role_code: role.role_code,
      description: role.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    const { error } = await supabase
      .from('roles_master')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete role');
      console.error(error);
    } else {
      toast.success('Role deleted successfully');
      fetchRoles();
    }
  };

  const toggleActive = async (role: Role) => {
    const { error } = await supabase
      .from('roles_master')
      .update({ is_active: !role.is_active })
      .eq('id', role.id);

    if (error) {
      toast.error('Failed to update role status');
      console.error(error);
    } else {
      toast.success(`Role ${!role.is_active ? 'activated' : 'deactivated'}`);
      fetchRoles();
    }
  };

  const updateDisplayOrder = async (id: string, newOrder: number) => {
    const { error } = await supabase
      .from('roles_master')
      .update({ display_order: newOrder })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update order');
      console.error(error);
    } else {
      fetchRoles();
    }
  };

  const resetForm = () => {
    setFormData({ role_name: '', role_code: '', description: '' });
    setEditingRole(null);
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
            <CardTitle>Staff Roles</CardTitle>
            <CardDescription>Manage staff role types</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading roles...</div>
        ) : roles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No roles found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Role Name</TableHead>
                <TableHead>Role Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role, index) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">{role.display_order}</span>
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => updateDisplayOrder(role.id, role.display_order - 1)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => updateDisplayOrder(role.id, role.display_order + 1)}
                          disabled={index === roles.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{role.role_name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{role.role_code}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{role.description || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={role.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => toggleActive(role)}
                    >
                      {role.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(role)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(role.id)}>
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
            <DialogTitle>{editingRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
            <DialogDescription>
              {editingRole ? 'Update the role details below' : 'Fill in the details to create a new role'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role_name">Role Name *</Label>
                <Input
                  id="role_name"
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  placeholder="e.g., Staff Nurse"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role_code">Role Code *</Label>
                <Input
                  id="role_code"
                  value={formData.role_code}
                  onChange={(e) => setFormData({ ...formData, role_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., staff_nurse"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the role"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit">{editingRole ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RolesTab;
