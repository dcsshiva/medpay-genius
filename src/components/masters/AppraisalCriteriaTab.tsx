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
import { toast } from 'sonner';
import { Plus, Edit, ArrowUp, ArrowDown } from 'lucide-react';

interface AppraisalCriteria {
  id: string;
  criteria_name: string;
  criteria_code: string;
  description: string | null;
  max_score: number;
  weight: number;
  is_active: boolean;
  display_order: number;
}

const AppraisalCriteriaTab = () => {
  const [criteria, setCriteria] = useState<AppraisalCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState<AppraisalCriteria | null>(null);
  const [formData, setFormData] = useState({
    criteria_name: '',
    criteria_code: '',
    description: '',
    weight: '1.0',
    is_active: true,
  });

  const fetchCriteria = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('appraisal_criteria_master')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      setCriteria(data || []);
    } catch (error: any) {
      toast.error('Failed to load criteria: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriteria();
  }, []);

  const handleAdd = () => {
    setSelectedCriteria(null);
    setFormData({
      criteria_name: '',
      criteria_code: '',
      description: '',
      weight: '1.0',
      is_active: true,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (item: AppraisalCriteria) => {
    setSelectedCriteria(item);
    setFormData({
      criteria_name: item.criteria_name,
      criteria_code: item.criteria_code,
      description: item.description || '',
      weight: String(item.weight),
      is_active: item.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.criteria_name.trim() || !formData.criteria_code.trim()) {
        toast.error('Name and code are required');
        return;
      }

      const weightNum = parseFloat(formData.weight);
      if (isNaN(weightNum) || weightNum <= 0) {
        toast.error('Weight must be a positive number');
        return;
      }

      if (selectedCriteria) {
        const { error } = await (supabase as any)
          .from('appraisal_criteria_master')
          .update({
            criteria_name: formData.criteria_name.trim(),
            criteria_code: formData.criteria_code.trim(),
            description: formData.description.trim() || null,
            weight: weightNum,
            is_active: formData.is_active,
          })
          .eq('id', selectedCriteria.id);

        if (error) throw error;
        toast.success('Criteria updated successfully');
      } else {
        const maxOrder = criteria.reduce((max, c) => Math.max(max, c.display_order), 0);
        const { error } = await (supabase as any)
          .from('appraisal_criteria_master')
          .insert({
            criteria_name: formData.criteria_name.trim(),
            criteria_code: formData.criteria_code.trim(),
            description: formData.description.trim() || null,
            weight: weightNum,
            is_active: formData.is_active,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        toast.success('Criteria added successfully');
      }

      setEditDialogOpen(false);
      fetchCriteria();
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    }
  };

  const handleToggleActive = async (item: AppraisalCriteria) => {
    try {
      const { error } = await (supabase as any)
        .from('appraisal_criteria_master')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;
      toast.success(`Criteria ${!item.is_active ? 'activated' : 'suspended'}`);
      fetchCriteria();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleReorder = async (item: AppraisalCriteria, direction: 'up' | 'down') => {
    const currentIndex = criteria.findIndex(c => c.id === item.id);
    if (currentIndex === -1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= criteria.length) return;

    const swapItem = criteria[swapIndex];

    try {
      await (supabase as any)
        .from('appraisal_criteria_master')
        .update({ display_order: swapItem.display_order })
        .eq('id', item.id);

      await (supabase as any)
        .from('appraisal_criteria_master')
        .update({ display_order: item.display_order })
        .eq('id', swapItem.id);

      toast.success('Order updated');
      fetchCriteria();
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
            <CardTitle>Appraisal Criteria</CardTitle>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Criteria
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
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criteria.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.criteria_name}</TableCell>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">{item.criteria_code}</code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.weight}x</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleReorder(item, 'up')} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleReorder(item, 'down')} disabled={index === criteria.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => handleToggleActive(item)}
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
              {selectedCriteria ? 'Edit Appraisal Criteria' : 'Add Appraisal Criteria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="criteria_name">Name *</Label>
              <Input
                id="criteria_name"
                value={formData.criteria_name}
                onChange={(e) => setFormData({ ...formData, criteria_name: e.target.value })}
                placeholder="e.g., Punctuality"
              />
            </div>
            <div>
              <Label htmlFor="criteria_code">Code *</Label>
              <Input
                id="criteria_code"
                value={formData.criteria_code}
                onChange={(e) => setFormData({ ...formData, criteria_code: e.target.value })}
                placeholder="e.g., punctuality"
              />
            </div>
            <div>
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder="1.0"
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
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppraisalCriteriaTab;
