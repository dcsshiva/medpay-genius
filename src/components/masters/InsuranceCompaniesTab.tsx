import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Pencil, ArrowUp, ArrowDown, FolderOpen } from 'lucide-react';

interface InsuranceCompany { id: string; company_name: string; company_code: string | null; contact_number: string | null; email: string | null; is_active: boolean; display_order: number; }
interface Props { searchTerm?: string; }

const InsuranceCompaniesTab = ({ searchTerm = '' }: Props) => {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany | null>(null);
  const [formData, setFormData] = useState({ company_name: '', company_code: '', contact_number: '', email: '', is_active: true });

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.from('insurance_companies').select('*').order('display_order');
      if (error) throw error; setCompanies(data || []);
    } catch (error: any) { toast.error('Failed to load: ' + error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return companies;
    const t = searchTerm.toLowerCase();
    return companies.filter(c => c.company_name.toLowerCase().includes(t) || (c.company_code && c.company_code.toLowerCase().includes(t)));
  }, [companies, searchTerm]);

  const handleAdd = () => { setSelectedCompany(null); setFormData({ company_name: '', company_code: '', contact_number: '', email: '', is_active: true }); setEditDialogOpen(true); };
  const handleEdit = async (c: InsuranceCompany) => {
    let fresh: InsuranceCompany = c;
    try {
      const { data } = await supabase.from('insurance_companies').select('*').eq('id', c.id).maybeSingle();
      if (data) fresh = data as InsuranceCompany;
    } catch { /* fall back to cached row */ }
    setSelectedCompany(fresh);
    setFormData({ company_name: fresh.company_name, company_code: fresh.company_code || '', contact_number: fresh.contact_number || '', email: fresh.email || '', is_active: fresh.is_active });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.company_name.trim()) { toast.error('Company name is required'); return; }
      if (selectedCompany) {
        const { error } = await supabase.from('insurance_companies').update({ company_name: formData.company_name.trim(), company_code: formData.company_code.trim() || null, contact_number: formData.contact_number.trim() || null, email: formData.email.trim() || null, is_active: formData.is_active }).eq('id', selectedCompany.id);
        if (error) throw error; toast.success('Updated');
      } else {
        const maxOrder = companies.reduce((max, c) => Math.max(max, c.display_order), 0);
        const { error } = await supabase.from('insurance_companies').insert({ company_name: formData.company_name.trim(), company_code: formData.company_code.trim() || null, contact_number: formData.contact_number.trim() || null, email: formData.email.trim() || null, is_active: formData.is_active, display_order: maxOrder + 1 });
        if (error) throw error; toast.success('Added');
      }
      setEditDialogOpen(false); fetchCompanies();
    } catch (error: any) { toast.error('Failed: ' + error.message); }
  };

  const handleToggleActive = async (c: InsuranceCompany) => {
    try { const { error } = await supabase.from('insurance_companies').update({ is_active: !c.is_active }).eq('id', c.id); if (error) throw error; toast.success(`${!c.is_active ? 'Activated' : 'Deactivated'}`); fetchCompanies(); }
    catch (error: any) { toast.error('Failed'); }
  };

  const handleReorder = async (company: InsuranceCompany, direction: 'up' | 'down') => {
    const currentIndex = companies.findIndex(c => c.id === company.id);
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= companies.length) return;
    const swap = companies[swapIndex];
    try {
      await supabase.from('insurance_companies').update({ display_order: swap.display_order }).eq('id', company.id);
      await supabase.from('insurance_companies').update({ display_order: company.display_order }).eq('id', swap.id);
      fetchCompanies();
    } catch { toast.error('Failed to reorder'); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div><div className="flex items-center gap-2"><CardTitle className="text-lg">Insurance Companies</CardTitle><Badge variant="secondary" className="text-xs">{filtered.length}</Badge></div><CardDescription className="mt-1">Manage insurance company records</CardDescription></div>
          <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />Add Company</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-28" /><Skeleton className="h-6 w-16" /><Skeleton className="h-8 w-20 ml-auto" /></div>))}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center"><FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" /><p className="text-muted-foreground font-medium">No insurance companies found</p><p className="text-sm text-muted-foreground/70 mt-1">{searchTerm ? 'Try adjusting your search' : 'Click "Add Company" to create one'}</p></div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader><TableRow><TableHead>Company Name</TableHead><TableHead>Code</TableHead><TableHead className="hidden md:table-cell">Contact</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead className="w-24">Status</TableHead><TableHead className="text-right w-36">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((c, index) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.company_name}</TableCell>
                    <TableCell>{c.company_code ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.company_code}</code> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{c.contact_number || '-'}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{c.email || '-'}</TableCell>
                    <TableCell><Switch checked={c.is_active} onCheckedChange={() => handleToggleActive(c)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleReorder(c, 'up')} disabled={index === 0}><ArrowUp className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move up</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleReorder(c, 'down')} disabled={index === filtered.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Move down</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedCompany ? 'Edit Insurance Company' : 'Add Insurance Company'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="company_name">Company Name *</Label><Input id="company_name" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="e.g., Star Health" /></div>
            <div className="space-y-2"><Label htmlFor="company_code">Company Code</Label><Input id="company_code" value={formData.company_code} onChange={(e) => setFormData({ ...formData, company_code: e.target.value })} placeholder="e.g., STAR_HEALTH" /></div>
            <div className="space-y-2"><Label htmlFor="contact_number">Contact Number</Label><Input id="contact_number" value={formData.contact_number} onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })} placeholder="e.g., +91 1800 123 4567" /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="e.g., support@starhealth.in" /></div>
            <div className="flex items-center space-x-2"><Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} /><Label htmlFor="is_active">Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default InsuranceCompaniesTab;
