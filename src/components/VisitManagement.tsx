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
  patient_id?: string;
  patient_name: string;
  visit_payment?: number;
  payment_type: string;
  visit_reason: string;
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
    patient_id: '',
    patient_name: '',
    visit_payment: 0,
    payment_type: 'cash',
    visit_reason: 'regular_checkup',
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
      // Use secure RPC function for custom auth
      const { data, error } = await supabase.rpc('get_user_visits', {
        _user_type: user?.user_metadata?.user_type || 'staff',
        _user_id: user?.user_metadata?.original_id,
        _user_role: userRole || 'staff'
      });

      if (error) {
        console.error('Error fetching visits:', error);
        setVisits([]);
      } else {
        // Transform the RPC response to match the expected format
        const transformedVisits = data?.map((visit: any) => ({
          id: visit.id,
          visit_date: visit.visit_date,
          patient_count: visit.patient_count,
          patient_id: visit.patient_id,
          patient_name: visit.patient_name,
          visit_payment: visit.visit_payment,
          payment_type: visit.payment_type,
          visit_reason: visit.visit_reason,
          notes: visit.notes,
          doctor_id: visit.doctor_id,
          doctors: {
            doctor_code: visit.doctor_code,
            profiles: {
              full_name: visit.doctor_name
            }
          }
        })) || [];
        setVisits(transformedVisits);
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
      setVisits([]);
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

    // Validation checks
    if (!formData.patient_name?.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Patient name is required"
      });
      return;
    }

    if (!formData.patient_id?.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error", 
        description: "Patient ID is required"
      });
      return;
    }

    if (!formData.visit_payment || formData.visit_payment <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Visit payment must be greater than zero"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('visits')
        .insert({
          doctor_id: formData.doctor_id,
          visit_date: formData.visit_date,
          patient_count: formData.patient_count,
          patient_id: formData.patient_id.trim(),
          patient_name: formData.patient_name.trim(),
          visit_payment: formData.visit_payment,
          payment_type: formData.payment_type,
          visit_reason: formData.visit_reason,
          notes: formData.notes || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Visit recorded successfully with Patient ID: ${formData.patient_id.trim()}`
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
      patient_id: '',
      patient_name: '',
      visit_payment: 0,
      payment_type: 'cash',
      visit_reason: 'regular_checkup',
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient_id">Patient ID *</Label>
                  <Input
                    id="patient_id"
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    placeholder="P001, P002, etc."
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="patient_name">Patient Name *</Label>
                  <Input
                    id="patient_name"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visit_payment">Visit Payment (₹) *</Label>
                  <Input
                    id="visit_payment"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.visit_payment}
                    onChange={(e) => setFormData({ ...formData, visit_payment: parseFloat(e.target.value) || 0 })}
                    placeholder="500.00"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment_type">Payment Type</Label>
                  <Select 
                    value={formData.payment_type} 
                    onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visit_reason">Visit Reason</Label>
                <Select 
                  value={formData.visit_reason} 
                  onValueChange={(value) => setFormData({ ...formData, visit_reason: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular_checkup">Regular Checkup</SelectItem>
                    <SelectItem value="surgery">Surgery</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                  </SelectContent>
                </Select>
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
                  {visit.patient_name && (
                    <p className="text-sm font-medium">
                      Patient: {visit.patient_name}
                      {visit.patient_id && ` (${visit.patient_id})`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant="secondary">
                    {visit.patient_count} {visit.patient_count === 1 ? 'Patient' : 'Patients'}
                  </Badge>
                  {visit.visit_payment && (
                    <div className="mt-1 flex flex-col gap-1">
                      <Badge variant="outline">₹{visit.visit_payment}</Badge>
                      <Badge variant={visit.payment_type === 'cash' ? 'default' : 'secondary'} className="text-xs">
                        {visit.payment_type === 'cash' ? 'Cash' : 'Insurance'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {visit.visit_reason && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Reason:</span>
                    <Badge variant="default">
                      {visit.visit_reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>
                )}
                
                {visit.notes && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Notes:</p>
                    <p className="text-sm">{visit.notes}</p>
                  </div>
                )}
              </div>
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