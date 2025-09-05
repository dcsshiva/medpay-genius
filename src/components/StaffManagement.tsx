import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, UserCheck, UserX } from 'lucide-react';
import { format } from 'date-fns';

interface Staff {
  id: string;
  staff_code: string;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: string;
  department?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

const StaffManagement = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    staff_code: '',
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role: 'nurse',
    department: ''
  });

  const staffRoles = [
    'admin', 'manager', 'nurse', 'doctor', 'technician', 
    'receptionist', 'pharmacist', 'cleaner', 'security'
  ];

  useEffect(() => {
    if (userRole === 'admin') {
      fetchStaff();
    }
  }, [userRole]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch staff. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const generateStaffCode = () => {
    const roles = {
      'admin': 'ADM',
      'manager': 'MGR', 
      'nurse': 'NUR',
      'doctor': 'DOC',
      'technician': 'TEC',
      'receptionist': 'REC',
      'pharmacist': 'PHM',
      'cleaner': 'CLN',
      'security': 'SEC'
    };
    const prefix = roles[formData.role as keyof typeof roles] || 'STF';
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${randomNum}`;
  };

  const hashPassword = async (password: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins can create staff members"
      });
      return;
    }

    // Validation
    if (!formData.username.trim() || !formData.password.trim() || !formData.full_name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Username, password, and full name are required"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Password must be at least 6 characters long"
      });
      return;
    }

    try {
      const staffCode = formData.staff_code || generateStaffCode();

      // Create auth user via edge function
      const { data: result, error: createUserError } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email || `${formData.username}@hospital.local`,
          password: formData.password,
          userData: {
            full_name: formData.full_name,
            role: formData.role
          }
        }
      });

      if (createUserError || !result?.success) {
        throw new Error(result?.error || createUserError?.message || 'Failed to create user');
      }

      // Create profile record
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: result.user.id,
          full_name: formData.full_name,
          role: formData.role as any
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Create staff record with proper profile relationship
      const { error } = await supabase
        .from('staff')
        .insert({
          profile_id: profileData.id, // Secure link to profile
          staff_code: staffCode,
          username: formData.username.trim(),
          password_hash: 'managed_by_supabase_auth', // Placeholder since auth is handled by Supabase
          full_name: formData.full_name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          role: formData.role as any,
          department: formData.department.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Staff member created successfully with code: ${staffCode}`
      });

      setDialogOpen(false);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create staff member"
      });
    }
  };

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: !currentStatus })
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Staff member ${!currentStatus ? 'activated' : 'deactivated'}`
      });

      fetchStaff();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update staff status"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      staff_code: '',
      username: '',
      password: '',
      full_name: '',
      email: '',
      phone: '',
      role: 'nurse',
      department: ''
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'doctor': return 'secondary';
      default: return 'outline';
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Only admins can manage staff.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage hospital staff members and their access</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Create a new staff member account with login credentials and role assignment.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staff_code">Staff Code (Optional)</Label>
                  <Input
                    id="staff_code"
                    value={formData.staff_code}
                    onChange={(e) => setFormData({ ...formData, staff_code: e.target.value })}
                    placeholder="Auto-generated if empty"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Login username"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@hospital.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Emergency, ICU, OPD, etc."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Staff Member
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{staff.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Staff</p>
                <p className="text-2xl font-bold">{staff.filter(s => s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-destructive" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Inactive Staff</p>
                <p className="text-2xl font-bold">{staff.filter(s => !s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((member) => (
          <Card key={member.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{member.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{member.staff_code}</p>
                </div>
                <Badge variant={getRoleBadgeVariant(member.role)}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Username:</span>
                  <span className="text-sm font-medium">{member.username}</span>
                </div>
                {member.email && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="text-sm font-medium">{member.email}</span>
                  </div>
                )}
                {member.department && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Department:</span>
                    <span className="text-sm font-medium">{member.department}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={member.is_active ? 'default' : 'secondary'}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {member.last_login && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Login:</span>
                    <span className="text-sm font-medium">
                      {format(new Date(member.last_login), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  variant={member.is_active ? "outline" : "default"}
                  onClick={() => toggleStaffStatus(member.id, member.is_active)}
                >
                  {member.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {staff.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Staff Members</h3>
            <p className="text-muted-foreground mb-4">Get started by adding your first staff member.</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaffManagement;