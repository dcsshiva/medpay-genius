import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, FolderOpen } from 'lucide-react';
import { validateMobileNumber, formatMobileNumber, validateIFSCCode } from '@/lib/validators';

interface Vendor {
  id: string; vendor_code: string; vendor_name: string; contact_person_name: string; mobile_number: string;
  email: string | null; address: string | null; gst_number: string | null; bank_name: string | null;
  account_number: string | null; ifsc_code: string | null; branch_name: string | null;
  account_holder_name: string | null; description: string | null; is_active: boolean; display_order: number;
  created_at: string; updated_at: string;
}

interface Props { searchTerm?: string; }

const VendorDetailsTab = ({ searchTerm = '' }: Props) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    vendor_code: '', vendor_name: '', contact_person_name: '', mobile_number: '', email: '',
    address: '', gst_number: '', bank_name: '', account_number: '', ifsc_code: '',
    branch_name: '', account_holder_name: '', description: '',
  });

  useEffect(() => { fetchVendors(); }, []);

  const fetchVendors = async () => {
    const { data, error } = await supabase.from('vendors').select('*').order('display_order', { ascending: true });
    if (error) { toast.error('Failed to fetch vendors'); } else { setVendors(data || []); }
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return vendors;
    const t = searchTerm.toLowerCase();
    return vendors.filter(v => v.vendor_name.toLowerCase().includes(t) || v.vendor_code.toLowerCase().includes(t) || v.contact_person_name.toLowerCase().includes(t) || v.mobile_number.includes(t));
  }, [vendors, searchTerm]);

  const generateVendorCode = async () => {
    const { data } = await supabase.from('vendors').select('vendor_code').order('vendor_code', { ascending: false }).limit(1);
    if (!data || data.length === 0) return 'VEN001';
    const num = parseInt(data[0].vendor_code.replace('VEN', '')) + 1;
    return `VEN${num.toString().padStart(3, '0')}`;
  };

  const openAddDialog = async () => {
    const newCode = await generateVendorCode();
    setEditingVendor(null);
    setFormData({ vendor_code: newCode, vendor_name: '', contact_person_name: '', mobile_number: '', email: '', address: '', gst_number: '', bank_name: '', account_number: '', ifsc_code: '', branch_name: '', account_holder_name: '', description: '' });
    setDialogOpen(true);
  };

  const openEditDialog = async (vendor: Vendor) => {
    let fresh: Vendor = vendor;
    try {
      const { data } = await supabase.from('vendors').select('*').eq('id', vendor.id).maybeSingle();
      if (data) fresh = data as Vendor;
    } catch { /* fall back */ }
    setEditingVendor(fresh);
    setFormData({ vendor_code: fresh.vendor_code, vendor_name: fresh.vendor_name, contact_person_name: fresh.contact_person_name, mobile_number: fresh.mobile_number, email: fresh.email || '', address: fresh.address || '', gst_number: fresh.gst_number || '', bank_name: fresh.bank_name || '', account_number: fresh.account_number || '', ifsc_code: fresh.ifsc_code || '', branch_name: fresh.branch_name || '', account_holder_name: fresh.account_holder_name || '', description: fresh.description || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    if (!validateMobileNumber(formData.mobile_number)) { toast.error('Mobile number must be exactly 10 digits'); setLoading(false); return; }
    if (formData.ifsc_code && !validateIFSCCode(formData.ifsc_code)) { toast.error('Invalid IFSC code format'); setLoading(false); return; }
    if (formData.gst_number && formData.gst_number.length !== 15) { toast.error('GST number must be 15 characters'); setLoading(false); return; }
    const vendorData = { ...formData, email: formData.email || null, address: formData.address || null, gst_number: formData.gst_number || null, bank_name: formData.bank_name || null, account_number: formData.account_number || null, ifsc_code: formData.ifsc_code || null, branch_name: formData.branch_name || null, account_holder_name: formData.account_holder_name || null, description: formData.description || null };
    if (editingVendor) {
      const { error } = await supabase.from('vendors').update(vendorData).eq('id', editingVendor.id);
      if (!error) { toast.success('Vendor updated'); setDialogOpen(false); fetchVendors(); } else toast.error('Failed to update');
    } else {
      const { error } = await supabase.from('vendors').insert([vendorData]);
      if (!error) { toast.success('Vendor created'); setDialogOpen(false); fetchVendors(); } else toast.error('Failed to create');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vendor?')) return;
    const { error } = await supabase.from('vendors').delete().eq('id', id);
    if (!error) { toast.success('Vendor deleted'); fetchVendors(); } else toast.error('Failed');
  };

  const toggleActive = async (vendor: Vendor) => {
    const { error } = await supabase.from('vendors').update({ is_active: !vendor.is_active }).eq('id', vendor.id);
    if (!error) { toast.success(`Vendor ${!vendor.is_active ? 'activated' : 'deactivated'}`); fetchVendors(); }
  };

  const moveVendor = async (vendor: Vendor, direction: 'up' | 'down') => {
    const currentIndex = vendors.findIndex(v => v.id === vendor.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= vendors.length) return;
    const target = vendors[targetIndex];
    await supabase.from('vendors').update({ display_order: target.display_order }).eq('id', vendor.id);
    await supabase.from('vendors').update({ display_order: vendor.display_order }).eq('id', target.id);
    fetchVendors();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div><div className="flex items-center gap-2"><CardTitle className="text-lg">Vendor Details</CardTitle><Badge variant="secondary" className="text-xs">{filtered.length}</Badge></div><CardDescription className="mt-1">Manage vendor master data and contact information</CardDescription></div>
          <Button size="sm" onClick={openAddDialog}><Plus className="h-4 w-4 mr-1" />Add Vendor</Button>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center"><FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" /><p className="text-muted-foreground font-medium">No vendors found</p><p className="text-sm text-muted-foreground/70 mt-1">{searchTerm ? 'Try adjusting your search' : 'Click "Add Vendor" to create one'}</p></div>
        ) : loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-8 w-16" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-28" /><Skeleton className="h-6 w-16 ml-auto" /></div>))}</div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                  <TableHead className="hidden md:table-cell">Mobile</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">GST</TableHead>
                  <TableHead className="hidden xl:table-cell">Bank</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="text-right w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((vendor, index) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveVendor(vendor, 'up')} disabled={index === 0}><ChevronUp className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move up</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveVendor(vendor, 'down')} disabled={index === filtered.length - 1}><ChevronDown className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move down</TooltipContent></Tooltip>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{vendor.vendor_code}</TableCell>
                    <TableCell>{vendor.vendor_name}</TableCell>
                    <TableCell className="hidden md:table-cell">{vendor.contact_person_name}</TableCell>
                    <TableCell className="hidden md:table-cell">{vendor.mobile_number}</TableCell>
                    <TableCell className="hidden lg:table-cell">{vendor.email || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{vendor.gst_number || '-'}</TableCell>
                    <TableCell className="hidden xl:table-cell">{vendor.bank_name || '-'}</TableCell>
                    <TableCell><Switch checked={vendor.is_active} onCheckedChange={() => toggleActive(vendor)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditDialog(vendor)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(vendor.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="basic">Basic Information</TabsTrigger><TabsTrigger value="bank">Bank Details</TabsTrigger></TabsList>
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="vendor_code">Vendor Code *</Label><Input id="vendor_code" value={formData.vendor_code} disabled required /></div>
                  <div className="space-y-2"><Label htmlFor="vendor_name">Vendor Name *</Label><Input id="vendor_name" value={formData.vendor_name} onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="contact_person_name">Contact Person *</Label><Input id="contact_person_name" value={formData.contact_person_name} onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })} required /></div>
                  <div className="space-y-2"><Label htmlFor="mobile_number">Mobile Number *</Label><Input id="mobile_number" value={formData.mobile_number} onChange={(e) => setFormData({ ...formData, mobile_number: formatMobileNumber(e.target.value) })} maxLength={10} required /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="gst_number">GST Number</Label><Input id="gst_number" value={formData.gst_number} onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })} maxLength={15} placeholder="15 characters" /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="address">Address</Label><Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={3} /></div>
                <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
              </TabsContent>
              <TabsContent value="bank" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="bank_name">Bank Name</Label><Input id="bank_name" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="account_holder_name">Account Holder Name</Label><Input id="account_holder_name" value={formData.account_holder_name} onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="account_number">Account Number</Label><Input id="account_number" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="ifsc_code">IFSC Code</Label><Input id="ifsc_code" value={formData.ifsc_code} onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })} maxLength={11} placeholder="ABCD0123456" /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="branch_name">Branch Name</Label><Input id="branch_name" value={formData.branch_name} onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })} /></div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2 mt-6"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? 'Saving...' : editingVendor ? 'Update' : 'Create'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VendorDetailsTab;
