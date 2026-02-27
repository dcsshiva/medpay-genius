import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, X, Building2 } from 'lucide-react';
import { VendorSearchCombobox } from '@/components/ui/vendor-search-combobox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface Department {
  id: string;
  department_code: string;
  department_name: string;
}

interface Role {
  id: string;
  role_code: string;
  role_name: string;
}

interface Mapping {
  id: string;
  department_id: string;
  role_id: string;
  is_active: boolean;
}

const DepartmentRoleMappingTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [deptRes, roleRes, mapRes] = await Promise.all([
      supabase.from('departments_master').select('id, department_code, department_name').eq('is_active', true).order('display_order'),
      supabase.from('roles_master').select('id, role_code, role_name').eq('is_active', true).order('display_order'),
      (supabase as any).from('department_role_mapping').select('id, department_id, role_id, is_active').eq('is_active', true),
    ]);
    if (deptRes.data) setDepartments(deptRes.data);
    if (roleRes.data) setRoles(roleRes.data);
    if (mapRes.data) setMappings(mapRes.data);
    setLoading(false);
  };

  const handleAddMapping = async () => {
    if (!selectedDepartment || !selectedRole) {
      toast({ title: 'Error', description: 'Select both department and role', variant: 'destructive' });
      return;
    }

    const exists = mappings.find(m => m.department_id === selectedDepartment && m.role_id === selectedRole);
    if (exists) {
      toast({ title: 'Already Mapped', description: 'This role is already mapped to this department', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await (supabase as any).from('department_role_mapping').insert({
      department_id: selectedDepartment,
      role_id: selectedRole,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Role mapped to department' });
      setSelectedRole('');
      fetchAll();
    }
    setSaving(false);
  };

  const handleRemoveMapping = async (id: string) => {
    const { error } = await (supabase as any).from('department_role_mapping').update({ is_active: false }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Removed', description: 'Mapping removed' });
      fetchAll();
    }
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.department_name || 'Unknown';
  const getRoleName = (id: string) => roles.find(r => r.id === id)?.role_name || 'Unknown';

  // Group mappings by department
  const groupedMappings = departments.map(dept => ({
    ...dept,
    roles: mappings.filter(m => m.department_id === dept.id),
  })).filter(d => d.roles.length > 0);

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add Department-Role Mapping
          </CardTitle>
          <CardDescription>Assign roles to departments. Staff role dropdown will filter based on selected department.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Department</label>
              <VendorSearchCombobox
                items={departments.map(d => ({ id: d.id, code: d.department_code, name: d.department_name }))}
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
                placeholder="Search department..."
                searchPlaceholder="Type to search..."
                emptyMessage="No departments found."
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Role</label>
              <VendorSearchCombobox
                items={roles.map(r => ({ id: r.id, code: r.role_code, name: r.role_name }))}
                value={selectedRole}
                onValueChange={setSelectedRole}
                placeholder="Search role..."
                searchPlaceholder="Type to search..."
                emptyMessage="No roles found."
              />
            </div>
            <Button onClick={handleAddMapping} disabled={saving || !selectedDepartment || !selectedRole}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Mapping
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          {groupedMappings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No mappings found. Add department-role mappings above.</p>
          ) : (
            <div className="space-y-4">
              {groupedMappings.map(dept => (
                <div key={dept.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-sm mb-3">{dept.department_name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {dept.roles.map(mapping => (
                      <Badge key={mapping.id} variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
                        {getRoleName(mapping.role_id)}
                        <button
                          onClick={() => handleRemoveMapping(mapping.id)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DepartmentRoleMappingTab;
