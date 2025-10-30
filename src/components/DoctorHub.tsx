import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, CheckCircle2, Clock, Receipt } from 'lucide-react';
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

const DoctorHub: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<'paid' | 'unpaid' | 'total' | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [unpaidVisits, setUnpaidVisits] = useState<UnpaidVisit[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
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

      <div className="grid gap-4">
        {doctors.map((doctor) => (
          <Card key={doctor.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {doctor.full_name}
                    <Badge variant="outline" className="ml-2">
                      {doctor.doctor_code}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {doctor.paid_count} payments processed • {doctor.unpaid_visits_count} pending visits
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Paid */}
                <Button
                  variant={expandedDoctor === doctor.id && expandedTab === 'paid' ? 'default' : 'outline'}
                  className="h-auto py-4 flex flex-col items-start gap-1 w-full"
                  onClick={() => handleDoctorClick(doctor.id, 'paid')}
                >
                  <div className="flex items-center gap-2 w-full justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Paid</span>
                    </div>
                    {expandedDoctor === doctor.id && expandedTab === 'paid' ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(doctor.paid_amount)}</div>
                  <div className="text-xs text-muted-foreground">{doctor.paid_count} payments</div>
                </Button>

                {/* Unpaid */}
                <Button
                  variant={expandedDoctor === doctor.id && expandedTab === 'unpaid' ? 'default' : 'outline'}
                  className="h-auto py-4 flex flex-col items-start gap-1 w-full"
                  onClick={() => handleDoctorClick(doctor.id, 'unpaid')}
                >
                  <div className="flex items-center gap-2 w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <span className="font-semibold">Unpaid</span>
                    </div>
                    {expandedDoctor === doctor.id && expandedTab === 'unpaid' ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(doctor.unpaid_amount)}</div>
                  <div className="text-xs text-muted-foreground">{doctor.unpaid_visits_count} visits</div>
                </Button>

                {/* Total */}
                <Button
                  variant={expandedDoctor === doctor.id && expandedTab === 'total' ? 'default' : 'outline'}
                  className="h-auto py-4 flex flex-col items-start gap-1 w-full"
                  onClick={() => handleDoctorClick(doctor.id, 'total')}
                >
                  <div className="flex items-center gap-2 w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">Total</span>
                    </div>
                    {expandedDoctor === doctor.id && expandedTab === 'total' ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(doctor.total_amount)}</div>
                  <div className="text-xs text-muted-foreground">Combined overview</div>
                </Button>
              </div>

              {/* Expanded Content */}
              {expandedDoctor === doctor.id && (
                <div className="mt-4 pt-4 border-t">
                  {detailsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading details...</p>
                    </div>
                  ) : (
                    <>
                      {/* Paid History */}
                      {(expandedTab === 'paid' || expandedTab === 'total') && (
                        <div className="space-y-2">
                          <h3 className="font-semibold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Payment History (Bank Advice Generated)
                          </h3>
                          {paymentHistory.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4">No payment history found</p>
                          ) : (
                            <div className="rounded-md border">
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
                                      <TableCell className="font-semibold">
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
                        <div className="space-y-2 mt-6">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            Unpaid Visits (Unprocessed)
                          </h3>
                          {unpaidVisits.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4">No unpaid visits found</p>
                          ) : (
                            <div className="rounded-md border">
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
                                      <TableCell>{formatCurrency(visit.visit_payment)}</TableCell>
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
};

export default DoctorHub;
