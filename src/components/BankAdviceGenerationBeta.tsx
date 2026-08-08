import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { GroupedPendingPayment } from './bank-advice-beta/types';
import { BetaPendingPaymentsTab } from './bank-advice-beta/BetaPendingPaymentsTab';
import { BetaGeneratedAdviceTab } from './bank-advice-beta/BetaGeneratedAdviceTab';
import { PaymentModeDialog, PaymentMode, ChequeDetails } from './PaymentModeDialog';
import { Building2, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { notifyDoctorBankAdvice } from '@/lib/doctorNotifications';

const BankAdviceGenerationBeta = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const { data: websiteSettings } = useWebsiteSettings();
  const [loading, setLoading] = useState(true);
  const [groupedPayments, setGroupedPayments] = useState<GroupedPendingPayment[]>([]);
  const [paymentModeDialogOpen, setPaymentModeDialogOpen] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [selectedPaymentsData, setSelectedPaymentsData] = useState<GroupedPendingPayment[]>([]);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'manager') {
      fetchAndGroupPayments();
    }
  }, [userRole]);

  const fetchAndGroupPayments = async () => {
    setLoading(true);
    try {
      const grouped: GroupedPendingPayment[] = [];

      // Fetch doctor payments
      const { data: doctorPayments, error: doctorError } = await supabase
        .from('payments')
        .select(`
          id,
          doctor_id,
          total_amount,
          gross_amount,
          tds_amount,
          net_amount,
          cash_approval_status,
          insurance_approval_status,
          cash_approved_at,
          insurance_approved_at,
          doctors (
            doctor_code,
            full_name,
            bank_account_number,
            ifsc_code,
            bank_name,
            account_holder_name
          )
        `)
        .eq('bank_advice_generated', false)
        .or('cash_approval_status.eq.approved,insurance_approval_status.eq.approved');

      if (doctorError) throw doctorError;

      // Group by doctor_id
      const doctorGroups = new Map<string, any[]>();
      doctorPayments?.forEach((payment: any) => {
        if (!payment.doctors) return;
        
        const doctorId = payment.doctor_id;
        if (!doctorGroups.has(doctorId)) {
          doctorGroups.set(doctorId, []);
        }
        doctorGroups.get(doctorId)!.push(payment);
      });

      // Create grouped records
      doctorGroups.forEach((payments, doctorId) => {
        const firstPayment = payments[0];
        const doctor = firstPayment.doctors;

        const cashPayments = payments.filter(p => p.cash_approval_status === 'approved');
        const insurancePayments = payments.filter(p => p.insurance_approval_status === 'approved');

        const totalCash = cashPayments.reduce((sum, p) => sum + Number(p.total_amount), 0);
        const totalInsurance = insurancePayments.reduce((sum, p) => sum + Number(p.gross_amount), 0);

        const latestApproval = payments.reduce((latest, p) => {
          const approvalDate = p.cash_approved_at || p.insurance_approved_at;
          return new Date(approvalDate) > new Date(latest) ? approvalDate : latest;
        }, payments[0].cash_approved_at || payments[0].insurance_approved_at);

        grouped.push({
          beneficiary_type: 'doctor',
          beneficiary_id: doctorId,
          beneficiary_name: doctor.full_name,
          beneficiary_code: doctor.doctor_code,
          total_cash_amount: totalCash,
          total_insurance_amount: totalInsurance,
          total_cumulative_amount: totalCash + totalInsurance,
          payment_ids: payments.map(p => p.id),
          payment_records: payments,
          payment_source: cashPayments.length > 0 && insurancePayments.length > 0 ? 'mixed' : 
                         cashPayments.length > 0 ? 'cash' : 'insurance',
          latest_approved_at: latestApproval,
          bank_account_number: doctor.bank_account_number || '',
          ifsc_code: doctor.ifsc_code || '',
          bank_name: doctor.bank_name || '',
          account_holder_name: doctor.account_holder_name || doctor.full_name,
        });
      });

      // Fetch quick payments
      const { data: quickPayments, error: quickError } = await supabase
        .from('quick_payments')
        .select(`
          id,
          name,
          gross_amount,
          tds_amount,
          net_amount,
          account_number,
          ifsc_code,
          bank_name,
          account_holder_name,
          payment_notes,
          created_at,
          vendor_id,
          payment_type_id,
          quick_payment_types (type_name),
          vendors (vendor_name)
        `)
        .eq('bank_advice_generated', false);

      if (quickError) throw quickError;

      quickPayments?.forEach((payment: any) => {
        const isVendor = !!payment.vendor_id;
        grouped.push({
          beneficiary_type: isVendor ? 'vendor' : 'individual',
          beneficiary_id: payment.id,
          beneficiary_name: isVendor && payment.vendors?.vendor_name ? payment.vendors.vendor_name : payment.name,
          beneficiary_code: undefined,
          total_cash_amount: 0,
          total_insurance_amount: 0,
          total_cumulative_amount: Number(payment.net_amount),
          payment_ids: [payment.id],
          payment_records: [payment],
          payment_source: 'quick_payment',
          latest_approved_at: payment.created_at,
          bank_account_number: payment.account_number || '',
          ifsc_code: payment.ifsc_code || '',
          bank_name: payment.bank_name || '',
          account_holder_name: payment.account_holder_name || payment.name,
        });
      });

      setGroupedPayments(grouped);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pending payments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModeDialog = (paymentIds: string[], paymentsData: GroupedPendingPayment[]) => {
    setSelectedPaymentIds(paymentIds);
    setSelectedPaymentsData(paymentsData);
    setPaymentModeDialogOpen(true);
  };

  const handlePaymentModeConfirm = async (mode: PaymentMode, chequeDetails?: ChequeDetails) => {
    setProcessingPayment(true);
    try {
      const now = new Date().toISOString();
      
      // Separate doctor payments and quick payments
      const doctorPaymentIds: string[] = [];
      const quickPaymentIds: string[] = [];
      
      selectedPaymentsData.forEach(payment => {
        if (payment.beneficiary_type === 'doctor') {
          doctorPaymentIds.push(...payment.payment_ids);
        } else {
          quickPaymentIds.push(...payment.payment_ids);
        }
      });

      // Calculate totals for history
      const totalAmount = selectedPaymentsData.reduce((sum, p) => sum + p.total_cumulative_amount, 0);

      if (mode === 'bank') {
        // Generate standard GEFU file for bank transfers
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);

        const institutionCode = websiteSettings?.hospital_institution_code || 'WESTMED';
        const hospitalAccount = websiteSettings?.hospital_bank_account_number || '';
        const hospitalName = websiteSettings?.hospital_name || 'WESTMED HOSPITAL';
        const hospitalAddress = websiteSettings?.hospital_institution_address || '';
        const addressParts = hospitalAddress.split(',').map((s: string) => s.trim());
        const address1 = addressParts[0] || '';
        const address2 = addressParts[1] || '';
        const address3 = addressParts[2] || '';

        let gefuContent = `H~${dd}/${mm}/20${yy}~${institutionCode}\n`;
        let paymentIndex = 0;

        selectedPaymentsData.forEach(payment => {
          if (payment.bank_account_number && payment.ifsc_code) {
            paymentIndex++;
            const seq = String(paymentIndex).padStart(6, '0');
            const amount = payment.total_cumulative_amount.toFixed(2);

            // Determine sender-to-receiver info
            let senderToRcvrInfo = '';
            if (payment.beneficiary_type === 'doctor') {
              senderToRcvrInfo = 'CONSULTING CHARGES';
            } else {
              const paymentRecord = payment.payment_records[0];
              const notes = paymentRecord?.payment_notes;
              if (notes && notes.trim().length > 0) {
                senderToRcvrInfo = notes.trim().replace(/[~\r\n]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 35).toUpperCase();
              } else {
                senderToRcvrInfo = (paymentRecord?.quick_payment_types?.type_name || 'PAYMENT').replace(/[~\r\n]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 35).toUpperCase();
              }
            }

            gefuContent += `D~N06~${hospitalAccount}~${hospitalName}~${address1}~${address2}~${address3}~${payment.ifsc_code}~${payment.bank_account_number}~${payment.account_holder_name || payment.beneficiary_name}~~~~~${seq}~${dd}/${mm}/20${yy}~${amount}~${senderToRcvrInfo}~~~~\n`;
          }
        });

        gefuContent += `F~${paymentIndex}~${totalAmount.toFixed(2)}\n`;

        if (paymentIndex > 0) {
          const blob = new Blob([gefuContent], { type: 'text/plain' });
          const filename = `${dd}${mm}${yy}-${paymentIndex}.txt`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }

      // Update doctor payments
      if (doctorPaymentIds.length > 0) {
        const { error: doctorError } = await supabase
          .from('payments')
          .update({
            bank_advice_generated: true,
            bank_advice_generated_at: now,
            bank_advice_generated_by: user?.id,
            payment_mode: mode,
            ...(mode === 'cheque' && chequeDetails ? {
              cheque_number: chequeDetails.cheque_number,
              cheque_date: chequeDetails.cheque_date,
              cheque_bank_name: chequeDetails.cheque_bank_name,
            } : {}),
          })
          .in('id', doctorPaymentIds);
        
        if (doctorError) throw doctorError;
      }

      // Update quick payments
      if (quickPaymentIds.length > 0) {
        const { error: quickError } = await supabase
          .from('quick_payments')
          .update({
            bank_advice_generated: true,
            bank_advice_generated_at: now,
            bank_advice_generated_by: user?.id,
            payment_mode: mode,
            ...(mode === 'cheque' && chequeDetails ? {
              cheque_number: chequeDetails.cheque_number,
              cheque_date: chequeDetails.cheque_date,
              cheque_bank_name: chequeDetails.cheque_bank_name,
            } : {}),
          })
          .in('id', quickPaymentIds);
        
        if (quickError) throw quickError;
      }

      const modeLabels = {
        bank: 'Bank Transfer',
        cash: 'Cash Payment',
        cheque: 'Cheque Issue',
      };

      toast({
        title: 'Success',
        description: `${modeLabels[mode]} processed for ${selectedPaymentsData.length} beneficiaries`,
      });

      setPaymentModeDialogOpen(false);
      fetchAndGroupPayments();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to process payments',
        variant: 'destructive',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleGenerateAdvice = async (paymentIds: string[], paymentsData: GroupedPendingPayment[]) => {
    handleOpenPaymentModeDialog(paymentIds, paymentsData);
  };

  const handleSendToManager = async (paymentIds: string[]) => {
    try {
      await supabase
        .from('payments')
        .update({
          cash_approval_status: 'manager_approved',
          insurance_approval_status: 'manager_approved',
        })
        .in('id', paymentIds);

      toast({
        title: 'Success',
        description: 'Payments sent back to manager for review',
      });
      fetchAndGroupPayments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send to manager',
        variant: 'destructive',
      });
    }
  };

  if (userRole !== 'admin' && userRole !== 'manager') {
    return (
      <div className="space-y-6">
        <Card>
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              Only administrators and managers can access bank advice generation.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">Bank Advice Generation</h1>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              BETA
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Centralized bank advice generation with grouped payments
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Payments ({groupedPayments.length})
          </TabsTrigger>
          <TabsTrigger value="generated">Generated Advice</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <BetaPendingPaymentsTab
              groupedPayments={groupedPayments}
              onGenerateAdvice={handleGenerateAdvice}
              onSendToManager={handleSendToManager}
            />
          )}
        </TabsContent>

        <TabsContent value="generated">
          <BetaGeneratedAdviceTab />
        </TabsContent>
      </Tabs>

      <PaymentModeDialog
        open={paymentModeDialogOpen}
        onOpenChange={setPaymentModeDialogOpen}
        onConfirm={handlePaymentModeConfirm}
        selectedCount={selectedPaymentsData.length}
        totalAmount={selectedPaymentsData.reduce((sum, p) => sum + p.total_cumulative_amount, 0)}
        isLoading={processingPayment}
      />
    </div>
  );
};

export default BankAdviceGenerationBeta;
