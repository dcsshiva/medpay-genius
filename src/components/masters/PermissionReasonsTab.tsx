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

interface PermissionReason {
  id: string;
  reason_name: string;
  reason_code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

const PermissionReasonsTab = () => {
  const [reasons, setReasons] = useState<PermissionReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<PermissionReason | null>(null);
  const [formData, setFormData] = useState({
    reason_name: '',
    reason_code: '',
    description: '',
  });

  useEffect(() => {
    fetchReasons();
  }, []);

  const fetchReasons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('permission_reasons_master')
      .select('*')
      .order('display_order');

    if (error) {
      toast.error('Failed to fetch permission reasons');
      console.error(error);
    } else {
      setReasons(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reason_name || !formData.reason_code) {
      toast.error('Please fill in all required fields');
      return;
    }

    const reasonData = {
      reason_name: formData.reason_name,
      reason_code: formData.reason_code,
      description: formData.description || null,
    };

    if (editingReason) {
      const { error } = await supabase
        .from('permission_reasons_master')
        .update(reasonData)
        .eq('id', editingReason.id);

      if (error) {
        toast.error('Failed to update permission reason');
        console.error(error);
      } else {
        toast.success('Permission reason updated successfully');
        setDialogOpen(false);
        resetForm();
        fetchReasons();
      }
    } else {
      const { error } = await supabase
        .from('permission_reasons_master')
        .insert([reasonData]);

      if (error) {
        toast.error('Failed to create permission reason');
        console.error(error);
      } else {
        toast.success('Permission reason created successfully');
        setDialogOpen(false);
        resetForm();
        fetchReasons();
      }
    }
  };

  const handleEdit = (reason: PermissionReason) => {
    setEditingReason(reason);
    setFormData({
      reason_name: reason.reason_name,
      reason_code: reason.reason_code,
      description: reason.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this permission reason?')) return;

    const { error } = await supabase
      .from('permission_reasons_master')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete permission reason');
      console.error(error);
    } else {
      toast.success('Permission reason deleted successfully');
      fetchReasons();
    }
  };

  const toggleActive = async (reason: PermissionReason) => {
    const { error } = await supabase
      .from('permission_reasons_master')
      .update({ is_active: !reason.is_active })
      .eq('id', reason.id);

    if (error) {
      toast.error('Failed to update permission reason status');
      console.error(error);
    } else {
      toast.success(`Permission reason ${!reason.is_active ? 'activated' : 'deactivated'}`);
      fetchReasons();
    }
  };

  const updateDisplayOrder = async (id: string, newOrder: number) => {
    const { error } = await supabase
      .from('permission_reasons_master')
      .update({ display_order: newOrder })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update order');
      console.error(error);
    } else {
      fetchReasons();
    }
  };

  const resetForm = () => {
    setFormData({ reason_name: '', reason_code: '', description: '' });
    setEditingReason(null);
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
            <CardTitle>Permission Reasons</CardTitle>
            <CardDescription>Manage permission application reasons</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Permission Reason
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading permission reasons...</div>
        ) : reasons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No permission reasons found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Reason Name</TableHead>
                <TableHead>Reason Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reasons.map((reason, index) => (
                <TableRow key={reason.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">{reason.display_order}</span>
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => updateDisplayOrder(reason.id, reason.display_order - 1)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => updateDisplayOrder(reason.id, reason.display_order + 1)}
                          disabled={index === reasons.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{reason.reason_name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{reason.reason_code}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{reason.description || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={reason.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => toggleActive(reason)}
                    >
                      {reason.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(reason)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(reason.id)}>
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
            <DialogTitle>{editingReason ? 'Edit Permission Reason' : 'Add New Permission Reason'}</DialogTitle>
            <DialogDescription>
              {editingReason ? 'Update the permission reason details below' : 'Fill in the details to create a new permission reason'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason_name">Reason Name *</Label>
                <Input
                  id="reason_name"
                  value={formData.reason_name}
                  onChange={(e) => setFormData({ ...formData, reason_name: e.target.value })}
                  placeholder="e.g., Personal Work"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason_code">Reason Code *</Label>
                <Input
                  id="reason_code"
                  value={formData.reason_code}
                  onChange={(e) => setFormData({ ...formData, reason_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., personal_work"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the permission reason"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit">{editingReason ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PermissionReasonsTab;
