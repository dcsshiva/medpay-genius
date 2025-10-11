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
import { Plus, Edit, ArrowUp, ArrowDown } from 'lucide-react';

interface ComplaintCategory {
  id: string;
  category_name: string;
  category_code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

const ComplaintCategoriesTab = () => {
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory | null>(null);
  const [formData, setFormData] = useState({
    category_name: '',
    category_code: '',
    description: '',
    is_active: true,
  });

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('complaint_categories')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error('Failed to load complaint categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = () => {
    setSelectedCategory(null);
    setFormData({
      category_name: '',
      category_code: '',
      description: '',
      is_active: true,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (category: ComplaintCategory) => {
    setSelectedCategory(category);
    setFormData({
      category_name: category.category_name,
      category_code: category.category_code,
      description: category.description || '',
      is_active: category.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.category_name.trim() || !formData.category_code.trim()) {
        toast.error('Name and code are required');
        return;
      }

      if (selectedCategory) {
        const { error } = await supabase
          .from('complaint_categories')
          .update({
            category_name: formData.category_name.trim(),
            category_code: formData.category_code.trim(),
            description: formData.description.trim() || null,
            is_active: formData.is_active,
          })
          .eq('id', selectedCategory.id);

        if (error) throw error;
        toast.success('Complaint category updated successfully');
      } else {
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.display_order), 0);
        const { error } = await supabase
          .from('complaint_categories')
          .insert({
            category_name: formData.category_name.trim(),
            category_code: formData.category_code.trim(),
            description: formData.description.trim() || null,
            is_active: formData.is_active,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        toast.success('Complaint category added successfully');
      }

      setEditDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    }
  };


  const handleToggleActive = async (category: ComplaintCategory) => {
    try {
      const { error } = await supabase
        .from('complaint_categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);

      if (error) throw error;
      toast.success(`Category ${!category.is_active ? 'activated' : 'deactivated'}`);
      fetchCategories();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleReorder = async (category: ComplaintCategory, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex(c => c.id === category.id);
    if (currentIndex === -1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;

    const swapCategory = categories[swapIndex];

    try {
      await supabase
        .from('complaint_categories')
        .update({ display_order: swapCategory.display_order })
        .eq('id', category.id);

      await supabase
        .from('complaint_categories')
        .update({ display_order: category.display_order })
        .eq('id', swapCategory.id);

      toast.success('Order updated');
      fetchCategories();
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
            <CardTitle>Complaint Categories</CardTitle>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Complaint Category
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
              {categories.map((category, index) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.category_name}</TableCell>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">{category.category_code}</code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {category.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.is_active ? 'default' : 'secondary'}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorder(category, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorder(category, 'down')}
                        disabled={index === categories.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => handleToggleActive(category)}
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
              {selectedCategory ? 'Edit Complaint Category' : 'Add Complaint Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category_name">Name *</Label>
              <Input
                id="category_name"
                value={formData.category_name}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                placeholder="e.g., Service Quality"
              />
            </div>
            <div>
              <Label htmlFor="category_code">Code *</Label>
              <Input
                id="category_code"
                value={formData.category_code}
                onChange={(e) => setFormData({ ...formData, category_code: e.target.value })}
                placeholder="e.g., service_quality"
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
    </>
  );
};

export default ComplaintCategoriesTab;
