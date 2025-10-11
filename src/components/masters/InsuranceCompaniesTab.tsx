import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Edit, ArrowUp, ArrowDown } from 'lucide-react';

interface InsuranceCompany {
  id: string;
  company_name: string;
  company_code: string | null;
  contact_number: string | null;
  email: string | null;
  is_active: boolean;
  display_order: number;
}

const InsuranceCompaniesTab = () => {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    company_code: '',
    contact_number: '',
    email: '',
    is_active: true,
  });

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      toast.error('Failed to load insurance companies: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleAdd = () => {
    setSelectedCompany(null);
    setFormData({
      company_name: '',
      company_code: '',
      contact_number: '',
      email: '',
      is_active: true,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (company: InsuranceCompany) => {
    setSelectedCompany(company);
    setFormData({
      company_name: company.company_name,
      company_code: company.company_code || '',
      contact_number: company.contact_number || '',
      email: company.email || '',
      is_active: company.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.company_name.trim()) {
        toast.error('Company name is required');
        return;
      }

      if (selectedCompany) {
        const { error } = await supabase
          .from('insurance_companies')
          .update({
            company_name: formData.company_name.trim(),
            company_code: formData.company_code.trim() || null,
            contact_number: formData.contact_number.trim() || null,
            email: formData.email.trim() || null,
            is_active: formData.is_active,
          })
          .eq('id', selectedCompany.id);

        if (error) throw error;
        toast.success('Insurance company updated successfully');
      } else {
        const maxOrder = companies.reduce((max, c) => Math.max(max, c.display_order), 0);
        const { error } = await supabase
          .from('insurance_companies')
          .insert({
            company_name: formData.company_name.trim(),
            company_code: formData.company_code.trim() || null,
            contact_number: formData.contact_number.trim() || null,
            email: formData.email.trim() || null,
            is_active: formData.is_active,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        toast.success('Insurance company added successfully');
      }

      setEditDialogOpen(false);
      fetchCompanies();
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    }
  };


  const handleToggleActive = async (company: InsuranceCompany) => {
    try {
      const { error } = await supabase
        .from('insurance_companies')
        .update({ is_active: !company.is_active })
        .eq('id', company.id);

      if (error) throw error;
      toast.success(`Company ${!company.is_active ? 'activated' : 'deactivated'}`);
      fetchCompanies();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleReorder = async (company: InsuranceCompany, direction: 'up' | 'down') => {
    const currentIndex = companies.findIndex(c => c.id === company.id);
    if (currentIndex === -1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= companies.length) return;

    const swapCompany = companies[swapIndex];

    try {
      await supabase
        .from('insurance_companies')
        .update({ display_order: swapCompany.display_order })
        .eq('id', company.id);

      await supabase
        .from('insurance_companies')
        .update({ display_order: company.display_order })
        .eq('id', swapCompany.id);

      toast.success('Order updated');
      fetchCompanies();
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
            <CardTitle>Insurance Companies</CardTitle>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Insurance Company
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company, index) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.company_name}</TableCell>
                  <TableCell>
                    {company.company_code ? (
                      <code className="bg-muted px-2 py-1 rounded text-sm">{company.company_code}</code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{company.contact_number || '-'}</TableCell>
                  <TableCell className="text-sm">{company.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={company.is_active ? 'default' : 'secondary'}>
                      {company.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorder(company, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorder(company, 'down')}
                        disabled={index === companies.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(company)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={company.is_active}
                        onCheckedChange={() => handleToggleActive(company)}
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
              {selectedCompany ? 'Edit Insurance Company' : 'Add Insurance Company'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g., Star Health & Allied Insurance"
              />
            </div>
            <div>
              <Label htmlFor="company_code">Company Code</Label>
              <Input
                id="company_code"
                value={formData.company_code}
                onChange={(e) => setFormData({ ...formData, company_code: e.target.value })}
                placeholder="e.g., STAR_HEALTH"
              />
            </div>
            <div>
              <Label htmlFor="contact_number">Contact Number</Label>
              <Input
                id="contact_number"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="e.g., +91 1800 123 4567"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., support@starhealth.in"
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

export default InsuranceCompaniesTab;
