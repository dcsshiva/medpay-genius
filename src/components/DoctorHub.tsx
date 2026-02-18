import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, CheckCircle2, Clock, Receipt, ArrowUpDown, ArrowUp, ArrowDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/currency';
import { formatDateIST } from '@/lib/dateUtils';
import { getFinancialYearStart } from '@/lib/tdsUtils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import DoctorHistoryExport from './DoctorHistoryExport';
import DoctorHubMobile from './DoctorHubMobile';

interface DoctorSummary {
  id: string;
  doctor_code: string;
  full_name: string;
  paid_amount: number;
  unpaid_amount: number;
  total_amount: number;
  paid_count: number;
  unpaid_visits_count: number;
}

interface PaymentHistory {
  id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  tds_amount: number;
  net_amount: number;
  bank_advice_generated_at: string;
}

interface UnpaidVisit {
  id: string;
  visit_code: string;
  visit_date: string;
  patient_name: string;
  visit_payment: number;
  payment_type: string;
  is_processed: boolean;
  payment_status?: string;
}

interface PaymentVisitDetail {
  id: string;
  visit_code: string;
  visit_date: string;
  patient_name: string;
  payment_type: string;
  visit_payment: number;
  status: string;
}

type SortField = 'doctor_code' | 'full_name' | 'paid_amount' | 'unpaid_amount' | 'total_amount';
type SortDirection = 'asc' | 'desc';

interface DoctorHubProps {
  filterDoctorId?: string;
}

const DoctorHub: React.FC<DoctorHubProps> = ({ filterDoctorId }) => {
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<'paid' | 'unpaid' | 'total' | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [unpaidVisits, setUnpaidVisits] = useState<UnpaidVisit[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('total_amount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaymentIds, setExpandedPaymentIds] = useState<Set<string>>(new Set());
  const [paymentVisitsData, setPaymentVisitsData] = useState<Map<string, PaymentVisitDetail[]>>(new Map());
  const [paymentVisitsLoading, setPaymentVisitsLoading] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'custom'>('all');
  const [customDateRange, setCustomDateRange] = useState<{start: string, end: string}>({
    start: '',
    end: ''
  });
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchDoctorSummaries();
  }, []);

  // Auto-load data for mobile doctor view
  useEffect(() => {
    if (isMobile === true && filterDoctorId && doctors.length > 0 && !expandedDoctor) {
      handleDoctorClick(doctors[0].id, 'total');
    }
  }, [isMobile, filterDoctorId, doctors, expandedDoctor]);

  const fetchDoctorSummaries = async () => {
    try {
      setLoading(true);

      // Build query with optional doctor filter
      let query = supabase
        .from('doctors')
        .select('id, doctor_code, full_name');

      // If filterDoctorId is provided, fetch that specific doctor regardless of active status
      if (filterDoctorId) {
        query = query.eq('id', filterDoctorId);
      } else {
        query = query.eq('is_active', true);
      }

      const { data: doctorsData, error: doctorsError } = await query.order('doctor_code');

      if (doctorsError) throw doctorsError;

      // For each doctor, calculate paid and unpaid amounts
      const summaries: DoctorSummary[] = await Promise.all(
        (doctorsData || []).map(async (doctor) => {
          // Paid: bank_advice_generated = true (all time)
          const { data: paidPayments } = await supabase
            .from('payments')
            .select('net_amount')
            .eq('doctor_id', doctor.id)
            .eq('bank_advice_generated', true);

          const paid_amount = (paidPayments || []).reduce((sum, p) => sum + Number(p.net_amount || 0), 0);
          const paid_count = paidPayments?.length || 0;

          // Unpaid: unprocessed visits + visits in payments where bank_advice_generated=false
          const { data: unprocessedVisits } = await supabase
            .from('visits')
            .select('id, visit_payment')
            .eq('doctor_id', doctor.id)
            .eq('is_processed', false);

          // Also get visits linked to payments that haven't had bank advice generated
          const { data: pendingPaymentVisits } = await supabase
            .from('payment_visits')
            .select(`
              visit_id,
              visits!inner (id, visit_payment),
              payments!inner (id, bank_advice_generated, doctor_id)
            `)
            .eq('payments.bank_advice_generated', false)
            .eq('payments.doctor_id', doctor.id);

          // Filter to only this doctor's pending payment visits and deduplicate
          const unprocessedIds = new Set((unprocessedVisits || []).map(v => v.id));
          const pendingVisitsForDoctor = (pendingPaymentVisits || []).filter((pv: any) => {
            return pv.visits && !unprocessedIds.has(pv.visits.id);
          });

          const unprocessedAmount = (unprocessedVisits || []).reduce((sum, v) => sum + Number(v.visit_payment || 0), 0);
          const pendingPaymentAmount = pendingVisitsForDoctor.reduce((sum: number, pv: any) => sum + Number(pv.visits?.visit_payment || 0), 0);
          const unpaid_amount = unprocessedAmount + pendingPaymentAmount;
          const unpaid_visits_count = (unprocessedVisits?.length || 0) + pendingVisitsForDoctor.length;

          return {
            id: doctor.id,
            doctor_code: doctor.doctor_code,
            full_name: doctor.full_name || 'Doctor',
            paid_amount,
            unpaid_amount,
            total_amount: paid_amount + unpaid_amount,
            paid_count,
            unpaid_visits_count,
          };
        })
      );

      setDoctors(summaries);
    } catch (error: any) {
      console.error('Error fetching doctor summaries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load doctor summaries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedDoctors = (() => {
    // Separate doctors into two groups
    const nonZeroDoctors = doctors.filter(d => d.total_amount !== 0);
    const zeroDoctors = doctors.filter(d => d.total_amount === 0);
    
    // Sort function
    const sortFn = (a: DoctorSummary, b: DoctorSummary) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const modifier = sortDirection === 'asc' ? 1 : -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * modifier;
      }
      return ((aValue as number) - (bValue as number)) * modifier;
    };
    
    // Sort both groups
    const sortedNonZero = [...nonZeroDoctors].sort(sortFn);
    const sortedZero = [...zeroDoctors].sort(sortFn);
    
    // Combine: non-zero first, then zero at the bottom
    return [...sortedNonZero, ...sortedZero];
  })();

  // Filter doctors by name with Dr. prefix handling
  const filteredAndSortedDoctors = sortedDoctors.filter(doctor => {
    if (!searchTerm.trim()) return true;
    
    let searchableName = doctor.full_name.toLowerCase();
    let searchQuery = searchTerm.toLowerCase().trim();
    
    // If the name starts with "dr." or "dr ", search from the 3rd character onwards
    if (searchableName.startsWith('dr.') || searchableName.startsWith('dr ')) {
      searchableName = searchableName.substring(3).trim();
    }
    
    // If search term starts with "dr." or "dr ", also strip it from search query
    if (searchQuery.startsWith('dr.') || searchQuery.startsWith('dr ')) {
      searchQuery = searchQuery.substring(3).trim();
    }
    
    return searchableName.includes(searchQuery);
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1" /> : 
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const fetchPaymentVisitDetails = async (paymentId: string) => {
    if (paymentVisitsData.has(paymentId)) {
      return paymentVisitsData.get(paymentId);
    }

    try {
      setPaymentVisitsLoading(prev => new Set(prev).add(paymentId));

      const { data, error } = await supabase
        .from('payment_visits')
        .select(`
          visit_id,
          visits (
            id,
            visit_code,
            visit_date,
            patient_name,
            payment_type,
            visit_payment,
            is_processed
          )
        `)
        .eq('payment_id', paymentId);

      if (error) throw error;

      const visitDetails: PaymentVisitDetail[] = (data || []).map((pv: any) => ({
        id: pv.visits.id,
        visit_code: pv.visits.visit_code,
        visit_date: pv.visits.visit_date,
        patient_name: pv.visits.patient_name,
        payment_type: pv.visits.payment_type,
        visit_payment: pv.visits.visit_payment,
        status: pv.visits.is_processed ? 'Processed' : 'Pending'
      }));

      setPaymentVisitsData(prev => new Map(prev).set(paymentId, visitDetails));
      return visitDetails;
    } catch (error) {
      console.error('Error fetching payment visit details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load visit details',
        variant: 'destructive',
      });
      return [];
    } finally {
      setPaymentVisitsLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(paymentId);
        return newSet;
      });
    }
  };

  const fetchPaymentHistory = async (doctorId: string) => {
    try {
      setDetailsLoading(true);

      let query = supabase
        .from('payments')
        .select('id, period_start, period_end, gross_amount, tds_amount, net_amount, bank_advice_generated_at')
        .eq('doctor_id', doctorId)
        .eq('bank_advice_generated', true);

      if (selectedPeriod === 'custom' && customDateRange.start && customDateRange.end) {
        query = query
          .gte('period_start', customDateRange.start)
          .lte('period_end', customDateRange.end);
      }

      const { data, error } = await query.order('bank_advice_generated_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching payment history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment history',
        variant: 'destructive',
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchUnpaidVisits = async (doctorId: string) => {
    try {
      setDetailsLoading(true);

      let query = supabase
        .from('visits')
        .select('id, visit_code, visit_date, patient_name, visit_payment, payment_type, is_processed')
        .eq('doctor_id', doctorId)
        .eq('is_processed', false);

      if (selectedPeriod === 'custom' && customDateRange.start && customDateRange.end) {
        query = query
          .gte('visit_date', customDateRange.start)
          .lte('visit_date', customDateRange.end);
      }

      const { data: visitsData, error: visitsError } = await query.order('visit_date', { ascending: false });

      if (visitsError) throw visitsError;

      // Get pending payments (not fully paid, not rejected)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          period_start,
          period_end,
          status,
          is_fully_paid,
          bank_advice_generated,
          payment_visits (
            visit_id,
            visits (
              id,
              visit_code,
              visit_date,
              patient_name,
              visit_payment,
              payment_type
            )
          )
        `)
        .eq('doctor_id', doctorId)
        .eq('is_fully_paid', false)
        .neq('status', 'rejected')
        .eq('bank_advice_generated', false);

      if (paymentsError) throw paymentsError;

      // Combine unprocessed visits with visits in pending payments
      const unprocessedVisitIds = new Set((visitsData || []).map(v => v.id));
      
      // Extract visits from pending payments that aren't already in the unprocessed list
      const pendingPaymentVisitsList: UnpaidVisit[] = [];
      (paymentsData || []).forEach((payment: any) => {
        const statusLabel = payment.status === 'pending' ? 'Pending Approval' 
          : payment.status === 'manager_approved' ? 'Manager Approved'
          : payment.status === 'admin_approved' ? 'Admin Approved'
          : 'In Payment';
        
        (payment.payment_visits || []).forEach((pv: any) => {
          if (pv.visits && !unprocessedVisitIds.has(pv.visits.id)) {
            pendingPaymentVisitsList.push({
              id: pv.visits.id,
              visit_code: pv.visits.visit_code,
              visit_date: pv.visits.visit_date,
              patient_name: pv.visits.patient_name,
              visit_payment: pv.visits.visit_payment,
              payment_type: pv.visits.payment_type,
              is_processed: true,
              payment_status: statusLabel,
            });
          }
        });
      });

      const allUnpaidVisits: UnpaidVisit[] = [
        ...(visitsData || []).map((v) => ({
          id: v.id,
          visit_code: v.visit_code,
          visit_date: v.visit_date,
          patient_name: v.patient_name,
          visit_payment: v.visit_payment,
          payment_type: v.payment_type,
          is_processed: v.is_processed,
          payment_status: 'unprocessed',
        })),
        ...pendingPaymentVisitsList,
      ];

      setUnpaidVisits(allUnpaidVisits);
    } catch (error: any) {
      console.error('Error fetching unpaid visits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load unpaid visits',
        variant: 'destructive',
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handlePaymentRowExpand = async (paymentId: string) => {
    const newExpandedIds = new Set(expandedPaymentIds);
    
    if (newExpandedIds.has(paymentId)) {
      newExpandedIds.delete(paymentId);
    } else {
      newExpandedIds.add(paymentId);
      await fetchPaymentVisitDetails(paymentId);
    }
    
    setExpandedPaymentIds(newExpandedIds);
  };

  const handleDoctorClick = async (doctorId: string, tab: 'paid' | 'unpaid' | 'total') => {
    if (expandedDoctor === doctorId && expandedTab === tab) {
      setExpandedDoctor(null);
      setExpandedTab(null);
      return;
    }

    setExpandedDoctor(doctorId);
    setExpandedTab(tab);
    setPaymentHistory([]);
    setUnpaidVisits([]);
    setExpandedPaymentIds(new Set());
    setPaymentVisitsData(new Map());

    if (tab === 'paid') {
      await fetchPaymentHistory(doctorId);
    } else if (tab === 'unpaid') {
      await fetchUnpaidVisits(doctorId);
    } else if (tab === 'total') {
      await Promise.all([fetchPaymentHistory(doctorId), fetchUnpaidVisits(doctorId)]);
    }
  };

  // Handle initial isMobile undefined state
  if (isMobile === undefined || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading doctor data...</p>
        </div>
      </div>
    );
  }

  // Show mobile view for doctors viewing their own dashboard
  if (isMobile === true && filterDoctorId && doctors.length > 0) {

    const handleMobileTabChange = (tab: 'paid' | 'unpaid' | 'all') => {
      if (tab === 'paid') {
        handleDoctorClick(doctors[0].id, 'paid');
      } else if (tab === 'unpaid') {
        handleDoctorClick(doctors[0].id, 'unpaid');
      } else {
        handleDoctorClick(doctors[0].id, 'total');
      }
    };

    const handlePeriodChange = (period: 'all' | 'custom') => {
      setSelectedPeriod(period);
      // Re-fetch data with new period
      if (expandedTab === 'paid') {
        fetchPaymentHistory(doctors[0].id);
      } else if (expandedTab === 'unpaid') {
        fetchUnpaidVisits(doctors[0].id);
      } else if (expandedTab === 'total') {
        Promise.all([fetchPaymentHistory(doctors[0].id), fetchUnpaidVisits(doctors[0].id)]);
      }
    };

    const handleCustomDateChange = (start: string, end: string) => {
      setCustomDateRange({ start, end });
    };

    return (
      <DoctorHubMobile
        doctor={doctors[0]}
        paymentHistory={paymentHistory}
        unpaidVisits={unpaidVisits}
        detailsLoading={detailsLoading}
        expandedPaymentIds={expandedPaymentIds}
        paymentVisitsData={paymentVisitsData}
        paymentVisitsLoading={paymentVisitsLoading}
        onTabChange={handleMobileTabChange}
        onPaymentRowExpand={handlePaymentRowExpand}
        onPeriodChange={handlePeriodChange}
        onCustomDateChange={handleCustomDateChange}
        selectedPeriod={selectedPeriod}
        customDateRange={customDateRange}
        fetchVisitDetails={fetchPaymentVisitDetails}
      />
    );
  }

  // Mobile view for admin/manager viewing all doctors
  if (isMobile && !filterDoctorId) {
    return (
      <div className="space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-bold">Doctor Hub</h1>
          <p className="text-sm text-muted-foreground">Track payments and visits for all doctors (All Time)</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by doctor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {filteredAndSortedDoctors.length < doctors.length && (
          <p className="text-xs text-muted-foreground">
            Showing {filteredAndSortedDoctors.length} of {doctors.length} doctors
          </p>
        )}

        {/* Doctor Cards */}
        <div className="space-y-3">
          {filteredAndSortedDoctors.map((doctor) => (
            <Card key={doctor.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Doctor Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{doctor.doctor_code}</Badge>
                    <span className="font-semibold text-sm">{doctor.full_name}</span>
                  </div>
                </div>

                {/* Amount Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground">Paid</div>
                    <div className="font-bold text-green-600 text-sm">{formatCurrency(doctor.paid_amount)}</div>
                    <div className="text-xs text-muted-foreground">{doctor.paid_count} payments</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground">Unpaid</div>
                    <div className="font-bold text-orange-600 text-sm">{formatCurrency(doctor.unpaid_amount)}</div>
                    <div className="text-xs text-muted-foreground">{doctor.unpaid_visits_count} visits</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="font-bold text-blue-600 text-sm">{formatCurrency(doctor.total_amount)}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={expandedDoctor === doctor.id && expandedTab === 'paid' ? 'default' : 'outline'}
                    onClick={() => handleDoctorClick(doctor.id, 'paid')}
                    className="flex-1 h-8 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Paid
                  </Button>
                  <Button
                    size="sm"
                    variant={expandedDoctor === doctor.id && expandedTab === 'unpaid' ? 'default' : 'outline'}
                    onClick={() => handleDoctorClick(doctor.id, 'unpaid')}
                    className="flex-1 h-8 text-xs"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Unpaid
                  </Button>
                  <Button
                    size="sm"
                    variant={expandedDoctor === doctor.id && expandedTab === 'total' ? 'default' : 'outline'}
                    onClick={() => handleDoctorClick(doctor.id, 'total')}
                    className="flex-1 h-8 text-xs"
                  >
                    <Receipt className="h-3 w-3 mr-1" />
                    All
                  </Button>
                </div>

                {/* Expanded Details */}
                {expandedDoctor === doctor.id && (
                  <div className="pt-3 border-t space-y-3">
                    {detailsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-xs text-muted-foreground">Loading...</p>
                      </div>
                    ) : (
                      <>
                        {/* Paid History */}
                        {(expandedTab === 'paid' || expandedTab === 'total') && paymentHistory.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-green-600 mb-2">Payment History</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {paymentHistory.map((payment) => (
                                <div key={payment.id} className="bg-muted/50 rounded p-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      {formatDateIST(payment.period_start)} - {formatDateIST(payment.period_end)}
                                    </span>
                                    <span className="font-semibold text-green-600">{formatCurrency(payment.net_amount)}</span>
                                  </div>
                                  <div className="flex justify-between text-muted-foreground mt-1">
                                    <span>Gross: {formatCurrency(payment.gross_amount)}</span>
                                    <span>TDS: {formatCurrency(payment.tds_amount)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Unpaid Visits */}
                        {(expandedTab === 'unpaid' || expandedTab === 'total') && unpaidVisits.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-orange-600 mb-2">Unpaid Visits</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {unpaidVisits.map((visit) => (
                                <div key={visit.id} className="bg-muted/50 rounded p-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{visit.visit_code}</span>
                                    <span className="font-semibold text-orange-600">{formatCurrency(visit.visit_payment)}</span>
                                  </div>
                                  <div className="flex justify-between text-muted-foreground mt-1">
                                    <span>{visit.patient_name}</span>
                                    <span>{formatDateIST(visit.visit_date)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Empty states */}
                        {expandedTab === 'paid' && paymentHistory.length === 0 && (
                          <p className="text-xs text-center text-muted-foreground py-2">No payment history</p>
                        )}
                        {expandedTab === 'unpaid' && unpaidVisits.length === 0 && (
                          <p className="text-xs text-center text-muted-foreground py-2">No unpaid visits</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {filterDoctorId ? 'My Payment Summary' : 'Doctor Hub'}
          </h1>
          <p className="text-muted-foreground">
            {filterDoctorId 
              ? 'Your payment and visit information (All Time)'
              : 'Track payments and visits for all doctors (All Time)'
            }
          </p>
        </div>
      </div>

      {!filterDoctorId && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by doctor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {!filterDoctorId && filteredAndSortedDoctors.length < doctors.length && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedDoctors.length} of {doctors.length} doctors
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="flex items-center hover:bg-transparent"
                    onClick={() => handleSort('doctor_code')}
                  >
                    Doctor Code
                    {getSortIcon('doctor_code')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="flex items-center hover:bg-transparent"
                    onClick={() => handleSort('full_name')}
                  >
                    Doctor Name
                    {getSortIcon('full_name')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    className="flex items-center ml-auto hover:bg-transparent"
                    onClick={() => handleSort('paid_amount')}
                  >
                    Paid
                    {getSortIcon('paid_amount')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    className="flex items-center ml-auto hover:bg-transparent"
                    onClick={() => handleSort('unpaid_amount')}
                  >
                    Unpaid
                    {getSortIcon('unpaid_amount')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    className="flex items-center ml-auto hover:bg-transparent"
                    onClick={() => handleSort('total_amount')}
                  >
                    Total
                    {getSortIcon('total_amount')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedDoctors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No doctors found matching "{searchTerm}"
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedDoctors.map((doctor) => (
                <React.Fragment key={doctor.id}>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Badge variant="outline">{doctor.doctor_code}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{doctor.full_name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-green-600">
                          {formatCurrency(doctor.paid_amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {doctor.paid_count} payments
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(doctor.unpaid_amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {doctor.unpaid_visits_count} visits
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-blue-600">
                        {formatCurrency(doctor.total_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant={expandedDoctor === doctor.id && expandedTab === 'paid' ? 'default' : 'outline'}
                          onClick={() => handleDoctorClick(doctor.id, 'paid')}
                          className="h-8"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Paid
                        </Button>
                        <Button
                          size="sm"
                          variant={expandedDoctor === doctor.id && expandedTab === 'unpaid' ? 'default' : 'outline'}
                          onClick={() => handleDoctorClick(doctor.id, 'unpaid')}
                          className="h-8"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Unpaid
                        </Button>
                        <Button
                          size="sm"
                          variant={expandedDoctor === doctor.id && expandedTab === 'total' ? 'default' : 'outline'}
                          onClick={() => handleDoctorClick(doctor.id, 'total')}
                          className="h-8"
                        >
                          <Receipt className="h-3 w-3 mr-1" />
                          Total
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details Row */}
                  {expandedDoctor === doctor.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-6">
                        {detailsLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-sm text-muted-foreground">Loading details...</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Period Filter */}
                            {(expandedTab === 'paid' || expandedTab === 'total') && (
                              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end p-4 bg-muted/50 rounded-lg border">
                                <div className="flex-1 space-y-2">
                                  <label className="text-sm font-medium">Filter Period</label>
                                  <Select value={selectedPeriod} onValueChange={(value: 'all' | 'custom') => {
                                    setSelectedPeriod(value);
                                    if (value === 'all') {
                                      setCustomDateRange({ start: '', end: '' });
                                    }
                                  }}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                      <SelectValue placeholder="Select period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Time</SelectItem>
                                      <SelectItem value="custom">Custom Date Range</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {selectedPeriod === 'custom' && (
                                  <>
                                    <div className="flex-1 space-y-2">
                                      <label className="text-sm font-medium">From Date</label>
                                      <Input
                                        type="date"
                                        value={customDateRange.start}
                                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="w-full"
                                      />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      <label className="text-sm font-medium">To Date</label>
                                      <Input
                                        type="date"
                                        value={customDateRange.end}
                                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="w-full"
                                      />
                                    </div>
                                  </>
                                )}

                                <Button 
                                  onClick={() => {
                                    if (expandedDoctor) {
                                      fetchPaymentHistory(expandedDoctor);
                                      if (expandedTab === 'total') {
                                        fetchUnpaidVisits(expandedDoctor);
                                      }
                                    }
                                  }}
                                  variant="default"
                                  className="whitespace-nowrap"
                                >
                                  <Search className="h-4 w-4 mr-2" />
                                  Apply Filter
                                </Button>
                              </div>
                            )}

                            {/* Paid History */}
                            {(expandedTab === 'paid' || expandedTab === 'total') && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    Payment History (Bank Advice Generated)
                                  </h3>
                  <DoctorHistoryExport
                    doctorName={filteredAndSortedDoctors.find(d => d.id === expandedDoctor)?.full_name || ''}
                    doctorCode={filteredAndSortedDoctors.find(d => d.id === expandedDoctor)?.doctor_code || ''}
                    paymentHistory={paymentHistory}
                    unpaidVisits={unpaidVisits}
                    paymentVisitsData={paymentVisitsData}
                    periodFilter={selectedPeriod}
                    customDateRange={customDateRange}
                    fetchVisitDetails={fetchPaymentVisitDetails}
                  />
                                </div>
                                {paymentHistory.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-4">No payment history found</p>
                                ) : (
                                  <div className="rounded-md border bg-card">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-12"></TableHead>
                                          <TableHead>Period</TableHead>
                                          <TableHead>Gross Amount</TableHead>
                                          <TableHead>TDS</TableHead>
                                          <TableHead>Net Amount</TableHead>
                                          <TableHead>Generated On</TableHead>
                                          <TableHead>Visit Count</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {paymentHistory.map((payment) => {
                                          const isExpanded = expandedPaymentIds.has(payment.id);
                                          const visitDetails = paymentVisitsData.get(payment.id) || [];
                                          const isLoadingVisits = paymentVisitsLoading.has(payment.id);
                                          
                                          return (
                                            <React.Fragment key={payment.id}>
                                              <TableRow className="hover:bg-muted/30">
                                                <TableCell onClick={() => handlePaymentRowExpand(payment.id)} className="cursor-pointer">
                                                  {isExpanded ? 
                                                    <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                  }
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                  {formatDateIST(payment.period_start)} - {formatDateIST(payment.period_end)}
                                                </TableCell>
                                                <TableCell>{formatCurrency(payment.gross_amount)}</TableCell>
                                                <TableCell>{formatCurrency(payment.tds_amount)}</TableCell>
                                                <TableCell className="font-semibold text-green-600">
                                                  {formatCurrency(payment.net_amount)}
                                                </TableCell>
                                                <TableCell>{formatDateIST(payment.bank_advice_generated_at)}</TableCell>
                                                <TableCell>
                                                  <Badge variant="secondary">{visitDetails.length || '...'} visits</Badge>
                                                </TableCell>
                                              </TableRow>
                                              
                                              {isExpanded && (
                                                <TableRow>
                                                  <TableCell colSpan={7} className="bg-muted/10 p-0">
                                                    {isLoadingVisits ? (
                                                      <div className="py-6 text-center">
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
                                                        <p className="text-xs text-muted-foreground mt-2">Loading visit details...</p>
                                                      </div>
                                                    ) : visitDetails.length === 0 ? (
                                                      <p className="text-sm text-muted-foreground py-4 px-6">No visit details found</p>
                                                    ) : (
                                                      <div className="px-6 py-4">
                                                        <Table>
                                                          <TableHeader>
                                                            <TableRow className="bg-muted/30">
                                                              <TableHead className="text-xs">Visit Code</TableHead>
                                                              <TableHead className="text-xs">Date</TableHead>
                                                              <TableHead className="text-xs">Patient</TableHead>
                                                              <TableHead className="text-xs">Type</TableHead>
                                                              <TableHead className="text-xs">Visit Amount</TableHead>
                                                              <TableHead className="text-xs">Status</TableHead>
                                                            </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                            {visitDetails.map((visit: PaymentVisitDetail) => (
                                                              <TableRow key={visit.id} className="text-sm">
                                                                <TableCell className="font-mono text-xs">{visit.visit_code}</TableCell>
                                                                <TableCell>{formatDateIST(visit.visit_date)}</TableCell>
                                                                <TableCell>{visit.patient_name}</TableCell>
                                                                <TableCell>
                                                                  <Badge variant="outline" className="text-xs">{visit.payment_type}</Badge>
                                                                </TableCell>
                                                                <TableCell className="font-semibold">{formatCurrency(visit.visit_payment)}</TableCell>
                                                                <TableCell>
                                                                  <Badge variant="secondary" className="text-xs">{visit.status}</Badge>
                                                                </TableCell>
                                                              </TableRow>
                                                            ))}
                                                          </TableBody>
                                                        </Table>
                                                      </div>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Unpaid Visits */}
                            {(expandedTab === 'unpaid' || expandedTab === 'total') && (
                              <div className="space-y-3">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                  <Clock className="h-5 w-5 text-orange-600" />
                                  Unpaid Visits (Unprocessed)
                                </h3>
                                {unpaidVisits.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-4">No unpaid visits found</p>
                                ) : (
                                  <div className="rounded-md border bg-card">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Visit Code</TableHead>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Patient</TableHead>
                                          <TableHead>Type</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead>Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {unpaidVisits.map((visit) => (
                                          <TableRow key={visit.id}>
                                            <TableCell className="font-medium">{visit.visit_code}</TableCell>
                                            <TableCell>{formatDateIST(visit.visit_date)}</TableCell>
                                            <TableCell>{visit.patient_name}</TableCell>
                                            <TableCell>
                                              <Badge variant="outline">{visit.payment_type}</Badge>
                                            </TableCell>
                                            <TableCell className="font-semibold text-orange-600">
                                              {formatCurrency(visit.visit_payment)}
                                            </TableCell>
                                            <TableCell>
                                              <Badge variant="secondary">{visit.payment_status}</Badge>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorHub;
