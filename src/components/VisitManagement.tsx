import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Users, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';

interface Visit {
  id: string;
  visit_date: string;
  patient_count: number;
  notes?: string;
  doctor_id: string;
  doctors: {
    doctor_code: string;
    profiles: {
      full_name: string;
    };
  };
}

interface Doctor {
  id: string;
  doctor_code: string;
  profiles: {
    full_name: string;
  };
}

const VisitManagement = () => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    doctor_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    patient_count: 1,
    notes: ''
  });

  useEffect(() => {
    fetchVisits();
    if (userRole === 'admin' || userRole === 'manager') {
      fetchDoctors();
    }
  }, [userRole]);

  const fetchVisits = async () => {
    try {
      let query = supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          patient_count,
          notes,
          doctor_id,
          doctors:doctor_id (
            doctor_code,
            profiles:profile_id (
              full_name
            )
          )
        `);

      // If user is a doctor, only show their visits
      if (userRole === 'doctor') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user!.id)
          .single();

        if (profile) {
          const { data: doctorData } = await supabase
            .from('doctors')
            .select('id')
            .eq('profile_id', profile.id)
            .single();

          if (doctorData) {
            query = query.eq('doctor_id', doctorData.id);
          }
        }
      }

      const { data, error } = await query.order('visit_date', { ascending: false });

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch visits"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      console.log('Fetching doctors...');
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          doctor_code,
          profiles:profile_id (
            full_name
          )
        `)
        .eq('is_active', true)
        .order('doctor_code');

      if (error) throw error;
      console.log('Fetched doctors:', data);
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch doctors. Please try again."
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('visits')
        .insert({
          doctor_id: formData.doctor_id,
          visit_date: formData.visit_date,
          patient_count: formData.patient_count,
          notes: formData.notes || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Visit recorded successfully"
      });

      setDialogOpen(false);
      resetForm();
      fetchVisits();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record visit"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      doctor_id: '',
      visit_date: new Date().toISOString().split('T')[0],
      patient_count: 1,
      notes: ''
    });
  };

  const getTotalPatients = () => {
    return visits.reduce((total, visit) => total + visit.patient_count, 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Visit Management</h1>
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
          <h1 className="text-3xl font-bold text-foreground">
            {userRole === 'doctor' ? 'My Visits' : 'Visit Management'}
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'doctor' 
              ? 'View your patient visits'
              : 'Record and manage doctor visits'
            }
          </p>
        </div>
        
        {(userRole === 'admin' || userRole === 'manager') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Record Visit
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Visit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(userRole === 'admin' || userRole === 'manager') && (
                <div className="space-y-2">
                  <Label htmlFor="doctor_id">Doctor</Label>
                  <Select 
                    value={formData.doctor_id} 
                    onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.length === 0 ? (
                        <SelectItem value="no-doctors" disabled>
                          No doctors available - Create a doctor first
                        </SelectItem>
                      ) : (
                        doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.profiles?.full_name} ({doctor.doctor_code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="visit_date">Visit Date</Label>
                <Input
                  id="visit_date"
                  type="date"
                  value={formData.visit_date}
                  onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="patient_count">Patient Count</Label>
                <Input
                  id="patient_count"
                  type="number"
                  min="1"
                  value={formData.patient_count}
                  onChange={(e) => setFormData({ ...formData, patient_count: parseInt(e.target.value) })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes about the visit..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Record Visit
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visits.length}</div>
            <p className="text-xs text-muted-foreground">Recorded visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalPatients()}</div>
            <p className="text-xs text-muted-foreground">Patients seen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average per Visit</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {visits.length > 0 ? (getTotalPatients() / visits.length).toFixed(1) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">Patients per visit</p>
          </CardContent>
        </Card>
      </div>

      {/* Visits List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visits.map((visit) => (
          <Card key={visit.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {format(new Date(visit.visit_date), 'PPP')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {visit.doctors?.profiles?.full_name} ({visit.doctors?.doctor_code})
                  </p>
                </div>
                <Badge variant="secondary">
                  {visit.patient_count} {visit.patient_count === 1 ? 'Patient' : 'Patients'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {visit.notes && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Notes:</p>
                  <p className="text-sm">{visit.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {visits.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No visits recorded</h3>
            <p className="text-muted-foreground text-center mb-4">
              {userRole === 'doctor' 
                ? "No visits have been recorded for you yet."
                : "No visits have been recorded in the system yet."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VisitManagement;