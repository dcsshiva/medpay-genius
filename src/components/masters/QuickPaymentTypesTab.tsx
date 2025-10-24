import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface QuickPaymentType {
  id: string;
  type_code: string;
  type_name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

const QuickPaymentTypesTab = () => {
  const [types, setTypes] = useState<QuickPaymentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingType, setEditingType] = useState<QuickPaymentType | null>(null);
  const [formData, setFormData] = useState({
    type_code: '',
    type_name: '',
    description: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_payment_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTypes(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch quick payment types');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingType) {
        const { error } = await supabase
          .from('quick_payment_types')
          .update(formData)
          .eq('id', editingType.id);

        if (error) throw error;
        toast.success('Quick payment type updated successfully');
      } else {
        const { error } = await supabase
          .from('quick_payment_types')
          .insert([formData]);

        if (error) throw error;
        toast.success('Quick payment type created successfully');
      }

      setOpen(false);
      resetForm();
      fetchTypes();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save quick payment type');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quick payment type?')) return;

    try {
      const { error } = await supabase
        .from('quick_payment_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Quick payment type deleted successfully');
      fetchTypes();
    } catch (error: any) {
      toast.error('Failed to delete quick payment type');
      console.error('Error:', error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('quick_payment_types')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Quick payment type ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchTypes();
    } catch (error: any) {
      toast.error('Failed to update status');
      console.error('Error:', error);
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const index = types.findIndex(t => t.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === types.length - 1) return;

    const newTypes = [...types];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newTypes[index], newTypes[targetIndex]] = [newTypes[targetIndex], newTypes[index]];

    try {
      const updates = newTypes.map((type, idx) => ({
        id: type.id,
        display_order: idx,
      }));

      for (const update of updates) {
        await supabase
          .from('quick_payment_types')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      fetchTypes();
    } catch (error: any) {
      toast.error('Failed to reorder');
      console.error('Error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      type_code: '',
      type_name: '',
      description: '',
      is_active: true,
      display_order: types.length,
    });
    setEditingType(null);
  };

  const openEditDialog = (type: QuickPaymentType) => {
    setEditingType(type);
    setFormData({
      type_code: type.type_code,
      type_name: type.type_name,
      description: type.description || '',
      is_active: type.is_active,
      display_order: type.display_order,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Quick Payment Types</h3>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Edit Quick Payment Type' : 'Add Quick Payment Type'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type_name">Type Name *</Label>
                <Input
                  id="type_name"
                  value={formData.type_name}
                  onChange={(e) => setFormData({ ...formData, type_name: e.target.value })}
                  placeholder="e.g., Vendor Payment"
                  required
                />
              </div>
              <div>
                <Label htmlFor="type_code">Type Code *</Label>
                <Input
                  id="type_code"
                  value={formData.type_code}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    type_code: e.target.value.toLowerCase().replace(/\s+/g, '_') 
                  })}
                  placeholder="e.g., vendor_payment"
                  required
                  disabled={!!editingType}
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
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Type Name</TableHead>
              <TableHead>Type Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((type, index) => (
              <TableRow key={type.id}>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReorder(type.id, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReorder(type.id, 'down')}
                      disabled={index === types.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{type.type_name}</TableCell>
                <TableCell className="font-mono text-sm">{type.type_code}</TableCell>
                <TableCell>{type.description || '-'}</TableCell>
                <TableCell>
                  <Switch
                    checked={type.is_active}
                    onCheckedChange={() => handleToggleActive(type.id, type.is_active)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(type)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(type.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default QuickPaymentTypesTab;
