import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { formatDateIST } from '@/lib/dateUtils';
import { Eye, Send, AlertCircle } from 'lucide-react';
import { GroupedPendingPayment, PaymentDetail } from './types';

interface Props {
  payment: GroupedPendingPayment;
  onSendToManager: (paymentIds: string[]) => void;
  onGenerateAdvice: (paymentIds: string[]) => void;
}

export const PaymentDetailsExpansion: React.FC<Props> = ({
  payment,
  onSendToManager,
  onGenerateAdvice,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);
  const [selectedVisitIds, setSelectedVisitIds] = useState<string[]>([]);

  useEffect(() => {
    fetchPaymentDetails();
  }, [payment.payment_ids]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    try {
      if (payment.beneficiary_type === 'doctor') {
        // Fetch payment records with visits
        const { data: payments, error } = await supabase
          .from('payments')
          .select(`
            id,
            period_start,
            period_end,
            total_visits,
            total_amount,
            gross_amount,
            cash_approval_status,
            insurance_approval_status
          `)
          .in('id', payment.payment_ids);

        if (error) throw error;

        // Fetch visits for each payment
        const paymentsWithVisits = await Promise.all(
          (payments || []).map(async (p: any) => {
            const { data: visitData } = await supabase
              .from('payment_visits')
              .select(`
                visit_id,
                visits (
                  id,
                  visit_code,
                  visit_date,
                  patient_name,
                  visit_payment,
                  payment_type
                )
              `)
              .eq('payment_id', p.id);

            const visits = (visitData || [])
              .map((pv: any) => pv.visits)
              .filter(Boolean);

            // Select all visits by default
            visits.forEach((v: any) => {
              if (!selectedVisitIds.includes(v.id)) {
                setSelectedVisitIds(prev => [...prev, v.id]);
              }
            });

            return {
              ...p,
              visits,
            };
          })
        );

        setPaymentDetails(paymentsWithVisits);
      } else {
        // For quick payments, show details
        setPaymentDetails([]);
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisit = (visitId: string) => {
    setSelectedVisitIds(prev =>
      prev.includes(visitId)
        ? prev.filter(id => id !== visitId)
        : [...prev, visitId]
    );
  };

  const handleSelectAllVisits = () => {
    const allVisitIds = paymentDetails.flatMap(p => p.visits.map((v: any) => v.id));
    if (selectedVisitIds.length === allVisitIds.length) {
      setSelectedVisitIds([]);
    } else {
      setSelectedVisitIds(allVisitIds);
    }
  };

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-muted rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-muted/30 space-y-4">
      {payment.beneficiary_type === 'doctor' ? (
        <>
          {paymentDetails.map((detail, idx) => (
            <Card key={detail.id} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      Payment Period: {formatDateIST(detail.period_start)} to {formatDateIST(detail.period_end)}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {detail.cash_approval_status === 'approved' && (
                        <Badge variant="default">Cash: {formatCurrency(detail.total_amount)}</Badge>
                      )}
                      {detail.insurance_approval_status === 'approved' && (
                        <Badge variant="secondary">Insurance: {formatCurrency(detail.gross_amount)}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllVisits}
                  >
                    {selectedVisitIds.length === paymentDetails.flatMap(p => p.visits).length
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Individual Visits:</p>
                  {detail.visits.map((visit: any) => (
                    <div
                      key={visit.id}
                      className="flex items-center gap-3 p-2 bg-background rounded border"
                    >
                      <Checkbox
                        checked={selectedVisitIds.includes(visit.id)}
                        onCheckedChange={() => handleToggleVisit(visit.id)}
                      />
                      <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                        <span className="font-mono">{visit.visit_code}</span>
                        <span>{formatDateIST(visit.visit_date)}</span>
                        <span>{visit.patient_name}</span>
                        <span className="font-medium">{formatCurrency(visit.visit_payment)}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {visit.payment_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendToManager(payment.payment_ids)}
            >
              <Send className="h-4 w-4 mr-2" />
              Send to Manager for Review
            </Button>
            <Button
              size="sm"
              onClick={() => onGenerateAdvice(payment.payment_ids)}
              disabled={selectedVisitIds.length === 0}
            >
              Generate Bank Advice
            </Button>
          </div>
        </>
      ) : (
        // Quick Payment Details
        <Card className="p-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Payment Type</p>
                <p className="font-medium">{payment.payment_records[0]?.payment_type_name || 'N/A'}</p>
              </div>
              {payment.payment_records[0]?.vendor_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{payment.payment_records[0].vendor_name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Gross Amount</p>
                <p className="font-medium">{formatCurrency(payment.total_cumulative_amount)}</p>
              </div>
            </div>
            {payment.payment_records[0]?.supporting_document_path && (
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Document
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
