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
import { Plus, Edit, Users, Stethoscope } from 'lucide-react';

interface Doctor {
  id: string;
  doctor_code: string;
  specialization: string;
  is_active: boolean;
  profiles: {
    id: string;
    full_name: string;
  } | null;
}

const DoctorManagement = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    doctor_code: '',
    specialization: '',
    is_active: true,
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
        const { data, error } = await supabase
          .from('doctors')
          .select(`
            id,
            doctor_code,
            specialization,
            is_active,
            profiles:profile_id (
              id,
              full_name
            )
          `)
          .order('created_at', { ascending: false });

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch doctors"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins can manage doctors"
      });
      return;
    }

    try {
      if (editingDoctor) {
        // Update existing doctor and profile
        const { error: updateDoctorError } = await supabase
          .from('doctors')
          .update({
            doctor_code: formData.doctor_code,
            specialization: formData.specialization,
            is_active: formData.is_active
          })
          .eq('id', editingDoctor.id);

        if (updateDoctorError) throw updateDoctorError;

        // Update profile name if changed
        if (editingDoctor.profiles?.id) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: formData.full_name
            })
            .eq('id', editingDoctor.profiles.id);

          if (profileError) throw profileError;
        }

        // Update auth user email/password if provided
        if (formData.email.trim() || formData.password.trim()) {
          // Get the auth user ID from the profile
          const { data: authProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('id', editingDoctor.profiles?.id)
            .single();

          if (authProfile?.user_id) {
            const { error: credUpdateError } = await supabase.functions.invoke('update-user-credentials', {
              body: {
                userId: authProfile.user_id,
                email: formData.email.trim(),
                password: formData.password.trim()
              }
            });

            if (credUpdateError) {
              console.error('Failed to update credentials:', credUpdateError);
              // Don't throw error - continue with other updates
            }
          }
        }

        toast({
          title: "Success",
          description: "Doctor updated successfully"
        });
      // Create new doctor (existing logic)
      if (!formData.email.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Email is required for new doctors"
        });
        return;
      }

      if (!formData.password.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Password is required for new doctors"
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

        // Create auth user via edge function
        const { data: result, error: createUserError } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: formData.password,
            userData: {
              full_name: formData.full_name,
              role: 'doctor'
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
            role: 'doctor'
          })
          .select()
          .single();

        if (profileError) throw profileError;

        // Create doctor record
        const { error: createDoctorError } = await supabase
          .from('doctors')
          .insert({
            profile_id: profileData.id,
            doctor_code: formData.doctor_code,
            specialization: formData.specialization,
            is_active: formData.is_active
          });

        if (createDoctorError) throw createDoctorError;

        toast({
          title: "Success",
          description: "Doctor created successfully"
        });
      }

      setDialogOpen(false);
      setEditingDoctor(null);
      resetForm();
      fetchDoctors();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save doctor"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      doctor_code: '',
      specialization: '',
      is_active: true,
      email: '',
      password: ''
    });
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      full_name: doctor.profiles?.full_name || '',
      doctor_code: doctor.doctor_code,
      specialization: doctor.specialization,
      is_active: doctor.is_active,
      email: '', // Don't pre-fill for security
      password: '' // Don't pre-fill for security
    });
    setDialogOpen(true);
  };

  const toggleDoctorStatus = async (doctorId: string, currentStatus: boolean) => {
    if (userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins can modify doctor status"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('doctors')
        .update({ is_active: !currentStatus })
        .eq('id', doctorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Doctor ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });

      fetchDoctors();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update doctor status"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Doctor Management</h1>
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
          <h1 className="text-3xl font-bold text-foreground">Doctor Management</h1>
          <p className="text-muted-foreground">Manage doctor profiles</p>
        </div>
        
        {userRole === 'admin' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Doctor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
                </DialogTitle>
                <DialogDescription>
                  {editingDoctor ? 'Update doctor information and settings.' : 'Create a new doctor account with login credentials.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Doctor Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Dr. John Doe"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="doctor_code">Doctor Code</Label>
                  <Input
                    id="doctor_code"
                    value={formData.doctor_code}
                    onChange={(e) => setFormData({ ...formData, doctor_code: e.target.value })}
                    placeholder="DOC001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="Cardiology"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email {!editingDoctor && '*'}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                    required={!editingDoctor}
                  />
                  {editingDoctor && (
                    <p className="text-xs text-muted-foreground">
                      Update email address if needed
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password {!editingDoctor && '*'}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingDoctor ? "Leave blank to keep current password" : "Minimum 6 characters"}
                    required={!editingDoctor}
                  />
                  {editingDoctor && (
                    <p className="text-xs text-muted-foreground">
                      Leave blank to keep current password
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="is_active">Status</Label>
                  <Select 
                    value={formData.is_active.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, is_active: value === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingDoctor ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doctor) => (
          <Card key={doctor.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Stethoscope className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{doctor.profiles?.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{doctor.doctor_code}</p>
                  </div>
                </div>
                <Badge variant={doctor.is_active ? "default" : "secondary"}>
                  {doctor.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Specialization:</span>
                  <span className="text-sm font-medium">{doctor.specialization}</span>
                </div>
              </div>
              
              {userRole === 'admin' && (
                <div className="flex space-x-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(doctor)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant={doctor.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleDoctorStatus(doctor.id, doctor.is_active)}
                  >
                    {doctor.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {doctors.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No doctors found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {userRole === 'admin' 
                ? "Get started by adding your first doctor to the system."
                : "No doctors are currently registered in the system."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DoctorManagement;