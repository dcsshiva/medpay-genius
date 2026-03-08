import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2, Settings2, FolderOpen } from 'lucide-react';
import { VendorSearchCombobox } from '@/components/ui/vendor-search-combobox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface Role { id: string; role_code: string; role_name: string; }
interface Criteria { id: string; role_id: string; criteria_name: string; criteria_code: string; max_score: number; has_yes_no: boolean; display_order: number; is_active: boolean; }

const RoleAppraisalCriteriaTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [criteriaList, setCriteriaList] = useState<Criteria[]>([]);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMaxScore, setNewMaxScore] = useState('10');
  const [newHasYesNo, setNewHasYesNo] = useState(true);

  useEffect(() => { fetchRoles(); }, []);
  useEffect(() => { if (selectedRole) fetchCriteria(); }, [selectedRole]);

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles_master').select('id, role_code, role_name').eq('is_active', true).order('display_order');
    if (data) setRoles(data); setLoading(false);
  };

  const fetchCriteria = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('role_appraisal_criteria').select('*').eq('role_id', selectedRole).eq('is_active', true).order('display_order');
    setCriteriaList(data || []); setLoading(false);
  };

  const generateCode = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const totalMaxScore = criteriaList.reduce((sum, c) => sum + c.max_score, 0);

  const handleAddCriteria = async () => {
    if (!newName.trim()) { toast({ title: 'Error', description: 'Criteria name is required', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await (supabase as any).from('role_appraisal_criteria').insert({ role_id: selectedRole, criteria_name: newName.trim(), criteria_code: generateCode(newName.trim()), max_score: parseFloat(newMaxScore) || 10, has_yes_no: newHasYesNo, display_order: criteriaList.length + 1 });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Added', description: 'Criteria added' }); setNewName(''); setNewMaxScore('10'); setNewHasYesNo(true); fetchCriteria(); }
    setSaving(false);
  };

  const handleUpdateCriteria = async (id: string, updates: Partial<Criteria>) => {
    const { error } = await (supabase as any).from('role_appraisal_criteria').update(updates).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' }); else fetchCriteria();
  };

  const handleDeleteCriteria = async (id: string) => {
    const { error } = await (supabase as any).from('role_appraisal_criteria').update({ is_active: false }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Removed', description: 'Criteria deactivated' }); fetchCriteria(); }
  };

  const selectedRoleName = roles.find(r => r.id === selectedRole)?.role_name || '';

  if (loading && roles.length === 0) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg"><Settings2 className="h-5 w-5" />Parameter Master</CardTitle>
          <CardDescription>Configure appraisal criteria per role. Each criteria has a Yes/No option and maximum percentage score.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            <Label>Select Role</Label>
            <VendorSearchCombobox items={roles.map(r => ({ id: r.id, code: r.role_code, name: r.role_name }))} value={selectedRole} onValueChange={setSelectedRole} placeholder="Search role..." searchPlaceholder="Type to search role..." emptyMessage="No roles found." />
          </div>
        </CardContent>
      </Card>

      {selectedRole && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Criteria for: {selectedRoleName}</CardTitle>
                <CardDescription>Total Max Score: <span className={totalMaxScore === 100 ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>{totalMaxScore}%</span>{totalMaxScore !== 100 && ' (should equal 100%)'}</CardDescription>
              </div>
              <Badge variant={totalMaxScore === 100 ? 'default' : 'destructive'}>{criteriaList.length} criteria</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-8" /><Skeleton className="h-8 w-40" /><Skeleton className="h-8 w-20" /><Skeleton className="h-6 w-10" /><Skeleton className="h-8 w-8" /></div>))}</div>
            ) : (
              <>
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">S.No</TableHead>
                        <TableHead>Criteria Name</TableHead>
                        <TableHead className="w-32 text-center">Max Score (%)</TableHead>
                        <TableHead className="w-24 text-center">Yes/No</TableHead>
                        <TableHead className="w-20 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {criteriaList.map((criteria, index) => (
                        <TableRow key={criteria.id}>
                          <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>
                            <Input value={criteria.criteria_name} onChange={(e) => setCriteriaList(prev => prev.map(c => c.id === criteria.id ? { ...c, criteria_name: e.target.value } : c))} onBlur={(e) => handleUpdateCriteria(criteria.id, { criteria_name: e.target.value })} className="border-0 bg-transparent hover:bg-muted/50 focus-visible:bg-background" />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input type="number" value={criteria.max_score} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setCriteriaList(prev => prev.map(c => c.id === criteria.id ? { ...c, max_score: val } : c)); }} onBlur={(e) => handleUpdateCriteria(criteria.id, { max_score: parseFloat(e.target.value) || 0 })} className="w-20 text-center mx-auto border-0 bg-transparent hover:bg-muted/50 focus-visible:bg-background" />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={criteria.has_yes_no} onCheckedChange={(checked) => { setCriteriaList(prev => prev.map(c => c.id === criteria.id ? { ...c, has_yes_no: checked } : c)); handleUpdateCriteria(criteria.id, { has_yes_no: checked }); }} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteCriteria(criteria.id)} className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </TooltipTrigger><TooltipContent>Remove</TooltipContent></Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {criteriaList.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center"><FolderOpen className="h-10 w-10 text-muted-foreground/50 mb-2" /><p className="text-muted-foreground">No criteria configured. Add below.</p></div>
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Add New Criteria</h4>
                  <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 space-y-1"><Label className="text-xs">Criteria Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Patient Care" /></div>
                    <div className="w-32 space-y-1"><Label className="text-xs">Max Score (%)</Label><Input type="number" value={newMaxScore} onChange={(e) => setNewMaxScore(e.target.value)} className="text-center" /></div>
                    <div className="flex items-center gap-2"><Switch checked={newHasYesNo} onCheckedChange={setNewHasYesNo} /><Label className="text-xs">Yes/No</Label></div>
                    <Button onClick={handleAddCriteria} disabled={saving || !newName.trim()}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Add</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RoleAppraisalCriteriaTab;
