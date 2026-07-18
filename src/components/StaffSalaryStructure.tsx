import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface SalaryStructure {
  id: string;
  staff_id: string;
  basic_salary: number;
  hra: number;
  conveyance: number;
  medical: number;
  other_allowances: number;
  is_active: boolean;
  staff?: { full_name: string; staff_code: string; department: string | null };
}

const StaffSalaryStructure: React.FC = () => {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    staff_id: '',
    basic_salary: 0,
    hra: 0,
    conveyance: 0,
    medical: 0,
    other_allowances: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [structRes, staffRes] = await Promise.all([
        supabase.from('staff_salary_structure').select('*, staff(full_name, staff_code, department)'),
        supabase.from('staff').select('id, full_name, staff_code, department').eq('is_active', true).not('role', 'in', '(doctor,admin)').order('full_name'),
      ]);
      if (structRes.data) setStructures(structRes.data as any);
      if (staffRes.data) setStaffList(staffRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.staff_id) { toast.error('Select a staff member'); return; }
    try {
      if (editingId) {
        const { error } = await supabase.from('staff_salary_structure').update({
          basic_salary: form.basic_salary,
          hra: form.hra,
          conveyance: form.conveyance,
          medical: form.medical,
          other_allowances: form.other_allowances,
        }).eq('id', editingId);
        if (error) throw error;
        toast.success('Salary structure updated');
      } else {
        const { error } = await supabase.from('staff_salary_structure').insert({
          staff_id: form.staff_id,
          basic_salary: form.basic_salary,
          hra: form.hra,
          conveyance: form.conveyance,
          medical: form.medical,
          other_allowances: form.other_allowances,
        });
        if (error) throw error;
        toast.success('Salary structure created');
      }
      setDialogOpen(false);
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving');
    }
  };

  const openEdit = async (s: SalaryStructure) => {
    let fresh: SalaryStructure = s;
    try {
      const { data } = await supabase.from('staff_salary_structure').select('*').eq('id', s.id).maybeSingle();
      if (data) fresh = data as SalaryStructure;
    } catch { /* fall back */ }
    setEditingId(fresh.id);
    setForm({
      staff_id: fresh.staff_id,
      basic_salary: fresh.basic_salary,
      hra: fresh.hra,
      conveyance: fresh.conveyance,
      medical: fresh.medical,
      other_allowances: fresh.other_allowances,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ staff_id: '', basic_salary: 0, hra: 0, conveyance: 0, medical: 0, other_allowances: 0 });
    setDialogOpen(true);
  };

  const existingStaffIds = new Set(structures.map(s => s.staff_id));
  const availableStaff = staffList.filter(s => !existingStaffIds.has(s.id));

  const filtered = structures.filter(s =>
    !searchTerm || s.staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.staff?.staff_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSalary = (s: SalaryStructure) => s.basic_salary + s.hra + s.conveyance + s.medical + s.other_allowances;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Salary Structures</h2>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Structure</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">HRA</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead className="text-right">Medical</TableHead>
                <TableHead className="text-right">Other</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No salary structures found</TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{s.staff?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{s.staff?.staff_code}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(s.basic_salary)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.hra)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.conveyance)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.medical)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.other_allowances)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalSalary(s))}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Salary Structure' : 'Add Salary Structure'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingId && (
              <div>
                <Label>Staff Member</Label>
                <select
                  className="w-full border rounded-md p-2 mt-1 bg-background"
                  value={form.staff_id}
                  onChange={e => setForm({ ...form, staff_id: e.target.value })}
                >
                  <option value="">Select staff...</option>
                  {availableStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.staff_code})</option>
                  ))}
                </select>
              </div>
            )}
            {[
              { key: 'basic_salary', label: 'Basic Salary' },
              { key: 'hra', label: 'HRA' },
              { key: 'conveyance', label: 'Conveyance' },
              { key: 'medical', label: 'Medical' },
              { key: 'other_allowances', label: 'Other Allowances' },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  type="number"
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })}
                />
              </div>
            ))}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Monthly Salary</p>
              <p className="text-lg font-bold">
                {formatCurrency(form.basic_salary + form.hra + form.conveyance + form.medical + form.other_allowances)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffSalaryStructure;
