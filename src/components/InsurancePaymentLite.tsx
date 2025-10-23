import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { Calendar, Shield, Plus, RefreshCw, Search } from 'lucide-react';
import { formatDateIST, formatInputDateIST, getCurrentISTDate } from '@/lib/dateUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import PaymentManagement from './PaymentManagement';

interface Visit {
  id: string;
  visit_code: string;
  visit_date: string;
  patient_count: number;
  patient_name: string;
  visit_payment: number;
  payment_type: string;
  visit_reason: string;
  doctor_id: string;
  insurance_company_id?: string;
  doctors: {
    doctor_code: string;
    full_name: string;
  };
  insurance_companies?: {
    company_name: string;
    company_code?: string;
  };
}

const InsurancePaymentLite = () => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedVisitIds, setSelectedVisitIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('create');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'doctor_name' | 'doctor_code' | 'patient_name' | 'insurance_company'>('all');
  
  // Date range state - default to last 30 days
  const today = getCurrentISTDate();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [startDate, setStartDate] = useState(formatInputDateIST(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(formatInputDateIST(today));

  const fetchVisitsByDateRange = async () => {
    if (!startDate || !endDate) {
      toast({
        variant: "destructive",
        title: "Invalid Date Range",
        description: "Please select both start and end dates"
      });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast({
        variant: "destructive",
        title: "Invalid Date Range",
        description: "End date must be after start date"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          visit_code,
          visit_date,
          patient_count,
          patient_name,
          visit_payment,
          payment_type,
          visit_reason,
          doctor_id,
          insurance_company_id,
          doctors!inner (
            doctor_code,
            full_name
          ),
          insurance_companies (
            company_name,
            company_code
          )
        `)
        .eq('is_processed', false)
        .eq('payment_type', 'insurance')
        .gte('visit_date', startDate)
        .lte('visit_date', endDate)
        .order('doctor_id')
        .order('visit_date', { ascending: false });

      if (error) throw error;

      setVisits(data || []);
      setSelectedVisitIds(new Set());
      
      if (data && data.length === 0) {
        toast({
          title: "No Visits Found",
          description: "No unprocessed insurance visits found in the selected date range"
        });
      }
    } catch (error: any) {
      console.error('Error fetching visits:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch visits"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisit = (visitId: string) => {
    setSelectedVisitIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitId)) {
        newSet.delete(visitId);
      } else {
        newSet.add(visitId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedVisitIds(new Set(filteredVisits.map(v => v.id)));
  };

  const handleClearAll = () => {
    setSelectedVisitIds(new Set());
  };

  // Filter visits based on search term and field
  const filteredVisits = visits.filter(visit => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    switch (searchField) {
      case 'doctor_name':
        return visit.doctors.full_name.toLowerCase().includes(searchLower);
      case 'doctor_code':
        return visit.doctors.doctor_code.toLowerCase().includes(searchLower);
      case 'patient_name':
        return visit.patient_name.toLowerCase().includes(searchLower);
      case 'insurance_company':
        return visit.insurance_companies?.company_name.toLowerCase().includes(searchLower) || false;
      case 'all':
      default:
        return (
          visit.doctors.full_name.toLowerCase().includes(searchLower) ||
          visit.doctors.doctor_code.toLowerCase().includes(searchLower) ||
          visit.patient_name.toLowerCase().includes(searchLower) ||
          visit.visit_code.toLowerCase().includes(searchLower) ||
          (visit.insurance_companies?.company_name.toLowerCase().includes(searchLower))
        );
    }
  });

  const selectedVisits = filteredVisits.filter(v => selectedVisitIds.has(v.id));
  const totalSelectedAmount = selectedVisits.reduce((sum, v) => sum + (v.visit_payment || 0), 0);
  
  // Group selected visits by doctor
  const visitsByDoctor = selectedVisits.reduce((acc, visit) => {
    if (!acc[visit.doctor_id]) {
      acc[visit.doctor_id] = {
        doctor_id: visit.doctor_id,
        doctor_code: visit.doctors.doctor_code,
        doctor_name: visit.doctors.full_name,
        visits: []
      };
    }
    acc[visit.doctor_id].visits.push(visit);
    return acc;
  }, {} as Record<string, any>);

  const uniqueDoctorCount = Object.keys(visitsByDoctor).length;

  const handleCreatePaymentAdvices = async () => {
    if (selectedVisitIds.size === 0) {
      toast({
        variant: "destructive",
        title: "No Visits Selected",
        description: "Please select at least one visit to create payment advice"
      });
      return;
    }

    setSubmitting(true);
    try {
      const doctorGroups = Object.values(visitsByDoctor);
      const createdPayments = [];

      for (const group of doctorGroups) {
        const totalAmount = group.visits.reduce((sum: number, v: Visit) => sum + (v.visit_payment || 0), 0);
        const totalVisitsCount = group.visits.reduce((sum: number, v: Visit) => sum + v.patient_count, 0);
        const visitDates = group.visits.map((v: Visit) => new Date(v.visit_date));
        const periodStart = new Date(Math.min(...visitDates.map(d => d.getTime())));
        const periodEnd = new Date(Math.max(...visitDates.map(d => d.getTime())));

        // Create payment record
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            doctor_id: group.doctor_id,
            period_start: formatInputDateIST(periodStart),
            period_end: formatInputDateIST(periodEnd),
            total_visits: totalVisitsCount,
            total_amount: totalAmount,
            remaining_amount: totalAmount,
            status: 'pending',
            insurance_approval_status: 'pending',
            payment_notes: `Insurance payment created via Lite interface for ${group.visits.length} visits`
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Link visits to payment
        const visitLinks = group.visits.map((v: Visit) => ({
          payment_id: payment.id,
          visit_id: v.id
        }));

        const { error: linkError } = await supabase
          .from('payment_visits')
          .insert(visitLinks);

        if (linkError) throw linkError;

        createdPayments.push({
          doctor: `${group.doctor_name} (${group.doctor_code})`,
          visits: group.visits.length,
          amount: totalAmount
        });
      }

      toast({
        title: "Payment Advices Created",
        description: `Successfully created ${createdPayments.length} payment advice(s) for ${uniqueDoctorCount} doctor(s)`
      });

      // Reset and switch to management view
      setSelectedVisitIds(new Set());
      setActiveTab('manage');
      
      // Optionally refresh visits
      fetchVisitsByDateRange();
    } catch (error: any) {
      console.error('Error creating payment advices:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create payment advices"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const setQuickDateRange = (days: number) => {
    const end = getCurrentISTDate();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    setStartDate(formatInputDateIST(start));
    setEndDate(formatInputDateIST(end));
  };

  // Reset search when visits change
  useEffect(() => {
    setSearchTerm('');
    setSearchField('all');
  }, [visits.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Insurance Payments (Lite)</h1>
          <p className="text-muted-foreground">Select visits by date range to create payment advices</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Create Payment Advice</TabsTrigger>
          <TabsTrigger value="manage">Manage Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Select Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
                  Last 7 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
                  Last 30 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange(90)}>
                  Last 90 Days
                </Button>
              </div>

              <Button onClick={fetchVisitsByDateRange} disabled={loading} className="w-full">
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                {loading ? 'Loading Visits...' : 'Load Visits'}
              </Button>
            </CardContent>
          </Card>

          {visits.length > 0 && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search visits..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Filter Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">Filter by:</span>
                      <Button
                        variant={searchField === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSearchField('all')}
                      >
                        All Fields
                      </Button>
                      <Button
                        variant={searchField === 'doctor_name' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSearchField('doctor_name')}
                      >
                        Doctor Name
                      </Button>
                      <Button
                        variant={searchField === 'doctor_code' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSearchField('doctor_code')}
                      >
                        Doctor Code
                      </Button>
                      <Button
                        variant={searchField === 'patient_name' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSearchField('patient_name')}
                      >
                        Patient Name
                      </Button>
                      <Button
                        variant={searchField === 'insurance_company' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSearchField('insurance_company')}
                      >
                        Insurance Company
                      </Button>
                    </div>
                    
                    {/* Search Results Count */}
                    {searchTerm && (
                      <div className="text-sm text-muted-foreground">
                        Found {filteredVisits.length} of {visits.length} visits
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Selected Visits</p>
                      <p className="text-2xl font-bold text-foreground">{selectedVisitIds.size}</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(totalSelectedAmount)}</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Doctors Involved</p>
                      <p className="text-2xl font-bold text-foreground">{uniqueDoctorCount}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={handleSelectAll} className="flex-1">
                      Select All
                    </Button>
                    <Button variant="outline" onClick={handleClearAll} className="flex-1">
                      Clear All
                    </Button>
                    <Button 
                      onClick={handleCreatePaymentAdvices} 
                      disabled={selectedVisitIds.size === 0 || submitting}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {submitting ? 'Creating...' : `Create ${uniqueDoctorCount > 0 ? `${uniqueDoctorCount} ` : ''}Payment Advice${uniqueDoctorCount > 1 ? 's' : ''}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Unprocessed Insurance Visits ({filteredVisits.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={filteredVisits.length > 0 && filteredVisits.every(v => selectedVisitIds.has(v.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleSelectAll();
                                } else {
                                  handleClearAll();
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Visit Code</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead className="text-center">Count</TableHead>
                          <TableHead>Insurance</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVisits.map(visit => (
                          <TableRow
                            key={visit.id}
                            className={cn(
                              "cursor-pointer transition-colors",
                              selectedVisitIds.has(visit.id) && "bg-primary/10"
                            )}
                            onClick={() => handleToggleVisit(visit.id)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                checked={selectedVisitIds.has(visit.id)}
                                onCheckedChange={() => handleToggleVisit(visit.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{visit.visit_code}</TableCell>
                            <TableCell>{formatDateIST(visit.visit_date)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{visit.doctors.full_name}</span>
                                <span className="text-sm text-muted-foreground">{visit.doctors.doctor_code}</span>
                              </div>
                            </TableCell>
                            <TableCell>{visit.patient_name}</TableCell>
                            <TableCell className="text-center">{visit.patient_count}</TableCell>
                            <TableCell>
                              {visit.insurance_companies ? (
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{visit.insurance_companies.company_name}</span>
                                  {visit.insurance_companies.company_code && (
                                    <span className="text-xs text-muted-foreground">{visit.insurance_companies.company_code}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {visit.visit_reason.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(visit.visit_payment)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="manage">
          <PaymentManagement paymentTypeOnly="insurance" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InsurancePaymentLite;
