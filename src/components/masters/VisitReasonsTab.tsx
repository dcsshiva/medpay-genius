import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface VisitReason {
  id: string;
  reason_name: string;
  reason_code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

const VisitReasonsTab = () => {
  const [visitReasons, setVisitReasons] = useState<VisitReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<VisitReason | null>(null);
  const [formData, setFormData] = useState({
    reason_name: '',
    reason_code: '',
    description: '',
    is_active: true,
  });

  const fetchVisitReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_reasons')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      setVisitReasons(data || []);
    } catch (error: any) {
      toast.error('Failed to load visit reasons: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitReasons();
  }, []);

  const handleAdd = () => {
    setSelectedReason(null);
    setFormData({
      reason_name: '',
      reason_code: '',
      description: '',
      is_active: true,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (reason: VisitReason) => {
    setSelectedReason(reason);
    setFormData({
      reason_name: reason.reason_name,
      reason_code: reason.reason_code,
      description: reason.description || '',
      is_active: reason.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.reason_name.trim() || !formData.reason_code.trim()) {
        toast.error('Name and code are required');
        return;
      }

      if (selectedReason) {
        // Update existing
        const { error } = await supabase
          .from('visit_reasons')
          .update({
            reason_name: formData.reason_name.trim(),
            reason_code: formData.reason_code.trim(),
            description: formData.description.trim() || null,
            is_active: formData.is_active,
          })
          .eq('id', selectedReason.id);

        if (error) throw error;
        toast.success('Visit reason updated successfully');
      } else {
        // Create new
        const maxOrder = visitReasons.reduce((max, r) => Math.max(max, r.display_order), 0);
        const { error } = await supabase
          .from('visit_reasons')
          .insert({
            reason_name: formData.reason_name.trim(),
            reason_code: formData.reason_code.trim(),
            description: formData.description.trim() || null,
            is_active: formData.is_active,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        toast.success('Visit reason added successfully');
      }

      setEditDialogOpen(false);
      fetchVisitReasons();
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedReason) return;
    
    try {
      const { error } = await supabase
        .from('visit_reasons')
        .delete()
        .eq('id', selectedReason.id);

      if (error) throw error;
      toast.success('Visit reason deleted successfully');
      setDeleteDialogOpen(false);
      fetchVisitReasons();
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const handleToggleActive = async (reason: VisitReason) => {
    try {
      const { error } = await supabase
        .from('visit_reasons')
        .update({ is_active: !reason.is_active })
        .eq('id', reason.id);

      if (error) throw error;
      toast.success(`Visit reason ${!reason.is_active ? 'activated' : 'deactivated'}`);
      fetchVisitReasons();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleReorder = async (reason: VisitReason, direction: 'up' | 'down') => {
    const currentIndex = visitReasons.findIndex(r => r.id === reason.id);
    if (currentIndex === -1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= visitReasons.length) return;

    const swapReason = visitReasons[swapIndex];

    try {
      await supabase
        .from('visit_reasons')
        .update({ display_order: swapReason.display_order })
        .eq('id', reason.id);

      await supabase
        .from('visit_reasons')
        .update({ display_order: reason.display_order })
        .eq('id', swapReason.id);

      toast.success('Order updated');
      fetchVisitReasons();
    } catch (error: any) {
      toast.error('Failed to reorder: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Visit Reasons</CardTitle>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Visit Reason
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visitReasons.map((reason, index) => (
                <TableRow key={reason.id}>
                  <TableCell className="font-medium">{reason.reason_name}</TableCell>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">{reason.reason_code}</code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {reason.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reason.is_active ? 'default' : 'secondary'}>
                      {reason.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorder(reason, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorder(reason, 'down')}
                        disabled={index === visitReasons.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(reason)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedReason(reason);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={reason.is_active}
                        onCheckedChange={() => handleToggleActive(reason)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedReason ? 'Edit Visit Reason' : 'Add Visit Reason'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason_name">Name *</Label>
              <Input
                id="reason_name"
                value={formData.reason_name}
                onChange={(e) => setFormData({ ...formData, reason_name: e.target.value })}
                placeholder="e.g., Regular Checkup"
              />
            </div>
            <div>
              <Label htmlFor="reason_code">Code *</Label>
              <Input
                id="reason_code"
                value={formData.reason_code}
                onChange={(e) => setFormData({ ...formData, reason_code: e.target.value })}
                placeholder="e.g., regular_checkup"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the visit reason "{selectedReason?.reason_name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default VisitReasonsTab;
