export interface GroupedPendingPayment {
  beneficiary_type: 'doctor' | 'vendor' | 'individual';
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_code?: string;
  
  // Cumulative amounts
  total_cash_amount: number;
  total_insurance_amount: number;
  total_cumulative_amount: number;
  
  // For expansion
  payment_ids: string[];
  payment_records: any[];
  payment_source: 'cash' | 'insurance' | 'quick_payment' | 'mixed';
  
  latest_approved_at: string;
  
  // Bank details from masters
  bank_account_number: string;
  ifsc_code: string;
  bank_name: string;
  account_holder_name: string;
}

export interface VisitDetail {
  id: string;
  visit_code: string;
  visit_date: string;
  patient_name: string;
  visit_payment: number;
  payment_type: string;
}

export interface PaymentDetail {
  id: string;
  period_start: string;
  period_end: string;
  total_visits: number;
  cash_approval_status?: string;
  insurance_approval_status?: string;
  total_amount: number;
  gross_amount: number;
  visits: VisitDetail[];
}
