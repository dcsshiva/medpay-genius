import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { Plus, Edit, Users, Stethoscope } from 'lucide-react';

interface Doctor {
  id: string;
  doctor_code: string;
  specialization: string;
  rate_per_visit: number;
  is_active: boolean;
  profiles: {
    full_name: string;
  };
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
    rate_per_visit: 500,
    is_active: true
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
          rate_per_visit,
          is_active,
          profiles:profile_id (
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
        // Update existing doctor
        const { error } = await supabase
          .from('doctors')
          .update({
            doctor_code: formData.doctor_code,
            specialization: formData.specialization,
            rate_per_visit: formData.rate_per_visit,
            is_active: formData.is_active
          })
          .eq('id', editingDoctor.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Doctor updated successfully"
        });
      } else {
        // Create new doctor - this requires more complex logic with profiles
        toast({
          variant: "destructive",
          title: "Feature Not Available",
          description: "Creating new doctors requires admin setup. Please contact system administrator."
        });
        return;
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
      rate_per_visit: 500,
      is_active: true
    });
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      full_name: doctor.profiles?.full_name || '',
      doctor_code: doctor.doctor_code,
      specialization: doctor.specialization,
      rate_per_visit: doctor.rate_per_visit,
      is_active: doctor.is_active
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
          <p className="text-muted-foreground">Manage doctor profiles and rates</p>
        </div>
        
        {userRole === 'admin' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Doctor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="rate_per_visit">Rate per Visit (₹)</Label>
                  <Input
                    id="rate_per_visit"
                    type="number"
                    value={formData.rate_per_visit}
                    onChange={(e) => setFormData({ ...formData, rate_per_visit: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                    required
                  />
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
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rate per Visit:</span>
                  <span className="text-sm font-medium text-success">
                    {formatCurrency(doctor.rate_per_visit)}
                  </span>
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