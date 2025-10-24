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

interface Department {
  id: string;
  department_name: string;
  department_code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

const DepartmentsTab = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    department_name: '',
    department_code: '',
    description: '',
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('departments_master')
      .select('*')
      .order('display_order');

    if (error) {
      toast.error('Failed to fetch departments');
      console.error(error);
    } else {
      setDepartments(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.department_name || !formData.department_code) {
      toast.error('Please fill in all required fields');
      return;
    }

    const departmentData = {
      department_name: formData.department_name,
      department_code: formData.department_code,
      description: formData.description || null,
    };

    if (editingDepartment) {
      const { error } = await supabase
        .from('departments_master')
        .update(departmentData)
        .eq('id', editingDepartment.id);

      if (error) {
        toast.error('Failed to update department');
        console.error(error);
      } else {
        toast.success('Department updated successfully');
        setDialogOpen(false);
        resetForm();
        fetchDepartments();
      }
    } else {
      const { error } = await supabase
        .from('departments_master')
        .insert([departmentData]);

      if (error) {
        toast.error('Failed to create department');
        console.error(error);
      } else {
        toast.success('Department created successfully');
        setDialogOpen(false);
        resetForm();
        fetchDepartments();
      }
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      department_name: department.department_name,
      department_code: department.department_code,
      description: department.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    const { error } = await supabase
      .from('departments_master')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete department');
      console.error(error);
    } else {
      toast.success('Department deleted successfully');
      fetchDepartments();
    }
  };

  const toggleActive = async (department: Department) => {
    const { error } = await supabase
      .from('departments_master')
      .update({ is_active: !department.is_active })
      .eq('id', department.id);

    if (error) {
      toast.error('Failed to update department status');
      console.error(error);
    } else {
      toast.success(`Department ${!department.is_active ? 'activated' : 'deactivated'}`);
      fetchDepartments();
    }
  };

  const updateDisplayOrder = async (id: string, newOrder: number) => {
    const { error } = await supabase
      .from('departments_master')
      .update({ display_order: newOrder })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update order');
      console.error(error);
    } else {
      fetchDepartments();
    }
  };

  const resetForm = () => {
    setFormData({ department_name: '', department_code: '', description: '' });
    setEditingDepartment(null);
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
            <CardTitle>Departments</CardTitle>
            <CardDescription>Manage hospital departments</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading departments...</div>
        ) : departments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No departments found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Department Name</TableHead>
                <TableHead>Department Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((department, index) => (
                <TableRow key={department.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">{department.display_order}</span>
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => updateDisplayOrder(department.id, department.display_order - 1)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => updateDisplayOrder(department.id, department.display_order + 1)}
                          disabled={index === departments.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{department.department_name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{department.department_code}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{department.description || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={department.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => toggleActive(department)}
                    >
                      {department.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(department)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(department.id)}>
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
            <DialogTitle>{editingDepartment ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            <DialogDescription>
              {editingDepartment ? 'Update the department details below' : 'Fill in the details to create a new department'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="department_name">Department Name *</Label>
                <Input
                  id="department_name"
                  value={formData.department_name}
                  onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
                  placeholder="e.g., Emergency"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department_code">Department Code *</Label>
                <Input
                  id="department_code"
                  value={formData.department_code}
                  onChange={(e) => setFormData({ ...formData, department_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., emergency"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the department"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit">{editingDepartment ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DepartmentsTab;
