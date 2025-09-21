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
import { Plus, Calendar, Users, Stethoscope, Search, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportGeneration from './ReportGeneration';

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
  is_processed: boolean;
  processed_in_payment_id?: string;
  processed_at?: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    patient_count: 1,
    patient_id: '',
    patient_name: '',
    visit_payment: '',
    payment_type: 'cash',
    visit_reason: 'regular_checkup',
    notes: '',
    doctor_id: ''
  });

  useEffect(() => {
    fetchVisits();
    if (userRole === 'admin' || userRole === 'manager') {
      fetchDoctors();
    }
  }, [userRole]);

  const fetchVisits = async () => {
    try {
      const userId = userRole === 'doctor' 
        ? user?.user_metadata?.original_id || user?.id
        : user?.id;

      const { data, error } = await supabase.rpc('get_user_visits', {
        _user_type: userRole === 'doctor' ? 'doctor' : 'staff',
        _user_id: userId,
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
          is_processed: visit.is_processed,
          processed_in_payment_id: visit.processed_in_payment_id,
          processed_at: visit.processed_at,
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
      console.error('Error:', error);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          doctor_code,
          profiles!inner (
            full_name
          )
        `)
        .eq('is_active', true)
        .order('doctor_code');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch doctors"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const doctorId = (userRole === 'admin' || userRole === 'manager') 
        ? formData.doctor_id 
        : (user?.user_metadata?.original_id || user?.id);

      const visitData = {
        visit_date: formData.visit_date,
        patient_count: parseInt(formData.patient_count.toString()),
        patient_id: formData.patient_id || null,
        patient_name: formData.patient_name,
        visit_payment: formData.visit_payment ? parseFloat(formData.visit_payment) : null,
        payment_type: formData.payment_type,
        visit_reason: formData.visit_reason,
        notes: formData.notes || null,
        doctor_id: doctorId
      };

      if (editingVisit) {
        // Update existing visit
        const { error } = await supabase
          .from('visits')
          .update(visitData)
          .eq('id', editingVisit.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Visit updated successfully"
        });
      } else {
        // Create new visit
        const { error } = await supabase
          .from('visits')
          .insert([visitData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Visit recorded successfully"
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchVisits();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save visit"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      visit_date: new Date().toISOString().split('T')[0],
      patient_count: 1,
      patient_id: '',
      patient_name: '',
      visit_payment: '',
      payment_type: 'cash',
      visit_reason: 'regular_checkup',
      notes: '',
      doctor_id: ''
    });
    setEditingVisit(null);
  };

  const handleEdit = (visit: Visit) => {
    setFormData({
      visit_date: visit.visit_date,
      patient_count: visit.patient_count,
      patient_id: visit.patient_id || '',
      patient_name: visit.patient_name,
      visit_payment: visit.visit_payment?.toString() || '',
      payment_type: visit.payment_type,
      visit_reason: visit.visit_reason,
      notes: visit.notes || '',
      doctor_id: visit.doctor_id
    });
    setEditingVisit(visit);
    setDialogOpen(true);
  };

  const handleDelete = async (visitId: string) => {
    if (!confirm('Are you sure you want to delete this visit?')) return;

    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Visit deleted successfully"
      });
      
      fetchVisits();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete visit"
      });
    }
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
          <h1 className="text-3xl font-bold text-foreground">Visit Management</h1>
          <p className="text-muted-foreground">Record and manage patient visits</p>
        </div>
        
        {(userRole === 'admin' || userRole === 'manager') && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (open) {
              resetForm();
              setEditingVisit(null);
            }
            setDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record Visit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingVisit ? 'Edit Visit' : 'Record New Visit'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {(userRole === 'admin' || userRole === 'manager') && (
                  <div className="space-y-2">
                    <Label htmlFor="doctor_id">Doctor</Label>
                    <Select value={formData.doctor_id} onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.profiles.full_name} ({doctor.doctor_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
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
                      onChange={(e) => setFormData({ ...formData, patient_count: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient_name">Patient Name</Label>
                    <Input
                      id="patient_name"
                      value={formData.patient_name}
                      onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patient_id">Patient ID (Optional)</Label>
                    <Input
                      id="patient_id"
                      value={formData.patient_id}
                      onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visit_payment">Payment Amount (Optional)</Label>
                    <Input
                      id="visit_payment"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.visit_payment}
                      onChange={(e) => setFormData({ ...formData, visit_payment: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_type">Payment Type</Label>
                    <Select value={formData.payment_type} onValueChange={(value) => setFormData({ ...formData, payment_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
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
                  <Select value={formData.visit_reason} onValueChange={(value) => setFormData({ ...formData, visit_reason: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular_checkup">Regular Checkup</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="treatment">Treatment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (editingVisit ? 'Updating...' : 'Recording...') : (editingVisit ? 'Update Visit' : 'Record Visit')}
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

      {/* Report Generation */}
      <div className="flex justify-end mb-6">
        <ReportGeneration
          title="Visit Management Report"
          data={visits.filter((visit) => {
            const query = searchQuery.toLowerCase();
            return (
              visit.doctors?.profiles?.full_name.toLowerCase().includes(query) ||
              visit.patient_name.toLowerCase().includes(query) ||
              (visit.patient_id && visit.patient_id.toLowerCase().includes(query))
            );
          })}
          columns={[
            { 
              key: 'visit_date', 
              label: 'Visit Date',
              format: (value) => format(new Date(value), 'MMM dd, yyyy')
            },
            { 
              key: 'doctors.profiles.full_name', 
              label: 'Doctor Name' 
            },
            { 
              key: 'doctors.doctor_code', 
              label: 'Doctor Code' 
            },
            { 
              key: 'patient_name', 
              label: 'Patient Name' 
            },
            { 
              key: 'patient_id', 
              label: 'Patient ID' 
            },
            { 
              key: 'patient_count', 
              label: 'Patient Count' 
            },
            { 
              key: 'visit_payment', 
              label: 'Payment',
              format: (value) => value ? `₹${value}` : 'N/A'
            },
            { 
              key: 'payment_type', 
              label: 'Payment Type' 
            },
            { 
              key: 'visit_reason', 
              label: 'Visit Reason' 
            },
            { 
              key: 'notes', 
              label: 'Notes' 
            },
            { 
              key: 'is_processed', 
              label: 'Status',
              format: (value) => value ? 'Processed' : 'Unprocessed'
            }
          ]}
          filename="visit_management_report"
        />
      </div>

      {/* Visits Dashboard with Tabs */}
      <Tabs defaultValue="unprocessed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unprocessed" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Unprocessed Visits ({visits.filter(v => !v.is_processed).length})
          </TabsTrigger>
          <TabsTrigger value="processed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Processed Visits ({visits.filter(v => v.is_processed).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unprocessed" className="space-y-6">
          {/* Search Input for Unprocessed */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search unprocessed visits by doctor name, patient name, or patient ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Unprocessed Visits List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visits
              .filter((visit) => !visit.is_processed)
              .filter((visit) => {
                const query = searchQuery.toLowerCase();
                return (
                  visit.doctors?.profiles?.full_name.toLowerCase().includes(query) ||
                  visit.patient_name.toLowerCase().includes(query) ||
                  (visit.patient_id && visit.patient_id.toLowerCase().includes(query))
                );
              })
               .map((visit) => (
              <Card key={visit.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {format(new Date(visit.visit_date), 'PPP')}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          Unprocessed
                        </Badge>
                      </div>
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
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reason:</span>
                      <span className="font-medium capitalize">{visit.visit_reason.replace('_', ' ')}</span>
                    </div>
                    {visit.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1 text-sm bg-muted p-2 rounded">{visit.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  {(userRole === 'admin' || userRole === 'manager') && (
                    <div className="flex space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(visit)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(visit.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State for Unprocessed */}
          {visits.filter(v => !v.is_processed).length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No unprocessed visits</h3>
                <p className="text-muted-foreground text-center mb-4">
                  All visits have been processed in payment advice.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-6">
          {/* Search Input for Processed */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search processed visits by doctor name, patient name, or patient ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Processed Visits List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visits
              .filter((visit) => visit.is_processed)
              .filter((visit) => {
                const query = searchQuery.toLowerCase();
                return (
                  visit.doctors?.profiles?.full_name.toLowerCase().includes(query) ||
                  visit.patient_name.toLowerCase().includes(query) ||
                  (visit.patient_id && visit.patient_id.toLowerCase().includes(query))
                );
              })
               .map((visit) => (
              <Card key={visit.id} className="opacity-80 border-success/20">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {format(new Date(visit.visit_date), 'PPP')}
                        </CardTitle>
                        <Badge variant="default" className="text-xs bg-success">
                          Processed
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {visit.doctors?.profiles?.full_name} ({visit.doctors?.doctor_code})
                      </p>
                      {visit.patient_name && (
                        <p className="text-sm font-medium">
                          Patient: {visit.patient_name}
                          {visit.patient_id && ` (${visit.patient_id})`}
                        </p>
                      )}
                      {visit.processed_at && (
                        <p className="text-xs text-muted-foreground">
                          Processed: {format(new Date(visit.processed_at), 'MMM dd, yyyy HH:mm')}
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
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reason:</span>
                      <span className="font-medium capitalize">{visit.visit_reason.replace('_', ' ')}</span>
                    </div>
                    {visit.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1 text-sm bg-muted p-2 rounded">{visit.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State for Processed */}
          {visits.filter(v => v.is_processed).length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No processed visits</h3>
                <p className="text-muted-foreground text-center mb-4">
                  No visits have been processed in payment advice yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VisitManagement;