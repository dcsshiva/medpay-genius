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
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Users, Stethoscope, Search, Edit, Trash2, CheckCircle, Clock, TrendingUp, Activity, FileText, X } from 'lucide-react';
import { VisitManagementTable } from './VisitManagementTable';
import { formatDateIST, formatDateTimeIST, formatInputDateIST, getCurrentISTDate } from '@/lib/dateUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportGeneration from './ReportGeneration';
import { StatsCard } from '@/components/ui/stats-card';
import { LoadingScreen } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChips } from '@/components/ui/filter-chip';

interface Visit {
  id: string;
  visit_code?: string;
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
  insurance_company_id?: string;
  insurance_company_name?: string;
  insurance_company_code?: string;
  doctors: {
    doctor_code: string;
    profiles: {
      full_name: string;
    };
  };
}

interface InsuranceCompany {
  id: string;
  company_name: string;
  company_code?: string;
}

interface Doctor {
  id: string;
  doctor_code: string;
  profiles: {
    full_name: string;
  };
}

interface VisitManagementProps {
  initialSubTab?: string;
}

const VisitManagement = ({ initialSubTab }: VisitManagementProps = {}) => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'doctor_name' | 'doctor_code' | 'patient_name' | 'insurance_company'>('all');
  const [sortField, setSortField] = useState<'visit_date' | 'patient_name' | 'doctor_name'>('visit_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeSubTab, setActiveSubTab] = useState('unprocessed');
  const [formData, setFormData] = useState({
    visit_date: formatInputDateIST(getCurrentISTDate()),
    patient_count: 1,
    patient_id: '',
    patient_name: '',
    visit_payment: '',
    payment_type: 'cash',
    visit_reason: 'regular_checkup',
    notes: '',
    doctor_id: '',
    insurance_company_id: ''
  });

  useEffect(() => {
    fetchVisits();
    fetchInsuranceCompanies();
    if (userRole === 'admin' || userRole === 'manager') {
      fetchDoctors();
    }
  }, [userRole]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const fetchVisits = async () => {
    try {
      // Use auth_user_id for doctor to match RLS policies
      const userId = userRole === 'doctor' 
        ? user?.user_metadata?.auth_user_id || user?.id
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
          visit_code: visit.visit_code,
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
          insurance_company_id: visit.insurance_company_id,
          insurance_company_name: visit.insurance_company_name,
          insurance_company_code: visit.insurance_company_code,
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
          full_name
        `)
        .eq('is_active', true)
        .order('doctor_code');

      if (error) throw error;
      // Transform to match expected structure
      const transformedData = (data || []).map(doc => ({
        ...doc,
        profiles: { full_name: doc.full_name }
      }));
      setDoctors(transformedData);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch doctors"
      });
    }
  };

  const fetchInsuranceCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('id, company_name, company_code')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setInsuranceCompanies(data || []);
    } catch (error) {
      console.error('Error fetching insurance companies:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch insurance companies"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: insurance company required when payment type is insurance
    if (formData.payment_type === 'insurance' && !formData.insurance_company_id) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select an insurance company for insurance payment type"
      });
      return;
    }
    
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
        doctor_id: doctorId,
        insurance_company_id: formData.payment_type === 'insurance' ? formData.insurance_company_id : null
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
      visit_date: formatInputDateIST(getCurrentISTDate()),
      patient_count: 1,
      patient_id: '',
      patient_name: '',
      visit_payment: '',
      payment_type: 'cash',
      visit_reason: 'regular_checkup',
      notes: '',
      doctor_id: '',
      insurance_company_id: ''
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
      doctor_id: visit.doctor_id,
      insurance_company_id: visit.insurance_company_id || ''
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

  // Filter visits by search term and filter type
  const filterVisits = (visitList: Visit[], term: string, filter: typeof searchFilter) => {
    if (!term.trim()) return visitList;
    
    const lowerTerm = term.toLowerCase().trim();
    
    return visitList.filter(visit => {
      switch (filter) {
        case 'doctor_name':
          return visit.doctors?.profiles?.full_name?.toLowerCase().includes(lowerTerm);
        
        case 'doctor_code':
          return visit.doctors?.doctor_code?.toLowerCase().includes(lowerTerm);
        
        case 'patient_name':
          return visit.patient_name?.toLowerCase().includes(lowerTerm);
        
        case 'insurance_company':
          return visit.insurance_company_name?.toLowerCase().includes(lowerTerm);
        
        case 'all':
        default:
          // Search across all fields
          return (
            (visit.visit_code && visit.visit_code.toLowerCase().includes(lowerTerm)) ||
            visit.doctors?.profiles?.full_name?.toLowerCase().includes(lowerTerm) ||
            visit.doctors?.doctor_code?.toLowerCase().includes(lowerTerm) ||
            visit.patient_name?.toLowerCase().includes(lowerTerm) ||
            (visit.patient_id && visit.patient_id.toLowerCase().includes(lowerTerm)) ||
            (visit.insurance_company_name && visit.insurance_company_name.toLowerCase().includes(lowerTerm))
          );
      }
    });
  };

  const getTotalPatients = () => {
    return visits.reduce((total, visit) => total + visit.patient_count, 0);
  };

  const getProcessedCount = () => {
    return visits.filter(v => v.is_processed).length;
  };

  const getCashVisits = () => {
    return visits.filter(v => v.payment_type === 'cash').length;
  };

  const getInsuranceVisits = () => {
    return visits.filter(v => v.payment_type === 'insurance').length;
  };

  const handlePaymentTypeNavigation = (paymentType: 'cash' | 'insurance') => {
    if (paymentType === 'cash') {
      navigate('/dashboard', { state: { activeTab: 'cash-payments' } });
    } else {
      navigate('/dashboard', { state: { activeTab: 'insurance-payments' } });
    }
    
    toast({
      title: "Navigation",
      description: `Opening ${paymentType === 'cash' ? 'Cash' : 'Insurance'} Payment Management`,
    });
  };

  if (loading) {
    return <LoadingScreen message="Loading visit data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Visit Management</h1>
          <p className="text-muted-foreground mt-1">Record and manage patient visits</p>
        </div>
        
        {(userRole === 'admin' || userRole === 'manager' || userRole === 'doctor') && (
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {
              resetForm();
              setEditingVisit(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Visit
          </Button>
        )}
      </div>

      {/* Record Visit Dialog */}
      {(userRole === 'admin' || userRole === 'manager' || userRole === 'doctor') && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
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
                    <Label htmlFor="visit_date">Discharge Date</Label>
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
                    <Select 
                      value={formData.payment_type} 
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        payment_type: value,
                        insurance_company_id: value === 'cash' ? '' : formData.insurance_company_id
                      })}
                    >
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

                {formData.payment_type === 'insurance' && (
                  <div className="space-y-2">
                    <Label htmlFor="insurance_company">Insurance Company *</Label>
                    <Select 
                      value={formData.insurance_company_id} 
                      onValueChange={(value) => setFormData({ ...formData, insurance_company_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select insurance company" />
                      </SelectTrigger>
                      <SelectContent>
                        {insuranceCompanies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.company_name} {company.company_code && `(${company.company_code})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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

      {/* Enhanced Summary Cards with Gradients and Animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 animate-fade-in">
        <StatsCard
          title="Total Visits"
          value={visits.length}
          subtitle="Recorded visits"
          icon={Calendar}
          variant="default"
        />
        
        <StatsCard
          title="Total Patients"
          value={getTotalPatients()}
          subtitle="Patients seen"
          icon={Users}
          variant="success"
        />
        
        <StatsCard
          title="Processed Visits"
          value={`${getProcessedCount()}/${visits.length}`}
          subtitle={`${visits.length > 0 ? ((getProcessedCount() / visits.length) * 100).toFixed(0) : 0}% completed`}
          icon={CheckCircle}
          variant="info"
        />
        
        <StatsCard
          title="Payment Split"
          value={`${getCashVisits()}C / ${getInsuranceVisits()}I`}
          subtitle="Cash vs Insurance"
          icon={Activity}
          variant="warning"
        />
      </div>

      {/* Visits Dashboard with Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-2">
            <TabsTrigger value="unprocessed" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Unprocessed Visits ({visits.filter(v => !v.is_processed).length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Processed Visits ({visits.filter(v => v.is_processed).length})
            </TabsTrigger>
          </TabsList>
          
          {/* Generate Report button aligned to right */}
          <ReportGeneration
            title="Visit Management Report"
            data={visits}
            columns={[
              { 
                key: 'visit_code', 
                label: 'Visit Code' 
              },
              { 
                key: 'visit_date', 
                label: 'Visit Date',
                format: (value) => formatDateIST(value)
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
                key: 'insurance_company_name', 
                label: 'Insurance Company'
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

        <TabsContent value="unprocessed" className="space-y-4">
          {/* Search Input for Unprocessed */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={
                      searchFilter === 'all' 
                        ? "Search all fields..." 
                        : `Search by ${searchFilter.replace('_', ' ')}...`
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground mr-2">Filter by:</span>
                  <Button
                    variant={searchFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('all')}
                  >
                    All Fields
                  </Button>
                  <Button
                    variant={searchFilter === 'doctor_name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('doctor_name')}
                  >
                    Doctor Name
                  </Button>
                  <Button
                    variant={searchFilter === 'doctor_code' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('doctor_code')}
                  >
                    Doctor Code
                  </Button>
                  <Button
                    variant={searchFilter === 'patient_name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('patient_name')}
                  >
                    Patient Name
                  </Button>
                  <Button
                    variant={searchFilter === 'insurance_company' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('insurance_company')}
                  >
                    Insurance Company
                  </Button>
                  
                  {/* Clear Button */}
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchFilter('all');
                      }}
                      className="ml-auto"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              
                {/* Search Results Count */}
                {searchQuery && (
                  <div className="text-sm text-muted-foreground">
                    Found {filterVisits(visits.filter(v => !v.is_processed), searchQuery, searchFilter).length} result
                    {filterVisits(visits.filter(v => !v.is_processed), searchQuery, searchFilter).length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Modern Table */}
          {(() => {
            const unprocessedVisits = visits.filter(v => !v.is_processed);
            const filteredVisits = filterVisits(unprocessedVisits, searchQuery, searchFilter);
            
            return filteredVisits.length > 0 ? (
              <VisitManagementTable
                visits={filteredVisits}
                onEdit={(userRole === 'admin' || userRole === 'manager') ? handleEdit : undefined}
                onDelete={(userRole === 'admin' || userRole === 'manager') ? handleDelete : undefined}
                onPaymentTypeClick={handlePaymentTypeNavigation}
                showActions={userRole === 'admin' || userRole === 'manager'}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={(field) => {
                  if (sortField === field) {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortField(field);
                    setSortDirection('desc');
                  }
                }}
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="No Unprocessed Visits"
                description={
                  searchQuery 
                    ? `No unprocessed visits match your search "${searchQuery}"`
                    : "All visits have been processed or no visits recorded yet."
                }
                action={(userRole === 'admin' || userRole === 'manager' || userRole === 'doctor') ? {
                  label: searchQuery ? 'Clear Search' : 'Record New Visit',
                  onClick: () => searchQuery ? setSearchQuery('') : setDialogOpen(true)
                } : undefined}
              />
            );
          })()}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          {/* Search Input for Processed */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={
                      searchFilter === 'all' 
                        ? "Search all fields..." 
                        : `Search by ${searchFilter.replace('_', ' ')}...`
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground mr-2">Filter by:</span>
                  <Button
                    variant={searchFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('all')}
                  >
                    All Fields
                  </Button>
                  <Button
                    variant={searchFilter === 'doctor_name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('doctor_name')}
                  >
                    Doctor Name
                  </Button>
                  <Button
                    variant={searchFilter === 'doctor_code' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('doctor_code')}
                  >
                    Doctor Code
                  </Button>
                  <Button
                    variant={searchFilter === 'patient_name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('patient_name')}
                  >
                    Patient Name
                  </Button>
                  <Button
                    variant={searchFilter === 'insurance_company' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('insurance_company')}
                  >
                    Insurance Company
                  </Button>
                  
                  {/* Clear Button */}
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchFilter('all');
                      }}
                      className="ml-auto"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              
                {/* Search Results Count */}
                {searchQuery && (
                  <div className="text-sm text-muted-foreground">
                    Found {filterVisits(visits.filter(v => v.is_processed), searchQuery, searchFilter).length} result
                    {filterVisits(visits.filter(v => v.is_processed), searchQuery, searchFilter).length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Modern Table */}
          {(() => {
            const processedVisits = visits.filter(v => v.is_processed);
            const filteredVisits = filterVisits(processedVisits, searchQuery, searchFilter);
            
            return filteredVisits.length > 0 ? (
              <VisitManagementTable
                visits={filteredVisits}
                onEdit={undefined}
                onDelete={undefined}
                onPaymentTypeClick={handlePaymentTypeNavigation}
                showActions={false}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={(field) => {
                  if (sortField === field) {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortField(field);
                    setSortDirection('desc');
                  }
                }}
              />
            ) : (
              <EmptyState
                icon={CheckCircle}
                title="No Processed Visits"
                description={
                  searchQuery 
                    ? `No processed visits match your search "${searchQuery}"`
                    : "No visits have been processed yet."
                }
                action={searchQuery ? {
                  label: 'Clear Search',
                  onClick: () => setSearchQuery('')
                } : undefined}
              />
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VisitManagement;