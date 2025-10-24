import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { validateMobileNumber, formatMobileNumber, validateIFSCCode } from '@/lib/validators';

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person_name: string;
  mobile_number: string;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  account_holder_name: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const VendorDetailsTab = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    vendor_code: '',
    vendor_name: '',
    contact_person_name: '',
    mobile_number: '',
    email: '',
    address: '',
    gst_number: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_holder_name: '',
    description: '',
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast.error('Failed to fetch vendors');
      console.error('Error:', error);
    } else {
      setVendors(data || []);
    }
  };

  const generateVendorCode = async () => {
    const { data } = await supabase
      .from('vendors')
      .select('vendor_code')
      .order('vendor_code', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) return 'VEN001';

    const lastCode = data[0].vendor_code;
    const num = parseInt(lastCode.replace('VEN', '')) + 1;
    return `VEN${num.toString().padStart(3, '0')}`;
  };

  const openAddDialog = async () => {
    const newCode = await generateVendorCode();
    setEditingVendor(null);
    setFormData({
      vendor_code: newCode,
      vendor_name: '',
      contact_person_name: '',
      mobile_number: '',
      email: '',
      address: '',
      gst_number: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      account_holder_name: '',
      description: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_code: vendor.vendor_code,
      vendor_name: vendor.vendor_name,
      contact_person_name: vendor.contact_person_name,
      mobile_number: vendor.mobile_number,
      email: vendor.email || '',
      address: vendor.address || '',
      gst_number: vendor.gst_number || '',
      bank_name: vendor.bank_name || '',
      account_number: vendor.account_number || '',
      ifsc_code: vendor.ifsc_code || '',
      branch_name: vendor.branch_name || '',
      account_holder_name: vendor.account_holder_name || '',
      description: vendor.description || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validations
    if (!validateMobileNumber(formData.mobile_number)) {
      toast.error('Mobile number must be exactly 10 digits');
      setLoading(false);
      return;
    }

    if (formData.ifsc_code && !validateIFSCCode(formData.ifsc_code)) {
      toast.error('Invalid IFSC code format');
      setLoading(false);
      return;
    }

    if (formData.gst_number && formData.gst_number.length !== 15) {
      toast.error('GST number must be 15 characters');
      setLoading(false);
      return;
    }

    const vendorData = {
      ...formData,
      email: formData.email || null,
      address: formData.address || null,
      gst_number: formData.gst_number || null,
      bank_name: formData.bank_name || null,
      account_number: formData.account_number || null,
      ifsc_code: formData.ifsc_code || null,
      branch_name: formData.branch_name || null,
      account_holder_name: formData.account_holder_name || null,
      description: formData.description || null,
    };

    if (editingVendor) {
      const { error } = await supabase
        .from('vendors')
        .update(vendorData)
        .eq('id', editingVendor.id);

      if (error) {
        toast.error('Failed to update vendor');
        console.error('Error:', error);
      } else {
        toast.success('Vendor updated successfully');
        setDialogOpen(false);
        fetchVendors();
      }
    } else {
      const { error } = await supabase
        .from('vendors')
        .insert([vendorData]);

      if (error) {
        toast.error('Failed to create vendor');
        console.error('Error:', error);
      } else {
        toast.success('Vendor created successfully');
        setDialogOpen(false);
        fetchVendors();
      }
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete vendor');
      console.error('Error:', error);
    } else {
      toast.success('Vendor deleted successfully');
      fetchVendors();
    }
  };

  const toggleActive = async (vendor: Vendor) => {
    const { error } = await supabase
      .from('vendors')
      .update({ is_active: !vendor.is_active })
      .eq('id', vendor.id);

    if (error) {
      toast.error('Failed to update vendor status');
      console.error('Error:', error);
    } else {
      toast.success(`Vendor ${!vendor.is_active ? 'activated' : 'deactivated'}`);
      fetchVendors();
    }
  };

  const moveVendor = async (vendor: Vendor, direction: 'up' | 'down') => {
    const currentIndex = vendors.findIndex(v => v.id === vendor.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= vendors.length) return;

    const targetVendor = vendors[targetIndex];

    await supabase
      .from('vendors')
      .update({ display_order: targetVendor.display_order })
      .eq('id', vendor.id);

    await supabase
      .from('vendors')
      .update({ display_order: vendor.display_order })
      .eq('id', targetVendor.id);

    fetchVendors();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Vendor Details</CardTitle>
            <CardDescription>Manage vendor master data and contact information</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic Information</TabsTrigger>
                    <TabsTrigger value="bank">Bank Details</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vendor_code">Vendor Code *</Label>
                        <Input
                          id="vendor_code"
                          value={formData.vendor_code}
                          disabled
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="vendor_name">Vendor Name *</Label>
                        <Input
                          id="vendor_name"
                          value={formData.vendor_name}
                          onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact_person_name">Contact Person *</Label>
                        <Input
                          id="contact_person_name"
                          value={formData.contact_person_name}
                          onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobile_number">Mobile Number *</Label>
                        <Input
                          id="mobile_number"
                          value={formData.mobile_number}
                          onChange={(e) => setFormData({ ...formData, mobile_number: formatMobileNumber(e.target.value) })}
                          maxLength={10}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="gst_number">GST Number</Label>
                        <Input
                          id="gst_number"
                          value={formData.gst_number}
                          onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                          maxLength={15}
                          placeholder="15 characters"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="bank" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bank_name">Bank Name</Label>
                        <Input
                          id="bank_name"
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="account_holder_name">Account Holder Name</Label>
                        <Input
                          id="account_holder_name"
                          value={formData.account_holder_name}
                          onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="account_number">Account Number</Label>
                        <Input
                          id="account_number"
                          value={formData.account_number}
                          onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ifsc_code">IFSC Code</Label>
                        <Input
                          id="ifsc_code"
                          value={formData.ifsc_code}
                          onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                          maxLength={11}
                          placeholder="ABCD0123456"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="branch_name">Branch Name</Label>
                      <Input
                        id="branch_name"
                        value={formData.branch_name}
                        onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 mt-6">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : editingVendor ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>GST Number</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  No vendors found. Click "Add Vendor" to create one.
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor, index) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveVendor(vendor, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveVendor(vendor, 'down')}
                        disabled={index === vendors.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{vendor.vendor_code}</TableCell>
                  <TableCell>{vendor.vendor_name}</TableCell>
                  <TableCell>{vendor.contact_person_name}</TableCell>
                  <TableCell>{vendor.mobile_number}</TableCell>
                  <TableCell>{vendor.email || '-'}</TableCell>
                  <TableCell>{vendor.gst_number || '-'}</TableCell>
                  <TableCell>{vendor.bank_name || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={vendor.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => toggleActive(vendor)}
                    >
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(vendor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(vendor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default VendorDetailsTab;
