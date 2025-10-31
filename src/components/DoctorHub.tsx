import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, CheckCircle2, Clock, Receipt, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDateIST } from '@/lib/dateUtils';
import { getFinancialYearStart } from '@/lib/tdsUtils';
import { useToast } from '@/hooks/use-toast';

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

type SortField = 'doctor_code' | 'full_name' | 'paid_amount' | 'unpaid_amount' | 'total_amount';
type SortDirection = 'asc' | 'desc';

const DoctorHub: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<'paid' | 'unpaid' | 'total' | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [unpaidVisits, setUnpaidVisits] = useState<UnpaidVisit[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('doctor_code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { toast } = useToast();

  const currentFYStart = getFinancialYearStart(new Date());

  useEffect(() => {
    fetchDoctorSummaries();
  }, []);

  const fetchDoctorSummaries = async () => {
    try {
      setLoading(true);

      // Fetch all active doctors
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select('id, doctor_code, full_name')
        .eq('is_active', true)
        .order('doctor_code');

      if (doctorsError) throw doctorsError;

      // For each doctor, calculate paid and unpaid amounts
      const summaries: DoctorSummary[] = await Promise.all(
        (doctorsData || []).map(async (doctor) => {
          // Paid: bank_advice_generated = true in current FY
          const { data: paidPayments } = await supabase
            .from('payments')
            .select('net_amount')
            .eq('doctor_id', doctor.id)
            .eq('bank_advice_generated', true)
            .gte('period_end', currentFYStart.toISOString().split('T')[0]);

          const paid_amount = (paidPayments || []).reduce((sum, p) => sum + Number(p.net_amount || 0), 0);
          const paid_count = paidPayments?.length || 0;

          // Unpaid: unprocessed visits
          const { data: unpaidVisits } = await supabase
            .from('visits')
            .select('visit_payment')
            .eq('doctor_id', doctor.id)
            .eq('is_processed', false);

          const unpaid_amount = (unpaidVisits || []).reduce((sum, v) => sum + Number(v.visit_payment || 0), 0);
          const unpaid_visits_count = unpaidVisits?.length || 0;

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

  const sortedDoctors = [...doctors].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const modifier = sortDirection === 'asc' ? 1 : -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * modifier;
    }
    return ((aValue as number) - (bValue as number)) * modifier;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1" /> : 
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const fetchPaymentHistory = async (doctorId: string) => {
    try {
      setDetailsLoading(true);

      const { data, error } = await supabase
        .from('payments')
        .select('id, period_start, period_end, gross_amount, tds_amount, net_amount, bank_advice_generated_at')
        .eq('doctor_id', doctorId)
        .eq('bank_advice_generated', true)
        .gte('period_end', currentFYStart.toISOString().split('T')[0])
        .order('bank_advice_generated_at', { ascending: false });

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

      // Get unprocessed visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('id, visit_code, visit_date, patient_name, visit_payment, payment_type, is_processed')
        .eq('doctor_id', doctorId)
        .eq('is_processed', false)
        .order('visit_date', { ascending: false });

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

  const handleDoctorClick = async (doctorId: string, tab: 'paid' | 'unpaid' | 'total') => {
    if (expandedDoctor === doctorId && expandedTab === tab) {
      // Collapse if same doctor and tab clicked
      setExpandedDoctor(null);
      setExpandedTab(null);
      return;
    }

    setExpandedDoctor(doctorId);
    setExpandedTab(tab);
    setPaymentHistory([]);
    setUnpaidVisits([]);

    if (tab === 'paid') {
      await fetchPaymentHistory(doctorId);
    } else if (tab === 'unpaid') {
      await fetchUnpaidVisits(doctorId);
    } else if (tab === 'total') {
      await Promise.all([fetchPaymentHistory(doctorId), fetchUnpaidVisits(doctorId)]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading doctor data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Doctor Hub</h1>
          <p className="text-muted-foreground">
            Track payments and visits for all doctors (Current Financial Year)
          </p>
        </div>
      </div>

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
              {sortedDoctors.map((doctor) => (
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
                            {/* Paid History */}
                            {(expandedTab === 'paid' || expandedTab === 'total') && (
                              <div className="space-y-3">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  Payment History (Bank Advice Generated)
                                </h3>
                                {paymentHistory.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-4">No payment history found</p>
                                ) : (
                                  <div className="rounded-md border bg-card">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Period</TableHead>
                                          <TableHead>Gross Amount</TableHead>
                                          <TableHead>TDS</TableHead>
                                          <TableHead>Net Amount</TableHead>
                                          <TableHead>Generated On</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {paymentHistory.map((payment) => (
                                          <TableRow key={payment.id}>
                                            <TableCell className="font-medium">
                                              {formatDateIST(payment.period_start)} - {formatDateIST(payment.period_end)}
                                            </TableCell>
                                            <TableCell>{formatCurrency(payment.gross_amount)}</TableCell>
                                            <TableCell>{formatCurrency(payment.tds_amount)}</TableCell>
                                            <TableCell className="font-semibold text-green-600">
                                              {formatCurrency(payment.net_amount)}
                                            </TableCell>
                                            <TableCell>{formatDateIST(payment.bank_advice_generated_at)}</TableCell>
                                          </TableRow>
                                        ))}
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorHub;
