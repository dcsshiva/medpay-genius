import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { cn, debounce } from '@/lib/utils';
import { Calendar, Shield, Plus, RefreshCw, Search } from 'lucide-react';
import { formatDateIST, formatInputDateIST, getCurrentISTDate } from '@/lib/dateUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // Date range state - default to last 30 days
  const today = getCurrentISTDate();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [startDate, setStartDate] = useState(formatInputDateIST(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(formatInputDateIST(today));

  const fetchSuggestions = useCallback(
    debounce(async (field: string, term: string) => {
      if (!term || term.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const searchValue = `%${term.trim()}%`;
        let query;

        switch (field) {
          case 'doctor_name':
            query = supabase
              .from('doctors')
              .select('full_name')
              .ilike('full_name', searchValue)
              .eq('is_active', true)
              .limit(10);
            break;
          case 'doctor_code':
            query = supabase
              .from('doctors')
              .select('doctor_code')
              .ilike('doctor_code', searchValue)
              .eq('is_active', true)
              .limit(10);
            break;
          case 'patient_name':
            query = supabase
              .from('visits')
              .select('patient_name')
              .ilike('patient_name', searchValue)
              .limit(10);
            break;
          case 'insurance_company':
            query = supabase
              .from('insurance_companies')
              .select('company_name')
              .ilike('company_name', searchValue)
              .eq('is_active', true)
              .limit(10);
            break;
          default:
            return;
        }

        const { data, error } = await query;
        if (error) throw error;

        const fieldName = field === 'insurance_company' ? 'company_name' :
                          field === 'doctor_name' ? 'full_name' :
                          field === 'doctor_code' ? 'doctor_code' : 'patient_name';
        
        const uniqueSuggestions = [...new Set(
          data?.map(item => String(item[fieldName])).filter(Boolean) || []
        )] as string[];
        
        setSuggestions(uniqueSuggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300),
    []
  );

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
      let query = supabase
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
        .lte('visit_date', endDate);

      // Apply optional filter based on selected field
      if (searchField !== 'all' && searchTerm.trim()) {
        const searchValue = `%${searchTerm.trim()}%`;
        
        switch (searchField) {
          case 'doctor_name':
            query = query.ilike('doctors.full_name', searchValue);
            break;
          case 'doctor_code':
            query = query.ilike('doctors.doctor_code', searchValue);
            break;
          case 'patient_name':
            query = query.ilike('patient_name', searchValue);
            break;
          case 'insurance_company':
            query = query.ilike('insurance_companies.company_name', searchValue);
            break;
        }
      }

      query = query
        .order('doctor_id')
        .order('visit_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setVisits(data || []);
      setSelectedVisitIds(new Set());
      
      if (data && data.length === 0) {
        const filterMsg = searchField !== 'all' && searchTerm.trim() 
          ? ` matching "${searchTerm}" in ${searchField.replace('_', ' ')}`
          : '';
        toast({
          title: "No Visits Found",
          description: `No unprocessed insurance visits found${filterMsg} in the selected date range`
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
    setSelectedVisitIds(new Set(visits.map(v => v.id)));
  };

  const handleClearAll = () => {
    setSelectedVisitIds(new Set());
  };

  const selectedVisits = Array.from(selectedVisitIds)
    .map(id => visits.find(v => v.id === id))
    .filter((v): v is Visit => v !== undefined);
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

              {/* Optional Filter Section */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium">Filter by (Optional)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={searchField === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSearchField('all');
                      setSearchTerm('');
                    }}
                  >
                    All Visits
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
                
                {/* Show search input only when a specific field is selected */}
                {searchField !== 'all' && (
                  <Popover open={showSuggestions && suggestions.length > 0} onOpenChange={setShowSuggestions}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                        <Input
                          type="text"
                          placeholder={`Enter ${searchField.replace('_', ' ')}...`}
                          value={searchTerm}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSearchTerm(value);
                            
                            if (value.length >= 2) {
                              fetchSuggestions(searchField, value);
                            } else {
                              setSuggestions([]);
                              setShowSuggestions(false);
                            }
                          }}
                          onFocus={() => {
                            if (searchTerm.length >= 2 && suggestions.length > 0) {
                              setShowSuggestions(true);
                            }
                          }}
                          className="pl-10"
                        />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-[--radix-popover-trigger-width] p-0" 
                      align="start"
                      side="bottom"
                    >
                      <Command>
                        <CommandList>
                          {loadingSuggestions ? (
                            <CommandEmpty>Loading suggestions...</CommandEmpty>
                          ) : suggestions.length === 0 ? (
                            <CommandEmpty>No suggestions found</CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {suggestions.map((suggestion, index) => (
                                <CommandItem
                                  key={index}
                                  value={suggestion}
                                  onSelect={() => {
                                    setSearchTerm(suggestion);
                                    setShowSuggestions(false);
                                    setSuggestions([]);
                                  }}
                                >
                                  {suggestion}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
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
                  <CardTitle>Unprocessed Insurance Visits ({visits.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={selectedVisitIds.size === visits.length && visits.length > 0}
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
                        {visits.map(visit => (
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
