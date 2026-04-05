import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { cn, debounce } from '@/lib/utils';
import { 
  Plus, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Calculator,
  TrendingUp,
  History,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  FileText,
  Download,
  Building2,
  IndianRupee,
  Activity,
  Target,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { printReport } from '@/lib/printUtils';
import { format } from 'date-fns';
import { formatDateIST, formatDateTimeIST, toISOStringIST, formatReportDateIST, formatFileTimestampIST } from '@/lib/dateUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportGeneration from './ReportGeneration';
import PaymentManagementTable from './PaymentManagementTable';
import BankAdviceReports from './BankAdviceReports';
import PartPaymentDialog from './PartPaymentDialog';
import { PaymentModeDialog, PaymentMode, ChequeDetails } from './PaymentModeDialog';
import { calculateTDS } from '@/lib/tdsUtils';
import PaymentReleaseHistory from './PaymentReleaseHistory';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { StatsCard } from '@/components/ui/stats-card';
import { LoadingScreen } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChips } from '@/components/ui/filter-chip';
import { ProgressBar } from '@/components/ui/progress-bar';

interface Payment {
  id: string;
  period_start: string;
  period_end: string;
  discharge_date?: string;
  total_visits: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  is_fully_paid: boolean;
  payment_notes?: string;
  status: 'pending' | 'manager_approved' | 'admin_approved' | 'rejected';
  manager_approved_by?: string;
  manager_approved_at?: string;
  admin_approved_by?: string;
  admin_approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  is_suspect?: boolean;
  suspect_reason?: string;
  marked_suspect_by?: string;
  marked_suspect_at?: string;
  bank_advice_generated?: boolean;
  bank_advice_generated_at?: string;
  bank_advice_generated_by?: string;
  // Separate cash/insurance approval fields
  cash_approval_status?: string;
  cash_approved_by?: string;
  cash_approved_at?: string;
  cash_rejection_reason?: string;
  insurance_approval_status?: string;
  insurance_approved_by?: string;
  insurance_approved_at?: string;
  insurance_rejection_reason?: string;
  // TDS fields
  gross_amount?: number;
  tds_amount?: number;
  tds_percentage?: number;
  net_amount?: number;
  doctors: {
    doctor_code: string;
    profiles: {
      full_name: string;
    };
  };
  doctor_id?: string;
  cash_total?: number;
  cash_visits?: number;
  insurance_total?: number;
  insurance_visits?: number;
  patient_names?: string[]; // Array of all patient names in this payment
  insurance_company_names?: string[]; // Array of unique insurance company names
  // Part payment fields
  total_released_gross?: number;
  total_released_tds?: number;
  total_released_net?: number;
  release_count?: number;
  release_status?: string;
}

interface PaymentTransaction {
  id: string;
  payment_id: string;
  amount: number;
  transaction_date: string;
  transaction_reference?: string;
  notes?: string;
  created_at: string;
}

interface Doctor {
  id: string;
  doctor_code: string;
  full_name?: string;
  ifsc_code?: string;
  bank_account_number?: string;
  account_holder_name?: string;
  bank_name?: string;
  profiles: {
    full_name: string;
  };
}

interface Visit {
  id: string;
  visit_date: string;
  patient_count: number;
  patient_name: string;
  visit_payment?: number;
  payment_type: string;
  visit_reason: string;
  notes?: string;
  is_processed: boolean;
  doctor_id: string;
  insurance_company_id?: string;
  insurance_companies?: {
    company_name: string;
    company_code?: string;
  };
  doctors: {
    doctor_code: string;
    profiles: {
      full_name: string;
    };
  };
}

interface PaymentManagementProps {
  initialSubTab?: string;
  initialPaymentTypeFilter?: 'all' | 'cash' | 'insurance' | 'mixed';
  paymentTypeOnly?: 'cash' | 'insurance'; // Force showing only one payment type
}

const PaymentManagement = ({ initialSubTab, initialPaymentTypeFilter, paymentTypeOnly }: PaymentManagementProps = {}) => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suspectDialog, setSuspectDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [transactionsDialog, setTransactionsDialog] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentsForBankAdvice, setSelectedPaymentsForBankAdvice] = useState<Set<string>>(new Set());
  const [selectedForApproval, setSelectedForApproval] = useState<Set<string>>(new Set());
  const [generatingBankAdvice, setGeneratingBankAdvice] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('waiting');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'cash' | 'insurance' | 'mixed'>('all');
  
  const [showBankAdviceReviewDialog, setShowBankAdviceReviewDialog] = useState(false);
  
  // Part payment dialogs
  const [showPartPaymentDialog, setShowPartPaymentDialog] = useState(false);
  const [showReleaseHistoryDialog, setShowReleaseHistoryDialog] = useState(false);
  const [partPaymentTarget, setPartPaymentTarget] = useState<Payment | null>(null);
  
  // Payment mode dialog state
  const [paymentModeDialogOpen, setPaymentModeDialogOpen] = useState(false);
  const [processingPaymentMode, setProcessingPaymentMode] = useState(false);
  
  // Delete confirmation dialog state
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  
  const { data: websiteSettings } = useWebsiteSettings();
  const [transactionTypeSelections, setTransactionTypeSelections] = useState<Map<string, string>>(new Map());
  const [bulkTransactionType, setBulkTransactionType] = useState<string>('NEFT TRANSFER');
  const [selectedPaymentsForReview, setSelectedPaymentsForReview] = useState<any[]>([]);
  const [paymentAmountError, setPaymentAmountError] = useState<string>('');

  // Global payment statistics
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);

  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'doctor_name' | 'doctor_code' | 'patient_name' | 'insurance_name'>('all');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced fetch suggestions
  const fetchSuggestionsRaw = useCallback(async (term: string, filter: string) => {
    if (term.length < 2 || filter === 'all') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    try {
      let results: string[] = [];
      if (filter === 'doctor_name') {
        const { data } = await supabase.from('doctors').select('full_name').ilike('full_name', `%${term}%`).limit(10);
        results = (data || []).map(d => d.full_name).filter(Boolean) as string[];
      } else if (filter === 'doctor_code') {
        const { data } = await supabase.from('doctors').select('doctor_code').ilike('doctor_code', `%${term}%`).limit(10);
        results = (data || []).map(d => d.doctor_code);
      } else if (filter === 'patient_name') {
        const { data } = await supabase.from('visits').select('patient_name').ilike('patient_name', `%${term}%`).limit(50);
        results = [...new Set((data || []).map(d => d.patient_name))].slice(0, 10);
      } else if (filter === 'insurance_name') {
        const { data } = await supabase.from('insurance_companies').select('company_name').ilike('company_name', `%${term}%`).limit(10);
        results = (data || []).map(d => d.company_name);
      }
      setSuggestions([...new Set(results)]);
      setShowSuggestions(results.length > 0);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  const debouncedFetchSuggestions = useCallback(
    debounce((term: string, filter: string) => fetchSuggestionsRaw(term, filter), 300),
    [fetchSuggestionsRaw]
  );

  const [formData, setFormData] = useState({
    doctor_id: '',
    payment_type_filter: (paymentTypeOnly || 'cash') as 'cash' | 'insurance',
    payment_notes: ''
  });

  // State for existing pending payments selection
  const [existingPendingPayments, setExistingPendingPayments] = useState<Payment[]>([]);
  const [targetPaymentChoice, setTargetPaymentChoice] = useState<'new' | string>('new');
  
  // State for manual visit selection
  const [selectedVisitIds, setSelectedVisitIds] = useState<Set<string>>(new Set());

  const [suspectFormData, setSuspectFormData] = useState({
    suspect_reason: ''
  });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    transaction_reference: '',
    notes: ''
  });

  // Visit selection handlers
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

  const handleSelectAllVisits = () => {
    setSelectedVisitIds(new Set(visits.map(v => v.id)));
  };

  const handleClearAllVisits = () => {
    setSelectedVisitIds(new Set());
  };

  useEffect(() => {
    // Guard: Only fetch if user and userRole are loaded
    if (!user || !userRole) {
      console.log('Waiting for auth to load...', { user: !!user, userRole });
      return;
    }
    
    console.log('Auth loaded, fetching payments for:', { userRole, userId: user.id });
    fetchPayments();
    fetchGlobalTotals();
    if (userRole === 'admin' || userRole === 'manager') {
      fetchDoctors();
    }
  }, [user, userRole]); // Added user to dependencies

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
    if (initialPaymentTypeFilter) {
      setPaymentTypeFilter(initialPaymentTypeFilter);
    }
  }, [initialSubTab, initialPaymentTypeFilter]);

  const fetchGlobalTotals = async () => {
    try {
      // Build visits query with optional payment_type filter
      let visitsQuery = supabase
        .from('visits')
        .select('visit_payment');
      
      if (paymentTypeOnly) {
        visitsQuery = visitsQuery.eq('payment_type', paymentTypeOnly);
      }

      // Build transactions query with optional payment_type filter
      let transactionsQuery = supabase
        .from('payment_transactions')
        .select(`
          amount,
          payments!inner(
            id,
            payment_visits!inner(
              visits!inner(
                payment_type
              )
            )
          )
        `);

      const [visitsResponse, transactionsResponse] = await Promise.all([
        visitsQuery,
        transactionsQuery
      ]);

      let totalFromVisits = 0;
      let totalPaidAmount = 0;

      if (visitsResponse.data) {
        totalFromVisits = visitsResponse.data.reduce((sum, visit) => 
          sum + (visit.visit_payment || 0), 0
        );
      }

      if (transactionsResponse.data) {
        // Filter transactions by payment_type if specified
        const filteredTransactions = paymentTypeOnly 
          ? transactionsResponse.data.filter(transaction => {
              // Check if this transaction's payment has visits of the specified type
              const hasMatchingVisits = transaction.payments.payment_visits.some(
                (pv: any) => pv.visits.payment_type === paymentTypeOnly
              );
              return hasMatchingVisits;
            })
          : transactionsResponse.data;

        totalPaidAmount = filteredTransactions.reduce((sum, transaction) => 
          sum + transaction.amount, 0
        );
        setTotalPaid(totalPaidAmount);
      }

      // Calculate actual pending amount (Total Visits - Total Paid)
      const actualPending = totalFromVisits - totalPaidAmount;
      setTotalPending(actualPending);
      
    } catch (error) {
      console.error('Error fetching global totals:', error);
    }
  };

  const fetchVisitsForPayment = async (paymentId: string) => {
    try {
      // Determine correct user ID based on role - doctors need their auth.users ID
      const userId = userRole === 'doctor' 
        ? (user?.user_metadata?.auth_user_id || user?.id)
        : user?.id;

      if (!userId) {
        console.error('No user ID for fetching payment visits');
        return [];
      }

      console.log('🔐 Fetching visits with userId:', userId, 'for payment:', paymentId);

      // Use RPC function with SECURITY DEFINER to bypass RLS
      const { data, error } = await supabase.rpc('get_payment_visits', {
        _payment_id: paymentId,
        _user_id: userId
      });

      if (error) {
        console.error('Error fetching visits for payment:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching visits for payment:', error);
      return [];
    }
  };

  const fetchPayments = async () => {
    try {
      console.log('=== fetchPayments START ===');
      console.log('Current auth state:', { 
        userRole, 
        userId: user?.id, 
        userMetadata: user?.user_metadata 
      });
      
      // Use auth_user_id for doctor to match RLS policies
      const userId = userRole === 'doctor' 
        ? user?.user_metadata?.auth_user_id || user?.id
        : user?.id;

      console.log('Resolved userId for RPC call:', userId);

      if (!userId) {
        console.error('❌ Cannot fetch payments: userId is undefined');
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Unable to identify user. Please try logging out and back in."
        });
        setPayments([]);
        setLoading(false);
        return;
      }

      console.log('Calling get_user_payments RPC with:', {
        _user_type: userRole === 'doctor' ? 'doctor' : 'staff',
        _user_id: userId,
        _user_role: userRole || 'staff'
      });

      const { data, error } = await supabase.rpc('get_user_payments', {
        _user_type: userRole === 'doctor' ? 'doctor' : 'staff',
        _user_id: userId,
        _user_role: userRole || 'staff'
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        toast({
          variant: "destructive",
          title: "Error Loading Payments",
          description: error.message || "Failed to load payment data"
        });
        setPayments([]);
      } else {
        console.log('✅ RPC Success - Raw data received:', data?.length || 0, 'payments');
        console.log('Sample payment:', data?.[0]);
        
        const transformedPayments = await Promise.all((data || []).map(async (payment: any) => {
          console.log('🔍 Fetching visits for payment:', payment.id);
          // Fetch visits for this payment to calculate payment type breakdown
          const visits = await fetchVisitsForPayment(payment.id);
          console.log('✅ Visits fetched:', visits.length, visits);
          
          // Calculate latest discharge date from all visits
          const discharge_date = visits.length > 0
            ? visits.reduce((latest, visit) => {
                return new Date(visit.visit_date) > new Date(latest) 
                  ? visit.visit_date 
                  : latest;
              }, visits[0].visit_date)
            : null;
          
          const cashVisits = visits.filter(v => v.payment_type === 'cash');
          const insuranceVisits = visits.filter(v => v.payment_type === 'insurance');
          
          const cash_total = cashVisits.reduce((sum, v) => sum + (v.visit_payment || 0), 0);
          const cash_visits = cashVisits.reduce((sum, v) => sum + v.patient_count, 0);
          const insurance_total = insuranceVisits.reduce((sum, v) => sum + (v.visit_payment || 0), 0);
          const insurance_visits = insuranceVisits.reduce((sum, v) => sum + v.patient_count, 0);
          
          console.log('💰 Payment totals for', payment.id, ':', { 
            cash_total, 
            insurance_total,
            cashVisits: cashVisits.length,
            insuranceVisits: insuranceVisits.length 
          });

          // Extract all patient names and insurance companies
          const patient_names = visits
            .map(v => v.patient_name)
            .filter(Boolean);

          const insurance_company_names = Array.from(
            new Set(
              visits
                .filter(v => v.company_name)
                .map(v => v.company_name)
            )
          );

          return {
            id: payment.id,
            period_start: payment.period_start,
            period_end: payment.period_end,
            discharge_date,
            total_visits: payment.total_visits,
            total_amount: payment.total_amount,
            paid_amount: payment.paid_amount,
            remaining_amount: payment.remaining_amount,
            is_fully_paid: payment.is_fully_paid,
            payment_notes: payment.payment_notes,
            status: payment.status,
            manager_approved_by: payment.manager_approved_by,
            manager_approved_at: payment.manager_approved_at,
            admin_approved_by: payment.admin_approved_by,
            admin_approved_at: payment.admin_approved_at,
            rejected_by: payment.rejected_by,
            rejected_at: payment.rejected_at,
            rejection_reason: payment.rejection_reason,
            bank_advice_generated: payment.bank_advice_generated,
            bank_advice_generated_at: payment.bank_advice_generated_at,
            bank_advice_generated_by: payment.bank_advice_generated_by,
            cash_approval_status: payment.cash_approval_status,
            cash_approved_by: payment.cash_approved_by,
            cash_approved_at: payment.cash_approved_at,
            cash_rejection_reason: payment.cash_rejection_reason,
            insurance_approval_status: payment.insurance_approval_status,
            insurance_approved_by: payment.insurance_approved_by,
            insurance_approved_at: payment.insurance_approved_at,
            insurance_rejection_reason: payment.insurance_rejection_reason,
            doctor_id: payment.doctor_id,
            doctors: {
              doctor_code: payment.doctor_code,
              profiles: {
                full_name: payment.doctor_name
              }
            },
            cash_total,
            cash_visits,
            insurance_total,
            insurance_visits,
            patient_names,
            insurance_company_names
          };
        }));
        
        console.log('📊 Final transformed payments:', transformedPayments.length);
        transformedPayments.forEach(p => {
          console.log(`  - Payment ${p.id}: cash=₹${p.cash_total}, insurance=₹${p.insurance_total}`);
        });
        setPayments(transformedPayments);

        // Calculate pending total from current payments
        const currentPendingTotal = transformedPayments
          .filter((p: any) => p.status === 'pending')
          .reduce((sum: number, p: any) => sum + p.total_amount, 0);
        setPendingTotal(currentPendingTotal);
      }
    } catch (error) {
      console.error('❌ Unexpected error in fetchPayments:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while loading payments"
      });
      setPayments([]);
    } finally {
      setLoading(false);
      console.log('=== fetchPayments END ===');
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          doctor_code,
          full_name,
          ifsc_code,
          bank_account_number,
          account_holder_name,
          bank_name
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

  const fetchTransactions = async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          id,
          payment_id,
          amount,
          transaction_date,
          transaction_reference,
          notes,
          created_at
        `)
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payment transactions"
      });
    }
  };

  const fetchExistingPayments = async (doctorId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id, period_start, period_end, status')
        .eq('doctor_id', doctorId)
        .in('status', ['pending', 'manager_approved', 'admin_approved'])
        .order('period_start');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching existing payments:', error);
      return [];
    }
  };

  const fetchExistingPendingPayments = async (doctorId: string, paymentTypeFilter: 'cash' | 'insurance') => {
    try {
      const { data: pendingPayments, error } = await supabase
        .from('payments')
        .select(`
          *,
          doctors!inner (
            doctor_code,
            profiles!inner (
              full_name
            )
          )
        `)
        .eq('doctor_id', doctorId)
        .eq('status', 'pending');

      if (error) throw error;

      // For each payment, fetch its visits to calculate type breakdown
      const paymentsWithBreakdown = await Promise.all((pendingPayments || []).map(async (payment: any) => {
        const visits = await fetchVisitsForPayment(payment.id);
        
        const cashVisits = visits.filter(v => v.payment_type === 'cash');
        const insuranceVisits = visits.filter(v => v.payment_type === 'insurance');
        
        const cash_total = cashVisits.reduce((sum, v) => sum + (v.visit_payment || 0), 0);
        const cash_visits = cashVisits.reduce((sum, v) => sum + v.patient_count, 0);
        const insurance_total = insuranceVisits.reduce((sum, v) => sum + (v.visit_payment || 0), 0);
        const insurance_visits = insuranceVisits.reduce((sum, v) => sum + v.patient_count, 0);

        return {
          ...payment,
          doctors: {
            doctor_code: payment.doctors.doctor_code,
            profiles: {
              full_name: Array.isArray(payment.doctors.profiles) 
                ? payment.doctors.profiles[0]?.full_name || ''
                : payment.doctors.profiles?.full_name || ''
            }
          },
          cash_total,
          cash_visits,
          insurance_total,
          insurance_visits
        };
      }));

      // Filter to show only payments that match the payment type or are empty
      const relevantPayments = paymentsWithBreakdown.filter(payment => {
        if (paymentTypeFilter === 'cash') {
          return payment.cash_total > 0 || (payment.cash_total === 0 && payment.insurance_total === 0);
        } else {
          return payment.insurance_total > 0 || (payment.cash_total === 0 && payment.insurance_total === 0);
        }
      });

      setExistingPendingPayments(relevantPayments);
    } catch (error) {
      console.error('Error fetching existing pending payments:', error);
      setExistingPendingPayments([]);
    }
  };

  const fetchUnprocessedVisits = async (doctorId: string, paymentTypeFilter: 'all' | 'cash' | 'insurance') => {
    try {
      // Also fetch existing pending payments for the target payment selector
      if (paymentTypeFilter === 'cash' || paymentTypeFilter === 'insurance') {
        await fetchExistingPendingPayments(doctorId, paymentTypeFilter);
      }

      // Build query for ALL unprocessed visits
      let query = supabase
        .from('visits')
        .select(`
          *,
          doctors!inner (
            doctor_code,
            full_name
          )
        `)
        .eq('doctor_id', doctorId)
        .eq('is_processed', false)
        .order('visit_date', { ascending: true });

      // Apply payment type filter
      if (paymentTypeFilter === 'cash') {
        query = query.eq('payment_type', 'cash');
      } else if (paymentTypeFilter === 'insurance') {
        query = query.eq('payment_type', 'insurance');
      }

      const { data: allVisits, error: visitsError } = await query;

      if (visitsError) throw visitsError;

      // Get visit IDs that are actually linked in payment_visits for non-rejected payments
      const { data: linkedVisits, error: linkedError } = await supabase
        .from('payment_visits')
        .select('visit_id, payments!inner(status, doctor_id)')
        .eq('payments.doctor_id', doctorId)
        .in('payments.status', ['pending', 'manager_approved', 'admin_approved']);

      if (linkedError) {
        console.error('Error fetching linked visits:', linkedError);
      }

      // Create a Set of visit IDs that are actually linked to payments
      const linkedVisitIds = new Set(linkedVisits?.map(v => v.visit_id) || []);

      // Filter out visits that are actually linked in payment_visits
      const availableVisits = (allVisits || []).filter(visit => {
        return !linkedVisitIds.has(visit.id);
      });

      // Show notification if some visits were excluded
      const excludedCount = (allVisits?.length || 0) - availableVisits.length;
      if (excludedCount > 0) {
        toast({
          title: "Info",
          description: `${excludedCount} visit(s) excluded - already included in existing payment requests`,
          variant: "default"
        });
      }

      // Transform to match expected structure
      const transformedData = availableVisits.map(visit => ({
        ...visit,
        doctors: {
          doctor_code: visit.doctors.doctor_code,
          profiles: { full_name: visit.doctors.full_name }
        }
      }));
      
      setVisits(transformedData);
      setSelectedVisitIds(new Set()); // Clear selections when new visits are fetched
      return transformedData;
    } catch (error) {
      console.error('Error fetching visits:', error);
      setVisits([]);
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!formData.doctor_id) {
        throw new Error('Please select a doctor');
      }

      // Fetch available visits for the selected doctor and payment type
      const allVisits = await fetchUnprocessedVisits(formData.doctor_id, formData.payment_type_filter);
      
      // Filter to only selected visits
      const filteredVisits = allVisits.filter(visit => selectedVisitIds.has(visit.id));

      // Validate selection
      if (filteredVisits.length === 0) {
        toast({
          variant: "destructive",
          title: "No Visits Selected",
          description: "Please select at least one visit to create a payment advice."
        });
        setSubmitting(false);
        return;
      }
      
      if (allVisits.length === 0) {
        toast({
          variant: "destructive",
          title: "No Visits Available",
          description: `No available visits found for the selected payment type (${formData.payment_type_filter}). All visits are already included in existing payment requests.`
        });
        setSubmitting(false);
        return;
      }

      // Calculate period dates from actual visits
      const visitDates = filteredVisits.map(v => new Date(v.visit_date));
      const period_start = new Date(Math.min(...visitDates.map(d => d.getTime()))).toISOString().split('T')[0];
      const period_end = new Date(Math.max(...visitDates.map(d => d.getTime()))).toISOString().split('T')[0];

      // Check if any selected visits are already linked in payment_visits for non-rejected payments
      const { data: linkedVisits, error: linkedError } = await supabase
        .from('payment_visits')
        .select('visit_id, payments!inner(status, doctor_id)')
        .eq('payments.doctor_id', formData.doctor_id)
        .in('payments.status', ['pending', 'manager_approved', 'admin_approved']);

      if (linkedError) throw linkedError;

      const linkedVisitIds = new Set(linkedVisits?.map(v => v.visit_id) || []);

      // Check if any of the filtered visits are already linked
      const conflictingVisits = filteredVisits.filter(visit => linkedVisitIds.has(visit.id));

      if (conflictingVisits.length > 0) {
        throw new Error(`${conflictingVisits.length} visit(s) are already in existing payment requests`);
      }

      // Calculate total amount from visits
      const totalAmount = filteredVisits.reduce((sum, visit) => sum + (visit.visit_payment || 0), 0);
      const totalVisits = filteredVisits.reduce((sum, visit) => sum + visit.patient_count, 0);

      // Calculate cash and insurance totals from actual visits
      const cashTotal = filteredVisits
        .filter(v => v.payment_type === 'cash')
        .reduce((sum, v) => sum + (v.visit_payment || 0), 0);
      
      const insuranceTotal = filteredVisits
        .filter(v => v.payment_type === 'insurance')
        .reduce((sum, v) => sum + (v.visit_payment || 0), 0);

      // Check if attaching to existing payment or creating new
      if (targetPaymentChoice !== 'new') {
        // Attaching to existing payment
        const existingPayment = existingPendingPayments.find(p => p.id === targetPaymentChoice);
        if (!existingPayment) {
          throw new Error('Selected payment not found');
        }

        // Verify payment is still pending
        const { data: currentPayment, error: checkError } = await supabase
          .from('payments')
          .select('status')
          .eq('id', targetPaymentChoice)
          .single();

        if (checkError || currentPayment?.status !== 'pending') {
          throw new Error('Selected payment is no longer pending. Please refresh and try again.');
        }

        // Insert payment_visits links
        const paymentVisitsData = filteredVisits.map(visit => ({
          payment_id: targetPaymentChoice,
          visit_id: visit.id
        }));

        const { error: pvError } = await supabase
          .from('payment_visits')
          .insert(paymentVisitsData);

        if (pvError) throw pvError;

        // Update the existing payment with new totals and extended period
        const newTotalAmount = existingPayment.total_amount + totalAmount;
        const newTotalVisits = existingPayment.total_visits + totalVisits;
        const newRemainingAmount = existingPayment.remaining_amount + totalAmount;
        
        const extendedPeriodStart = new Date(Math.min(
          new Date(existingPayment.period_start).getTime(),
          new Date(period_start).getTime()
        )).toISOString().split('T')[0];
        
        const extendedPeriodEnd = new Date(Math.max(
          new Date(existingPayment.period_end).getTime(),
          new Date(period_end).getTime()
        )).toISOString().split('T')[0];

        const paymentUpdateData: any = {
          total_amount: newTotalAmount,
          total_visits: newTotalVisits,
          remaining_amount: newRemainingAmount,
          is_fully_paid: existingPayment.paid_amount >= newTotalAmount,
          period_start: extendedPeriodStart,
          period_end: extendedPeriodEnd
        };

        // Ensure approval status exists for the payment type being added
        if (formData.payment_type_filter === 'cash' && !existingPayment.cash_approval_status) {
          paymentUpdateData.cash_approval_status = 'pending';
        } else if (formData.payment_type_filter === 'insurance' && !existingPayment.insurance_approval_status) {
          paymentUpdateData.insurance_approval_status = 'pending';
        }

        const { error: updateError } = await supabase
          .from('payments')
          .update(paymentUpdateData)
          .eq('id', targetPaymentChoice);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: `Added ${filteredVisits.length} visit(s) to existing ${formData.payment_type_filter} payment (${formatDateIST(extendedPeriodStart)} → ${formatDateIST(extendedPeriodEnd)})`
        });

        setDialogOpen(false);
        resetForm();
        fetchPayments();
        fetchGlobalTotals();
        setSubmitting(false);
        return;
      }

      // Creating new payment - original logic
      const paymentData: any = {
        doctor_id: formData.doctor_id,
        period_start,
        period_end,
        total_visits: totalVisits,
        total_amount: totalAmount,
        paid_amount: 0,
        remaining_amount: totalAmount,
        is_fully_paid: false,
        payment_notes: formData.payment_notes || null,
        status: 'pending' as const
      };

      // Set approval status only for payment types that exist in visits
      if (cashTotal > 0) {
        paymentData.cash_approval_status = 'pending';
      }
      if (insuranceTotal > 0) {
        paymentData.insurance_approval_status = 'pending';
      }

      const { data: paymentResult, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) throw error;

      // Insert payment-visit relationships into junction table
      if (paymentResult) {
        const visitLinks = filteredVisits.map(visit => ({
          payment_id: paymentResult.id,
          visit_id: visit.id
        }));

        const { error: linkError } = await supabase
          .from('payment_visits')
          .insert(visitLinks);

        if (linkError) {
          console.error('Error linking visits to payment:', linkError);
          throw new Error('Failed to link visits to payment');
        }
      }

      toast({
        title: "Success",
        description: `Payment advice created successfully for ${totalVisits} visit(s) (${period_start} to ${period_end})`
      });

      setDialogOpen(false);
      resetForm();
      fetchPayments();
      fetchGlobalTotals();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create payment advice"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const validatePaymentAmount = (amount: number, remainingAmount: number): string => {
    if (!amount || amount === 0) {
      return "Payment amount is required";
    }
    if (amount < 0) {
      return "Payment amount cannot be negative";
    }
    if (amount > remainingAmount) {
      return `Payment amount cannot exceed ${formatCurrency(remainingAmount)}`;
    }
    return '';
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    
    setProcessingPayment(true);

    if (paymentFormData.amount <= 0 || paymentFormData.amount > selectedPayment.remaining_amount) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: `Amount must be between ₹1 and ${formatCurrency(selectedPayment.remaining_amount)}`
      });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      // Create payment transaction
      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          payment_id: selectedPayment.id,
          amount: paymentFormData.amount,
          transaction_reference: paymentFormData.transaction_reference || null,
          notes: paymentFormData.notes || null,
          created_by: profile.id
        });

      if (transactionError) throw transactionError;

      // Update payment record
      const newPaidAmount = selectedPayment.paid_amount + paymentFormData.amount;
      const newRemainingAmount = selectedPayment.total_amount - newPaidAmount;
      const isFullyPaid = newRemainingAmount <= 0;

      // Prepare update data
      const paymentUpdateData: any = {
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        is_fully_paid: isFullyPaid
      };

      // Auto-approve cash/insurance if payment becomes fully paid and already approved by manager/admin
      if (isFullyPaid && (selectedPayment.status === 'manager_approved' || selectedPayment.status === 'admin_approved')) {
        // Fetch visits for this payment to determine which types need approval
        const visits = await fetchVisitsForPayment(selectedPayment.id);
        const hasCash = visits.some(v => v.payment_type === 'cash');
        const hasInsurance = visits.some(v => v.payment_type === 'insurance');

      if (hasCash && selectedPayment.cash_approval_status === 'pending') {
        paymentUpdateData.cash_approval_status = 'approved';
        paymentUpdateData.cash_approved_at = toISOStringIST();
        paymentUpdateData.cash_approved_by = user!.id;
      }
      if (hasInsurance && selectedPayment.insurance_approval_status === 'pending') {
        paymentUpdateData.insurance_approval_status = 'approved';
        paymentUpdateData.insurance_approved_at = toISOStringIST();
        paymentUpdateData.insurance_approved_by = user!.id;
      }
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .update(paymentUpdateData)
        .eq('id', selectedPayment.id);

      if (paymentError) throw paymentError;

      toast({
        title: "Success",
        description: `Payment of ${formatCurrency(paymentFormData.amount)} recorded successfully`
      });

      setPaymentDialog(false);
      setPaymentFormData({ amount: 0, transaction_reference: '', notes: '' });
      fetchPayments();
      fetchGlobalTotals();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record payment"
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleApproval = async (paymentId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      let updateData: any = {};

      if (action === 'approve') {
        if (userRole === 'manager') {
          updateData = {
            status: 'manager_approved',
            manager_approved_by: profile.id,
            manager_approved_at: toISOStringIST()
          };
        } else if (userRole === 'admin') {
          const payment = payments.find(p => p.id === paymentId);
          if (payment?.status === 'pending') {
            // Skip manager approval and go directly to admin approval
            updateData = {
              status: 'admin_approved',
              manager_approved_by: profile.id,
              manager_approved_at: toISOStringIST(),
              admin_approved_by: profile.id,
              admin_approved_at: toISOStringIST()
            };
          } else {
            updateData = {
              status: 'admin_approved',
              admin_approved_by: profile.id,
              admin_approved_at: toISOStringIST()
            };
          }
        }
      } else {
        updateData = {
          status: 'rejected',
          rejected_by: profile.id,
          rejected_at: toISOStringIST(),
          rejection_reason: reason
        };
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      fetchPayments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${action} payment`
      });
    }
  };

  const handleCashApproval = async (paymentId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');

      let updateData: any = {};

      if (action === 'approve') {
        if (userRole === 'manager') {
          updateData = {
            cash_approval_status: 'approved', // Fixed: Use 'approved' instead of 'manager_approved'
            cash_approved_by: user!.id,
            cash_approved_at: toISOStringIST(),
            status: 'manager_approved',
            manager_approved_by: profile.id,
            manager_approved_at: toISOStringIST()
          };
        } else if (userRole === 'admin') {
          if (payment?.cash_approval_status === 'pending') {
            // Skip manager approval and go directly to admin approval
            updateData = {
              cash_approval_status: 'approved', // Fixed: Use 'approved' instead of 'admin_approved'
              cash_approved_by: user!.id,
              cash_approved_at: toISOStringIST(),
              status: 'admin_approved',
              admin_approved_by: profile.id,
              admin_approved_at: toISOStringIST()
            };
          } else {
            updateData = {
              cash_approval_status: 'approved', // Fixed: Use 'approved' instead of 'admin_approved'
              cash_approved_by: user!.id,
              cash_approved_at: toISOStringIST(),
              status: 'admin_approved',
              admin_approved_by: profile.id,
              admin_approved_at: toISOStringIST()
            };
          }
        }
      } else {
        updateData = {
          cash_approval_status: 'rejected',
          cash_rejection_reason: reason,
          status: 'rejected',
          rejected_by: profile.id,
          rejected_at: toISOStringIST(),
          rejection_reason: reason
        };
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Cash payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      fetchPayments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${action} cash payment`
      });
    }
  };

  const handleInsuranceApproval = async (paymentId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');

      let updateData: any = {};

      if (action === 'approve') {
        if (userRole === 'manager') {
          updateData = {
            insurance_approval_status: 'approved', // Fixed: Use 'approved' instead of 'manager_approved'
            insurance_approved_by: user!.id,
            insurance_approved_at: toISOStringIST(),
            status: 'manager_approved',
            manager_approved_by: profile.id,
            manager_approved_at: toISOStringIST()
          };
        } else if (userRole === 'admin') {
          if (payment?.insurance_approval_status === 'pending') {
            // Skip manager approval and go directly to admin approval
            updateData = {
              insurance_approval_status: 'approved', // Fixed: Use 'approved' instead of 'admin_approved'
              insurance_approved_by: user!.id,
              insurance_approved_at: toISOStringIST(),
              status: 'admin_approved',
              admin_approved_by: profile.id,
              admin_approved_at: toISOStringIST()
            };
          } else {
            updateData = {
              insurance_approval_status: 'approved', // Fixed: Use 'approved' instead of 'admin_approved'
              insurance_approved_by: user!.id,
              insurance_approved_at: toISOStringIST(),
              status: 'admin_approved',
              admin_approved_by: profile.id,
              admin_approved_at: toISOStringIST()
            };
          }
        }
      } else {
        updateData = {
          insurance_approval_status: 'rejected',
          insurance_rejection_reason: reason,
          status: 'rejected',
          rejected_by: profile.id,
          rejected_at: toISOStringIST(),
          rejection_reason: reason
        };
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Insurance payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      fetchPayments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${action} insurance payment`
      });
    }
  };

  // Bulk approval handler
  const handleBulkApproval = async () => {
    if (selectedForApproval.size === 0) {
      toast({
        variant: "destructive",
        title: "No Payments Selected",
        description: "Please select at least one payment to approve"
      });
      return;
    }

    const selectedPaymentsList = Array.from(selectedForApproval)
      .map(id => payments.find(p => p.id === id))
      .filter(Boolean) as Payment[];

    const cashCount = selectedPaymentsList.filter(p => (p.cash_total || 0) > 0 && p.cash_approval_status === 'pending').length;
    const insuranceCount = selectedPaymentsList.filter(p => (p.insurance_total || 0) > 0 && p.insurance_approval_status === 'pending').length;

    const confirmMsg = `You are about to approve ${selectedForApproval.size} payment(s):\n\n` +
      `• ${cashCount} Cash payment(s)\n` +
      `• ${insuranceCount} Insurance payment(s)\n\n` +
      `Do you want to proceed?`;

    if (!confirm(confirmMsg)) return;

    setSubmitting(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (const payment of selectedPaymentsList) {
        try {
          // Approve cash if present
          if ((payment.cash_total || 0) > 0 && payment.cash_approval_status === 'pending') {
            await handleCashApproval(payment.id, 'approve');
            successCount++;
          }

          // Approve insurance if present
          if ((payment.insurance_total || 0) > 0 && payment.insurance_approval_status === 'pending') {
            await handleInsuranceApproval(payment.id, 'approve');
            successCount++;
          }
        } catch (error: any) {
          errorCount++;
          errors.push(`${payment.doctors.profiles.full_name}: ${error.message}`);
        }
      }

      // Show results
      if (errorCount === 0) {
        toast({
          title: "Bulk Approval Complete",
          description: `Successfully approved ${successCount} payment(s) for ${selectedForApproval.size} doctor(s)`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Partial Success",
          description: `Approved: ${successCount}, Failed: ${errorCount}\n\nErrors:\n${errors.join('\n')}`
        });
      }

      // Clear selection and refresh
      setSelectedForApproval(new Set());
      fetchPayments();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Bulk Approval Failed",
        description: error.message || "An unexpected error occurred"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handler for checkbox selection
  const handleSelectForApproval = (paymentId: string, checked: boolean) => {
    setSelectedForApproval(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(paymentId);
      } else {
        newSet.delete(paymentId);
      }
      return newSet;
    });
  };

  // Handler for select all
  const handleSelectAllForApproval = () => {
    const allIds = waitingForApprovalPayments.map(p => p.id);
    setSelectedForApproval(new Set(allIds));
  };

  // Handler for clear all
  const handleClearAllApprovalSelection = () => {
    setSelectedForApproval(new Set());
  };

  const handleSuspectToggle = async (paymentId: string, reason?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      const payment = payments.find(p => p.id === paymentId);
      const isMarking = !payment?.is_suspect;

      const updateData = {
        is_suspect: isMarking,
        suspect_reason: isMarking ? reason : null,
        marked_suspect_by: isMarking ? profile.id : null,
        marked_suspect_at: isMarking ? toISOStringIST() : null
      };

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment ${isMarking ? 'marked as suspect' : 'unmarked as suspect'}`
      });

      setSuspectDialog(false);
      setSuspectFormData({ suspect_reason: '' });
      fetchPayments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update payment status"
      });
    }
  };

  const checkPaymentHasTransactions = async (paymentId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('id')
        .eq('payment_id', paymentId)
        .limit(1);

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking transactions:', error);
      return false;
    }
  };

  const handleEditPayment = async (payment: Payment) => {
    const hasTransactions = await checkPaymentHasTransactions(payment.id);
    
    if (hasTransactions) {
      toast({
        variant: "destructive",
        title: "Cannot Edit Payment",
        description: "This payment has transactions and cannot be edited. You can mark it as suspect instead."
      });
      return;
    }

    // Determine payment type from paymentTypeOnly or payment data
    let derivedPaymentType: 'cash' | 'insurance' = 'cash';
    if (paymentTypeOnly) {
      derivedPaymentType = paymentTypeOnly;
    } else if (payment.insurance_total && payment.insurance_total > 0 && (!payment.cash_total || payment.cash_total === 0)) {
      derivedPaymentType = 'insurance';
    }

    setFormData({
      doctor_id: payment.doctors ? '' : payment.doctors.profiles.full_name,
      payment_type_filter: derivedPaymentType,
      payment_notes: payment.payment_notes || ''
    });
    setEditingPayment(payment);
    setDialogOpen(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    const hasTransactions = await checkPaymentHasTransactions(paymentId);
    
    if (hasTransactions) {
      toast({
        variant: "destructive",
        title: "Cannot Delete Payment",
        description: "This payment has transactions and cannot be deleted. You can mark it as suspect instead."
      });
      return;
    }

    setDeletePaymentId(paymentId);
    setDeletePassword('');
    setShowDeleteDialog(true);
  };

  const confirmDeleteWithPassword = async () => {
    if (deletePassword !== '9629945305') {
      toast({
        variant: "destructive",
        title: "Incorrect Password",
        description: "The password you entered is incorrect. Deletion cancelled."
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', deletePaymentId!);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment advice deleted successfully"
      });
      
      fetchPayments();
      fetchGlobalTotals();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete payment advice"
      });
    } finally {
      setShowDeleteDialog(false);
      setDeletePaymentId(null);
      setDeletePassword('');
    }
  };

  const resetForm = () => {
    setFormData({
      doctor_id: '',
      payment_type_filter: paymentTypeOnly || 'cash',
      payment_notes: ''
    });
    setEditingPayment(null);
    setVisits([]);
    setSelectedVisitIds(new Set()); // Clear visit selections
    setExistingPendingPayments([]);
    setTargetPaymentChoice('new');
  };

  // Part Payment Handlers
  const handleOpenPartPayment = (payment: Payment) => {
    setPartPaymentTarget(payment);
    setShowPartPaymentDialog(true);
  };

  const handleOpenReleaseHistory = (payment: Payment) => {
    setPartPaymentTarget(payment);
    setShowReleaseHistoryDialog(true);
  };

  const handlePartPaymentSuccess = () => {
    fetchPayments();
    fetchGlobalTotals();
  };

  // Transaction Type Constants
  const TRANSACTION_TYPES = [
    'INTERNAL TRANSFER',
    'NEFT TRANSFER',
    'RTGS TRANSFER',
    'IMPS TRANSFER-MMID',
    'IMPS TRANSFER-IFSC'
  ];

  const TRANSACTION_TYPE_CODES: Record<string, string> = {
    'INTERNAL TRANSFER': 'INT',
    'NEFT TRANSFER': 'N06',
    'RTGS TRANSFER': 'R41',
    'IMPS TRANSFER-MMID': 'MID',
    'IMPS TRANSFER-IFSC': 'IFS'
  };

  const TRANSACTION_REQUIRES_IFSC: Record<string, boolean> = {
    'INTERNAL TRANSFER': false,
    'NEFT TRANSFER': true,
    'RTGS TRANSFER': true,
    'IMPS TRANSFER-MMID': false,
    'IMPS TRANSFER-IFSC': true
  };

  // Bank Advice Generation Functions
  const handleSelectPaymentForBankAdvice = (paymentId: string, checked: boolean) => {
    const newSelection = new Set(selectedPaymentsForBankAdvice);
    if (checked) {
      newSelection.add(paymentId);
    } else {
      newSelection.delete(paymentId);
    }
    setSelectedPaymentsForBankAdvice(newSelection);
  };

  const handleOpenBankAdviceReview = async () => {
    if (selectedPaymentsForBankAdvice.size === 0) {
      toast({
        variant: "destructive",
        title: "No Payments Selected",
        description: "Please select at least one payment to generate bank advice"
      });
      return;
    }

    setGeneratingBankAdvice(true);

    try {
      // Fetch detailed payment and doctor data
      const selectedPaymentIds = Array.from(selectedPaymentsForBankAdvice);
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          doctors!inner (
            id,
            doctor_code,
            full_name,
            ifsc_code,
            bank_account_number,
            account_holder_name,
            bank_name,
            branch_name
          )
        `)
        .in('id', selectedPaymentIds);

      if (paymentsError) throw paymentsError;

      // Validate doctor bank details
      const incompleteBankDetails: string[] = [];
      const validPayments: any[] = [];

      paymentsData?.forEach((payment: any) => {
        const doctor = payment.doctors;
        if (!doctor.bank_account_number || !doctor.account_holder_name) {
          incompleteBankDetails.push(`${doctor.full_name} (${doctor.doctor_code})`);
        } else {
          validPayments.push(payment);
        }
      });

      if (incompleteBankDetails.length > 0) {
        toast({
          variant: "destructive",
          title: "Incomplete Bank Details",
          description: `The following doctors have incomplete bank details: ${incompleteBankDetails.join(', ')}. Please update their information before generating bank advice.`
        });
        setGeneratingBankAdvice(false);
        return;
      }

      if (validPayments.length === 0) {
        toast({
          variant: "destructive",
          title: "No Valid Payments",
          description: "No payments with complete bank details found"
        });
        setGeneratingBankAdvice(false);
        return;
      }

      // Initialize transaction types with default NEFT
      const initialTypes = new Map();
      validPayments.forEach(p => {
        initialTypes.set(p.id, 'NEFT TRANSFER');
      });
      setTransactionTypeSelections(initialTypes);
      setSelectedPaymentsForReview(validPayments);
      setShowBankAdviceReviewDialog(true);
    } catch (error: any) {
      console.error('Error preparing bank advice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to prepare bank advice"
      });
    } finally {
      setGeneratingBankAdvice(false);
    }
  };

  const handlePaymentModeConfirm = async (mode: PaymentMode, chequeDetails?: ChequeDetails) => {
    if (mode === 'bank') {
      setPaymentModeDialogOpen(false);
      handleOpenBankAdviceReview();
      return;
    }

    // Cash or Cheque mode - update DB directly
    setProcessingPaymentMode(true);
    try {
      const selectedPaymentIds = Array.from(selectedPaymentsForBankAdvice);
      
      // Fetch payment data with doctor details
      const { data: paymentsData, error: fetchError } = await supabase
        .from('payments')
        .select(`
          *,
          doctors!inner (
            id, doctor_code, full_name, ifsc_code,
            bank_account_number, account_holder_name, bank_name, branch_name
          )
        `)
        .in('id', selectedPaymentIds);

      if (fetchError) throw fetchError;

      // Update each payment
      for (const payment of (paymentsData || [])) {
        const tds = calculateTDS(payment.total_amount);
        
        const updateData: any = {
          gross_amount: tds.grossAmount,
          tds_amount: tds.tdsAmount,
          tds_percentage: tds.tdsPercentage,
          net_amount: tds.netAmount,
          payment_mode: mode,
          bank_advice_generated: true,
          bank_advice_generated_at: new Date().toISOString(),
          bank_advice_generated_by: user?.id,
        };

        if (mode === 'cheque' && chequeDetails) {
          updateData.cheque_number = chequeDetails.cheque_number;
          updateData.cheque_date = chequeDetails.cheque_date;
          updateData.cheque_bank_name = chequeDetails.cheque_bank_name;
        }

        const { error: updateError } = await supabase
          .from('payments')
          .update(updateData)
          .eq('id', payment.id);

        if (updateError) throw updateError;
      }

      // Record in bank_advice_history
      const totalNetAmount = (paymentsData || []).reduce((sum, p) => {
        const tds = calculateTDS(p.total_amount);
        return sum + tds.netAmount;
      }, 0);

      const { error: historyError } = await supabase
        .from('bank_advice_history')
        .insert({
          filename: `${mode.toUpperCase()}_PAYMENT_${format(new Date(), 'yyyyMMdd_HHmmss')}`,
          payment_count: selectedPaymentIds.length,
          total_amount: totalNetAmount,
          payment_ids: selectedPaymentIds,
          payment_mode: mode,
          generated_by: user?.id,
        });

      if (historyError) {
        console.error('Error saving to history:', historyError);
      }

      toast({
        title: "Success",
        description: `${selectedPaymentIds.length} payment(s) processed as ${mode === 'cheque' ? 'cheque' : 'cash'} payment`
      });

      setSelectedPaymentsForBankAdvice(new Set());
      setPaymentModeDialogOpen(false);
      fetchPayments();
    } catch (error: any) {
      console.error('Error processing payment mode:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process payments"
      });
    } finally {
      setProcessingPaymentMode(false);
    }
  };

  const handleApplyBulkTransactionType = () => {
    const newSelections = new Map(transactionTypeSelections);
    selectedPaymentsForReview.forEach(payment => {
      newSelections.set(payment.id, bulkTransactionType);
    });
    setTransactionTypeSelections(newSelections);
    toast({
      title: "Applied",
      description: `Set all payments to ${bulkTransactionType}`
    });
  };

  const handleTransactionTypeChange = (paymentId: string, transactionType: string) => {
    const newSelections = new Map(transactionTypeSelections);
    newSelections.set(paymentId, transactionType);
    setTransactionTypeSelections(newSelections);
  };

  const generateBankAdviceTextFile = async () => {
    try {
      // Validate all selections
      const validationErrors: string[] = [];
      selectedPaymentsForReview.forEach(payment => {
        const transactionType = transactionTypeSelections.get(payment.id);
        if (!transactionType) {
          validationErrors.push(`${payment.doctors.full_name}: No transaction type selected`);
        }
        if (transactionType && TRANSACTION_REQUIRES_IFSC[transactionType] && !payment.doctors.ifsc_code) {
          validationErrors.push(`${payment.doctors.full_name}: IFSC code required for ${transactionType}`);
        }
      });

      if (validationErrors.length > 0) {
        toast({
          variant: "destructive",
          title: "Validation Errors",
          description: validationErrors.join('; ')
        });
        return;
      }

      // Generate GEFU format text file
      // Calculate totals with 10% TDS deduction
      const totalGrossAmount = selectedPaymentsForReview.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);
      const totalTDS = totalGrossAmount * 0.10; // 10% TDS
      const totalNetAmount = totalGrossAmount - totalTDS;
      
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      
      // Header line
      let fileContent = `H~${dateStr}~${websiteSettings?.hospital_institution_code || 'ABC07112007'}\n`;

      // Detail lines
      selectedPaymentsForReview.forEach((payment, index) => {
        const doctor = payment.doctors;
        const transactionType = transactionTypeSelections.get(payment.id) || 'NEFT TRANSFER';
        const transactionCode = TRANSACTION_TYPE_CODES[transactionType];
        
        // Calculate TDS for this payment
        const grossAmount = parseFloat(payment.paid_amount);
        const tdsAmount = grossAmount * 0.10; // 10% TDS
        const netAmount = grossAmount - tdsAmount;
        const amount = netAmount.toFixed(2); // Use net amount after TDS deduction
        
        const detailLine = [
          'D',                          // Record type
          transactionCode,              // Transaction Type Code (N06)
          websiteSettings?.hospital_bank_account_number || '120000794291', // Hospital Account Number
          'Westmed Healthcare Pvt Ltd', // Hospital Name (mixed case)
          'ADDRESS1',                   // Address Line 1 (literal string)
          'ADDRESS2',                   // Address Line 2 (literal string)
          'ADDRESS3',                   // Address Line 3 (literal string)
          doctor.ifsc_code || '',       // Beneficiary IFSC Code
          doctor.bank_account_number,   // Beneficiary Account Number
          doctor.account_holder_name,   // Beneficiary Name
          '',                           // Empty
          '',                           // Empty
          '',                           // Empty
          '',                           // Empty
          index + 1,                    // Sequence Number
          dateStr,                      // Transaction Date
          amount,                       // Amount
          'CONSULTING CHARGES',         // Sender To Receiver Info
          '',                           // Empty
          '',                           // Empty
          '',                           // Empty
          ''                            // Empty
        ].join('~');
        
        fileContent += detailLine + '\n';
      });

      // Footer line (use net amount after TDS)
      fileContent += `F~${selectedPaymentsForReview.length}~${totalNetAmount.toFixed(2)}`;

      // Generate filename with new format: DDMMYY-X.txt
      const filenameDateStr = format(new Date(), 'ddMMyy');
      const paymentCount = selectedPaymentsForReview.length;
      const filename = `${filenameDateStr}-${paymentCount}.txt`;
      
      // Store bank advice generation in history (store net amount after TDS)
      const { error: historyError } = await supabase
        .from('bank_advice_history')
        .insert({
          filename: filename,
          generation_date: new Date().toISOString().split('T')[0],
          payment_count: paymentCount,
          total_amount: totalNetAmount, // Store net amount after TDS deduction
          payment_ids: selectedPaymentsForReview.map(p => p.id),
          generated_by: user?.id,
          file_content: fileContent
        });
      
      if (historyError) {
        console.error('Error saving bank advice history:', historyError);
        // Continue with download even if history save fails
      }

      // Update each payment with TDS details in database
      for (const payment of selectedPaymentsForReview) {
        const grossAmount = parseFloat(payment.paid_amount);
        const tdsAmount = grossAmount * 0.10;
        const netAmount = grossAmount - tdsAmount;
        
        await supabase
          .from('payments')
          .update({
            gross_amount: grossAmount,
            tds_amount: tdsAmount,
            tds_percentage: 10.0,
            net_amount: netAmount
          })
          .eq('id', payment.id);
      }

      // Create and download file
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Mark payments as bank advice generated
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          bank_advice_generated: true,
          bank_advice_generated_at: toISOStringIST(),
          bank_advice_generated_by: user?.id
        })
        .in('id', selectedPaymentsForReview.map(p => p.id));

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `Bank advice text file generated for ${selectedPaymentsForReview.length} payment(s) and marked as processed`
      });

      // Clear selection and refresh
      setSelectedPaymentsForBankAdvice(new Set());
      setShowBankAdviceReviewDialog(false);
      fetchPayments();

    } catch (error: any) {
      console.error('Error generating bank advice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate bank advice text file"
      });
    }
  };

  const generateBankAdviceExcel = async () => {
    if (selectedPaymentsForBankAdvice.size === 0) {
      toast({
        variant: "destructive",
        title: "No Payments Selected",
        description: "Please select at least one payment to generate bank advice"
      });
      return;
    }

    setGeneratingBankAdvice(true);

    try {
      // Fetch detailed payment and doctor data
      const selectedPaymentIds = Array.from(selectedPaymentsForBankAdvice);
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          doctors!inner (
            id,
            doctor_code,
            full_name,
            ifsc_code,
            bank_account_number,
            account_holder_name,
            bank_name
          )
        `)
        .in('id', selectedPaymentIds);

      if (paymentsError) throw paymentsError;

      // Validate doctor bank details
      const incompleteBankDetails: string[] = [];
      const validPayments: any[] = [];

      paymentsData?.forEach((payment: any) => {
        const doctor = payment.doctors;
        if (!doctor.ifsc_code || !doctor.bank_account_number || !doctor.account_holder_name) {
          incompleteBankDetails.push(`${doctor.full_name} (${doctor.doctor_code})`);
        } else {
          validPayments.push(payment);
        }
      });

      if (incompleteBankDetails.length > 0) {
        toast({
          variant: "destructive",
          title: "Incomplete Bank Details",
          description: `The following doctors have incomplete bank details: ${incompleteBankDetails.join(', ')}. Please update their information before generating bank advice.`
        });
        setGeneratingBankAdvice(false);
        return;
      }

      if (validPayments.length === 0) {
        toast({
          variant: "destructive",
          title: "No Valid Payments",
          description: "No payments with complete bank details found"
        });
        setGeneratingBankAdvice(false);
        return;
      }

      // Calculate totals with 10% TDS deduction
      const totalGrossAmount = validPayments.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);
      const totalTDS = totalGrossAmount * 0.10; // 10% TDS
      const totalNetAmount = totalGrossAmount - totalTDS;
      const recordCount = validPayments.length;
      const today = formatReportDateIST();

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Header rows (show net amount after TDS)
      const headerData = [
        ['Canara Bank Bulk Upload Sheet', '', '', 'Bulk Upload Date*', 'Net Amount (After TDS)*', 'Record Count*'],
        ['', '', '', today, totalNetAmount.toFixed(2), recordCount],
        ['Debiting Account No*', '124578326598', 'Ordering Customer Name*', 'Westmed Hospital', 'Address Line 1*', 'Hospital Address', 'Address Line 2', '', 'Address Line 3', ''],
        [],
        ['Seq', 'Transaction Type*', 'Bene IFSC Code*', 'Bene A/C No.*', 'Bene Name*', 'Bene Add Line 1', 'Bene Add Line 2', 'Bene Add Line 3', 'Bene e-mail ID', 'Txn Ref No*', 'Gross Amount', 'TDS (10%)', 'Net Amount*', 'Sender To Rcvr Info*', 'Add Info 1', 'Add Info 2', 'Add Info 3', 'Beneficiary LEI Code']
      ];

      // Data rows with TDS calculation
      const dataRows = validPayments.map((payment, index) => {
        const doctor = payment.doctors;
        const grossAmount = parseFloat(payment.paid_amount);
        const tdsAmount = grossAmount * 0.10; // 10% TDS
        const netAmount = grossAmount - tdsAmount;
        
        return [
          index + 1, // Seq
          'NEFT TRANSFER', // Transaction Type
          doctor.ifsc_code, // Bene IFSC Code
          doctor.bank_account_number, // Bene A/C No.
          doctor.account_holder_name, // Bene Name
          '', // Bene Add Line 1
          '', // Bene Add Line 2
          '', // Bene Add Line 3
          '', // Bene e-mail ID
          index + 1, // Txn Ref No
          grossAmount.toFixed(2), // Gross Amount
          tdsAmount.toFixed(2), // TDS (10%)
          netAmount.toFixed(2), // Net Amount (what gets transferred)
          'westmed Hospital', // Sender To Rcvr Info
          '', // Add Info 1
          '', // Add Info 2
          '', // Add Info 3
          '' // Beneficiary LEI Code
        ];
      });

      // Combine all rows
      const wsData = [...headerData, ...dataRows];

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Bank Upload');

      // Generate filename with timestamp
      const timestamp = formatFileTimestampIST();
      const filename = `bank_advice_${timestamp}.xls`;

      // Save file
      XLSX.writeFile(wb, filename);

      // Mark payments as bank advice generated
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          bank_advice_generated: true,
          bank_advice_generated_at: toISOStringIST(),
          bank_advice_generated_by: user?.id
        })
        .in('id', validPayments.map(p => p.id));

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `Bank advice Excel generated for ${validPayments.length} payment(s) and marked as processed`
      });

      // Clear selection and refresh payments
      setSelectedPaymentsForBankAdvice(new Set());
      fetchPayments();

    } catch (error: any) {
      console.error('Error generating bank advice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate bank advice Excel"
      });
    } finally {
      setGeneratingBankAdvice(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'manager_approved': return 'outline';
      case 'admin_approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'manager_approved': return <AlertCircle className="h-3 w-3" />;
      case 'admin_approved': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <X className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading payment data..." />;
  }

  // PaymentCard component
  const PaymentCard = ({ payment }: { payment: Payment & { profiles?: { full_name: string } } }) => (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {payment.profiles?.full_name || payment.doctors?.profiles?.full_name || 'Unknown Doctor'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatDateIST(payment.period_start).split(',')[0].replace(' ', ' ')} - {formatDateIST(payment.period_end)}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {payment.is_suspect && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                SUSPECT
              </Badge>
            )}
            <Badge
              variant={
                payment.status === 'pending' ? 'secondary' :
                payment.status === 'manager_approved' ? 'outline' :
                payment.status === 'admin_approved' ? 'default' :
                'destructive'
              }
            >
              {payment.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Visits</p>
            <p className="text-xl font-semibold">{payment.total_visits}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-xl font-semibold text-primary">{formatCurrency(payment.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Paid Amount</p>
            <p className="text-xl font-semibold text-success">{formatCurrency(payment.paid_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="text-xl font-semibold text-warning">{formatCurrency(payment.remaining_amount)}</p>
          </div>
        </div>

        {/* Payment Progress Bar */}
        <div className="mb-4">
          <ProgressBar
            value={payment.paid_amount}
            max={payment.total_amount}
            variant={payment.is_fully_paid ? 'success' : 'default'}
            showLabel={true}
            size="md"
          />
        </div>

        {/* Payment Type Breakdown */}
        {(payment.cash_total !== undefined || payment.insurance_total !== undefined) && (
          <div className="border-t pt-4 mb-4">
            <h4 className="text-sm font-semibold mb-3">Payment Type Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cash Payment Section */}
              {(payment.cash_total || 0) > 0 && (
                <div className="flex flex-col p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Cash Payments</p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(payment.cash_total || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {payment.cash_visits || 0} visit{payment.cash_visits !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        Cash
                      </Badge>
                      {payment.cash_approval_status && (
                        <Badge 
                          variant={
                            payment.cash_approval_status === 'pending' ? 'secondary' :
                            payment.cash_approval_status === 'manager_approved' ? 'outline' :
                            payment.cash_approval_status === 'admin_approved' ? 'default' :
                            'destructive'
                          }
                          className="text-xs"
                        >
                          {payment.cash_approval_status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {payment.cash_rejection_reason && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                      <strong>Rejection:</strong> {payment.cash_rejection_reason}
                    </div>
                  )}
                </div>
              )}
              
              {/* Insurance Payment Section */}
              {(payment.insurance_total || 0) > 0 && (
                <div className="flex flex-col p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Insurance Payments</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                        {formatCurrency(payment.insurance_total || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {payment.insurance_visits || 0} visit{payment.insurance_visits !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Insurance
                      </Badge>
                      {payment.insurance_approval_status && (
                        <Badge 
                          variant={
                            payment.insurance_approval_status === 'pending' ? 'secondary' :
                            payment.insurance_approval_status === 'manager_approved' ? 'outline' :
                            payment.insurance_approval_status === 'admin_approved' ? 'default' :
                            'destructive'
                          }
                          className="text-xs"
                        >
                          {payment.insurance_approval_status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {payment.insurance_rejection_reason && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                      <strong>Rejection:</strong> {payment.insurance_rejection_reason}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t pt-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {/* View Transactions Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPayment(payment);
                fetchTransactions(payment.id);
                setTransactionsDialog(true);
              }}
            >
              <History className="h-4 w-4 mr-1" />
              View Transactions
            </Button>

            {/* Manager/Admin Actions */}
            {(userRole === 'manager' || userRole === 'admin') && (
              <>
                {/* Cash Approval Section */}
                {(payment.cash_total || 0) > 0 && payment.cash_approval_status && (
                  <>
                    {payment.cash_approval_status === 'pending' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleCashApproval(payment.id, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve Cash
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-600 text-emerald-600"
                          onClick={() => {
                            const reason = prompt('Enter cash rejection reason:');
                            if (reason) handleCashApproval(payment.id, 'reject', reason);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject Cash
                        </Button>
                      </>
                    )}
                    
                    {userRole === 'admin' && payment.cash_approval_status === 'manager_approved' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleCashApproval(payment.id, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Final Approve Cash
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-600 text-emerald-600"
                          onClick={() => {
                            const reason = prompt('Enter cash rejection reason:');
                            if (reason) handleCashApproval(payment.id, 'reject', reason);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject Cash
                        </Button>
                      </>
                    )}
                  </>
                )}

                {/* Insurance Approval Section */}
                {(payment.insurance_total || 0) > 0 && payment.insurance_approval_status && (
                  <>
                    {payment.insurance_approval_status === 'pending' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleInsuranceApproval(payment.id, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve Insurance
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-600 text-blue-600"
                          onClick={() => {
                            const reason = prompt('Enter insurance rejection reason:');
                            if (reason) handleInsuranceApproval(payment.id, 'reject', reason);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject Insurance
                        </Button>
                      </>
                    )}
                    
                    {userRole === 'admin' && payment.insurance_approval_status === 'manager_approved' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleInsuranceApproval(payment.id, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Final Approve Insurance
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-600 text-blue-600"
                          onClick={() => {
                            const reason = prompt('Enter insurance rejection reason:');
                            if (reason) handleInsuranceApproval(payment.id, 'reject', reason);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject Insurance
                        </Button>
                      </>
                    )}
                  </>
                )}

                {/* Edit/Delete buttons for pending payments */}
                {payment.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPayment(payment)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePayment(payment.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </>
                )}

                {/* Suspect marking */}
                <Button
                  variant={payment.is_suspect ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!payment.is_suspect) {
                      setSelectedPayment(payment);
                      setSuspectDialog(true);
                    } else {
                      handleSuspectToggle(payment.id);
                    }
                  }}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {payment.is_suspect ? 'Remove Suspect' : 'Mark Suspect'}
                </Button>
              </>
            )}

            {/* Admin Payment Recording */}
            {userRole === 'admin' && payment.status === 'admin_approved' && !payment.is_fully_paid && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setSelectedPayment(payment);
                  setPaymentFormData({ amount: payment.remaining_amount, transaction_reference: '', notes: '' });
                  setPaymentAmountError('');
                  setPaymentDialog(true);
                }}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Record Payment
              </Button>
            )}
          </div>
        </div>
        
        {payment.is_fully_paid && (
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Transaction Details
              </h4>
              {payment.bank_advice_generated && (
                <Badge variant="default" className="text-xs bg-blue-600">
                  <Building2 className="h-3 w-3 mr-1" />
                  Bank Advice Generated
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {payment.admin_approved_at && (
                <div>
                  <span className="text-muted-foreground">Processed Date:</span>
                  <span className="ml-2 font-medium">
                    {formatDateTimeIST(payment.admin_approved_at)}
                  </span>
                </div>
              )}
              {payment.bank_advice_generated_at && (
                <div>
                  <span className="text-muted-foreground">Bank Advice Generated:</span>
                  <span className="ml-2 font-medium">
                    {formatDateTimeIST(payment.bank_advice_generated_at)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Transaction Ref:</span>
                <span className="ml-2 font-medium">{payment.id.slice(-8).toUpperCase()}</span>
              </div>
            </div>
          </div>
        )}
        
        {payment.payment_notes && (
          <div className="border-t pt-3 mt-3">
            <p className="text-sm text-muted-foreground">Notes:</p>
            <p className="text-sm">{payment.payment_notes}</p>
          </div>
        )}

        {payment.suspect_reason && (
          <div className="border-t pt-3 mt-3 bg-destructive/10 p-3 rounded">
            <p className="text-sm text-destructive font-medium">Suspect Reason:</p>
            <p className="text-sm text-destructive">{payment.suspect_reason}</p>
          </div>
        )}

        {payment.rejection_reason && (
          <div className="border-t pt-3 mt-3 bg-destructive/10 p-3 rounded">
            <p className="text-sm text-destructive font-medium">Rejection Reason:</p>
            <p className="text-sm text-destructive">{payment.rejection_reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Filter payments by payment type
  // Search filter function
  const filterPayments = (paymentList: Payment[], term: string, filter: string) => {
    if (!term.trim()) return paymentList;
    
    const lowerTerm = term.toLowerCase().trim();
    
    return paymentList.filter(payment => {
      switch (filter) {
        case 'doctor_name':
          return payment.doctors?.profiles?.full_name?.toLowerCase().includes(lowerTerm);
        
        case 'doctor_code':
          return payment.doctors?.doctor_code?.toLowerCase().includes(lowerTerm);
        
        case 'patient_name':
          return payment.patient_names?.some(name => 
            name.toLowerCase().includes(lowerTerm)
          );
        
        case 'insurance_name':
          return payment.insurance_company_names?.some(company => 
            company.toLowerCase().includes(lowerTerm)
          );
        
        case 'all':
        default:
          // Search across all fields
          return (
            payment.doctors?.profiles?.full_name?.toLowerCase().includes(lowerTerm) ||
            payment.doctors?.doctor_code?.toLowerCase().includes(lowerTerm) ||
            payment.patient_names?.some(name => name.toLowerCase().includes(lowerTerm)) ||
            payment.insurance_company_names?.some(company => company.toLowerCase().includes(lowerTerm))
          );
      }
    });
  };

  const filterPaymentsByType = (paymentList: Payment[]) => {
    // If paymentTypeOnly is set, always filter by that type regardless of paymentTypeFilter
    const effectiveFilter = paymentTypeOnly || paymentTypeFilter;
    
    if (effectiveFilter === 'all') return paymentList;
    
    return paymentList.filter(payment => {
      const hasCash = (payment.cash_total || 0) > 0;
      const hasInsurance = (payment.insurance_total || 0) > 0;
      
      // More flexible: show payment if it contains the selected type
      // This handles both pure and mixed payments gracefully
      if (effectiveFilter === 'cash') return hasCash;
      if (effectiveFilter === 'insurance') return hasInsurance;
      if (effectiveFilter === 'mixed') return hasCash && hasInsurance;
      return true;
    });
  };

  // Filter payments for tabs - include if either cash or insurance needs approval
  const waitingForApprovalPayments = filterPaymentsByType(payments.filter(p => {
    const cashNeedsApproval = p.cash_approval_status && 
      (p.cash_approval_status === 'pending' || p.cash_approval_status === 'manager_approved');
    const insuranceNeedsApproval = p.insurance_approval_status && 
      (p.insurance_approval_status === 'pending' || p.insurance_approval_status === 'manager_approved');
    
    return (cashNeedsApproval || insuranceNeedsApproval) && !p.is_fully_paid;
  }));
  const fullyPaidPayments = filterPaymentsByType(payments.filter(p => p.is_fully_paid && !p.bank_advice_generated));
  const processedPayments = filterPaymentsByType(payments.filter(p => p.bank_advice_generated === true));

  // Report generation configuration
  const paymentReportColumns = [
    { key: 'doctors.profiles.full_name', label: 'Doctor Name' },
    { key: 'doctors.doctor_code', label: 'Doctor Code' },
    { key: 'period_start', label: 'Period Start Date', format: (value: string) => formatDateIST(value) },
    { key: 'period_end', label: 'Period End Date', format: (value: string) => formatDateIST(value) },
    { key: 'total_visits', label: 'Total Visits' },
    { key: 'total_amount', label: 'Total Amount', format: (value: number) => formatCurrency(value) },
    { key: 'paid_amount', label: 'Paid Amount', format: (value: number) => formatCurrency(value) },
    { key: 'remaining_amount', label: 'Remaining Amount', format: (value: number) => formatCurrency(value) },
    { key: 'is_fully_paid', label: 'Fully Paid Status', format: (value: boolean) => value ? 'Yes' : 'No' },
    { key: 'status', label: 'Status', format: (value: string) => value.replace('_', ' ').toUpperCase() },
    { key: 'payment_notes', label: 'Payment Notes' },
    { key: 'manager_approved_at', label: 'Manager Approved Date & Time', format: (value: string) => value ? formatDateTimeIST(value) : 'N/A' },
    { key: 'admin_approved_at', label: 'Admin Approved Date & Time', format: (value: string) => value ? formatDateTimeIST(value) : 'N/A' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {paymentTypeOnly === 'cash' ? 'Cash Payment Management' : 
             paymentTypeOnly === 'insurance' ? 'Insurance Payment Management' : 
             'Payment Management'}
          </h1>
          <p className="text-muted-foreground">
            {paymentTypeOnly === 'cash' ? 'Manage cash payment advice and transactions' :
             paymentTypeOnly === 'insurance' ? 'Manage insurance payment advice and transactions' :
             'Manage doctor payment advice and transactions'}
          </p>
        </div>
        
        {(userRole === 'admin' || userRole === 'manager') && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (open) {
              resetForm();
              setEditingPayment(null);
            }
            setDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Payment Advice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4">
              <DialogHeader>
                <DialogTitle>
                  {editingPayment ? 'Edit Payment Advice' : 'Create Payment Advice'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="doctor_id">Doctor</Label>
                    <Select 
                      value={formData.doctor_id} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, doctor_id: value });
                        // Auto-fetch if payment type is already selected
                        if (formData.payment_type_filter) {
                          fetchUnprocessedVisits(value, formData.payment_type_filter);
                        }
                      }}
                    >
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

                  <div className="space-y-1.5">
                    <Label htmlFor="payment_type_filter">Payment Type</Label>
                    <Select 
                      value={formData.payment_type_filter} 
                      onValueChange={(value: 'cash' | 'insurance') => {
                        setFormData({ ...formData, payment_type_filter: value });
                        // Auto-fetch visits when both doctor and payment type are selected
                        if (formData.doctor_id) {
                          fetchUnprocessedVisits(formData.doctor_id, value);
                        }
                      }}
                      disabled={!!paymentTypeOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.payment_type_filter === 'cash' ? 'Cash Only' : 'Insurance Only'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Only</SelectItem>
                        <SelectItem value="insurance">Insurance Only</SelectItem>
                      </SelectContent>
                    </Select>
                    {paymentTypeOnly && (
                      <p className="text-xs text-muted-foreground">
                        This component is restricted to {paymentTypeOnly} payments only
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payment_notes">Payment Notes (Optional)</Label>
                  <Textarea
                    id="payment_notes"
                    value={formData.payment_notes}
                    onChange={(e) => setFormData({ ...formData, payment_notes: e.target.value })}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Target Payment Selector - only show when there are existing pending payments */}
                {existingPendingPayments.length > 0 && visits.length > 0 && (
                  <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                    <Label htmlFor="target_payment">Target Payment</Label>
                    <Select 
                      value={targetPaymentChoice} 
                      onValueChange={setTargetPaymentChoice}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target payment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span>Create New {formData.payment_type_filter === 'cash' ? 'Cash' : 'Insurance'} Payment Advice</span>
                          </div>
                        </SelectItem>
                        {existingPendingPayments.map((payment) => {
                          const typeAmount = formData.payment_type_filter === 'cash' ? payment.cash_total : payment.insurance_total;
                          const typeVisits = formData.payment_type_filter === 'cash' ? payment.cash_visits : payment.insurance_visits;
                          return (
                            <SelectItem key={payment.id} value={payment.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Period: {formatDateIST(payment.period_start)} → {formatDateIST(payment.period_end)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formData.payment_type_filter === 'cash' ? 'Cash' : 'Insurance'}: {formatCurrency(typeAmount || 0)} ({typeVisits || 0} {typeVisits === 1 ? 'visit' : 'visits'})
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {targetPaymentChoice === 'new' 
                        ? 'A new payment advice will be created with the visits below'
                        : 'The visits below will be added to the selected existing payment'}
                    </p>
                  </div>
                )}

                {visits.length > 0 && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    {/* Header with Selection Controls */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-success" />
                          Unprocessed Visits Found ({visits.length})
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllVisits}
                            disabled={selectedVisitIds.size === visits.length}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleClearAllVisits}
                            disabled={selectedVisitIds.size === 0}
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Selected: {selectedVisitIds.size} of {visits.length}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(
                            visits
                              .filter(v => selectedVisitIds.has(v.id))
                              .reduce((sum, visit) => sum + (visit.visit_payment || 0), 0)
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {/* Visit Cards with Checkboxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                      {visits.map((visit) => {
                        const isSelected = selectedVisitIds.has(visit.id);
                        return (
                          <Card 
                            key={visit.id} 
                            className={`bg-background cursor-pointer transition-all ${
                              isSelected 
                                ? 'ring-2 ring-primary border-primary' 
                                : 'hover:border-primary/50'
                            }`}
                            onClick={() => handleToggleVisit(visit.id)}
                          >
                            <CardContent className="p-3">
                              <div className="space-y-1">
                                {/* Checkbox */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                                        isSelected 
                                          ? 'bg-primary border-primary' 
                                          : 'border-muted-foreground'
                                      }`}
                                    >
                                      {isSelected && (
                                        <CheckCircle className="h-4 w-4 text-primary-foreground" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <Badge variant="outline" className="text-xs">
                                      {visit.patient_count} {visit.patient_count === 1 ? 'Patient' : 'Patients'}
                                    </Badge>
                                    <Badge 
                                      className={`text-xs ${
                                        visit.payment_type === 'cash' 
                                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      }`}
                                    >
                                      {visit.payment_type === 'cash' ? 'Cash' : 'Insurance'}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* Visit Details */}
                                <div className="flex justify-between items-start">
                                  <p className="font-medium text-sm">
                                    {formatDateIST(visit.visit_date)}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {visit.patient_name}
                                </p>
                                {visit.insurance_companies && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    {visit.insurance_companies.company_name}
                                  </p>
                                )}
                                <div className="flex justify-between items-center">
                                  <span className="text-xs capitalize">{visit.visit_reason.replace('_', ' ')}</span>
                                  {visit.visit_payment && (
                                    <span className="text-sm font-semibold text-primary">
                                      ₹{visit.visit_payment}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    
                    {/* Warning if no visits selected */}
                    {selectedVisitIds.size === 0 && (
                      <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-warning" />
                        <p className="text-sm text-warning-foreground">
                          Please select at least one visit to create a payment advice
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* No visits message */}
                {visits.length === 0 && formData.doctor_id && formData.payment_type_filter && (
                  <div className="border rounded-lg p-6 bg-muted/30 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No unprocessed {formData.payment_type_filter} visits found for this doctor.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All visits may already be included in existing payment requests.
                    </p>
                  </div>
                )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting || visits.length === 0 || selectedVisitIds.size === 0}>
                      {submitting 
                        ? (targetPaymentChoice === 'new' ? 'Creating...' : 'Adding...') 
                        : (targetPaymentChoice === 'new' 
                            ? `Create Payment Advice (${selectedVisitIds.size} visit${selectedVisitIds.size !== 1 ? 's' : ''})` 
                            : `Add to Existing Payment (${selectedVisitIds.size} visit${selectedVisitIds.size !== 1 ? 's' : ''})`
                          )
                      }
                    </Button>
                  </DialogFooter>
               </form>
             </DialogContent>
           </Dialog>
         )}
       </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-center">
            <p className="text-lg font-medium">Loading payments...</p>
            <p className="text-sm text-muted-foreground">Please wait while we fetch your data</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Search Section */}
          <Card className="mb-4">
            <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
              <div className="flex flex-col gap-4">
                {/* Search Input with Autocomplete */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder={searchFilter === 'all' ? "Search payments..." : `Search by ${searchFilter.replace('_', ' ')}...`}
                    value={searchTerm}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchTerm(val);
                      debouncedFetchSuggestions(val, searchFilter);
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    className="pl-9"
                  />
                  {/* Suggestions Dropdown */}
                  {showSuggestions && (
                    <div
                      ref={suggestionsRef}
                      className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md max-h-[200px] overflow-y-auto"
                    >
                      {loadingSuggestions ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
                      ) : (
                        suggestions.map((s, i) => (
                          <button
                            key={i}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSearchTerm(s);
                              setShowSuggestions(false);
                              setSuggestions([]);
                            }}
                          >
                            {s}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                {/* Search Filter Buttons */}
                <div className="flex gap-2 items-center overflow-x-auto pb-1 -mx-1 px-1">
                  <span className="text-sm text-muted-foreground mr-1 shrink-0">Filter:</span>
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
                  {/* Only show Insurance Company filter for insurance payments */}
                  {paymentTypeOnly !== 'cash' && (
                    <Button
                      variant={searchFilter === 'insurance_name' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSearchFilter('insurance_name')}
                    >
                      Insurance Company
                    </Button>
                  )}
                  
                  {/* Clear Button */}
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setSearchFilter('all');
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="ml-auto"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              
                {/* Search Results Count */}
                {searchTerm && (
                  <div className="text-sm text-muted-foreground">
                    Found {filterPayments(filterPaymentsByType(payments), searchTerm, searchFilter).length} result{filterPayments(filterPaymentsByType(payments), searchTerm, searchFilter).length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Payment Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 animate-fade-in">
            <StatsCard
              title="Total Pending"
              value={formatCurrency(totalPending)}
              subtitle="Yet to be paid"
              icon={IndianRupee}
              variant="warning"
            />
            
            <StatsCard
              title="Total Paid"
              value={formatCurrency(totalPaid)}
              subtitle="All transactions"
              icon={CheckCircle}
              variant="success"
            />
            
            <StatsCard
              title="Awaiting Approval"
              value={waitingForApprovalPayments.length}
              subtitle={`${formatCurrency(waitingForApprovalPayments.reduce((sum, p) => sum + p.remaining_amount, 0))} pending`}
              icon={Clock}
              variant="info"
            />

            {userRole === 'doctor' && (
              <StatsCard
                title="TDS Deducted (Current FY)"
                value={formatCurrency(
                  payments
                    .filter(p => p.bank_advice_generated)
                    .reduce((sum, p) => sum + (p.tds_amount || (p.gross_amount || p.paid_amount) * 0.10), 0)
                )}
                subtitle="10% TDS on gross amount"
                icon={FileText}
                variant="warning"
              />
            )}
          </div>

          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <TabsList className={`w-full max-w-4xl overflow-x-auto flex ${userRole === 'doctor' ? '' : ''}`}>
            <TabsTrigger value="waiting" className="text-xs md:text-sm whitespace-nowrap">
              <span className="hidden md:inline">Waiting for Approval</span>
              <span className="md:hidden">Approval</span>
              {' '}({waitingForApprovalPayments.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="text-xs md:text-sm whitespace-nowrap">
              <span className="hidden md:inline">Waiting for bank approval</span>
              <span className="md:hidden">Bank</span>
              {' '}({fullyPaidPayments.length})
            </TabsTrigger>
            {userRole === 'doctor' && (
              <TabsTrigger value="processed" className="text-xs md:text-sm whitespace-nowrap">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Processed Payment</span>
                <span className="md:hidden">Processed</span>
                {' '}({processedPayments.length})
              </TabsTrigger>
            )}
            {userRole === 'admin' && (
              <TabsTrigger value="bankadvice" className="text-xs md:text-sm whitespace-nowrap">
                <Building2 className="h-4 w-4 mr-1" />
                Bank Advice ({payments.filter(p => p.is_fully_paid && !p.bank_advice_generated).length})
              </TabsTrigger>
            )}
            {userRole === 'admin' && (
              <TabsTrigger value="history" className="text-xs md:text-sm whitespace-nowrap">
                <History className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Bank Advice History</span>
                <span className="md:hidden">History</span>
              </TabsTrigger>
            )}
          </TabsList>
            
            {/* Payment Type Filter - Only show if not restricted to a specific type */}
            {!paymentTypeOnly && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Filter by Type:</Label>
                <Select value={paymentTypeFilter} onValueChange={(value: any) => setPaymentTypeFilter(value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="cash">Cash Only</SelectItem>
                    <SelectItem value="insurance">Insurance Only</SelectItem>
                    <SelectItem value="mixed">Mixed (Both)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <TabsContent value="waiting" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
                <h3 className="text-base md:text-lg font-semibold">Payments Waiting for Approval</h3>
                
                {/* Bulk Approval Controls */}
                {waitingForApprovalPayments.length > 0 && (userRole === 'admin' || userRole === 'manager') && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="px-3 py-1">
                      {selectedForApproval.size} selected
                    </Badge>
                    
                    {selectedForApproval.size > 0 ? (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-success hover:bg-success/90"
                          onClick={handleBulkApproval}
                          disabled={submitting}
                        >
                          <CheckCircle className="h-4 w-4 mr-1 md:mr-2" />
                          <span className="hidden md:inline">Approve All</span>
                          <span className="md:hidden">Approve</span>
                          {' '}({selectedForApproval.size})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearAllApprovalSelection}
                        >
                          Clear
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllForApproval}
                      >
                        Select All ({waitingForApprovalPayments.length})
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {waitingForApprovalPayments.length > 0 && (userRole === 'admin' || userRole === 'manager') && (
                <ReportGeneration
                  title="Payments Waiting for Approval Report"
                  data={waitingForApprovalPayments}
                  columns={paymentReportColumns}
                  filename="payment_waiting_approval_report"
                />
              )}
            </div>
            <PaymentManagementTable
              payments={filterPayments(waitingForApprovalPayments, searchTerm, searchFilter)}
              userRole={userRole}
              onApprove={(paymentId) => handleApproval(paymentId, 'approve')}
              onReject={(paymentId) => {
                const reason = prompt('Enter rejection reason:');
                if (reason) handleApproval(paymentId, 'reject', reason);
              }}
              onEdit={handleEditPayment}
              onDelete={handleDeletePayment}
              onMarkSuspect={(payment) => {
                if (!payment.is_suspect) {
                  setSelectedPayment(payment);
                  setSuspectDialog(true);
                } else {
                  handleSuspectToggle(payment.id);
                }
              }}
              onRecordPayment={(payment) => {
                setSelectedPayment(payment);
                setPaymentFormData({ amount: payment.remaining_amount, transaction_reference: '', notes: '' });
                setPaymentDialog(true);
              }}
              onViewTransactions={(payment) => {
                setSelectedPayment(payment);
                fetchTransactions(payment.id);
                setTransactionsDialog(true);
              }}
              onPartPayment={handleOpenPartPayment}
              onViewReleaseHistory={handleOpenReleaseHistory}
              showApprovalCheckbox={(userRole === 'admin' || userRole === 'manager')}
              selectedForApproval={selectedForApproval}
              onSelectForApproval={handleSelectForApproval}
            />
            
            {waitingForApprovalPayments.length === 0 && !loading && (
              <EmptyState
                icon={Clock}
                title="No Payments Waiting"
                description={
                  userRole === 'doctor' 
                    ? `No ${paymentTypeOnly ? paymentTypeOnly : ''} payments are currently waiting for approval. Your payments will appear here once they are created by the admin or manager.`
                    : 'Create a payment advice to get started. All pending payments will appear here for approval.'
                }
                action={
                  (userRole === 'admin' || userRole === 'manager') ? {
                    label: 'Create Payment Advice',
                    onClick: () => setDialogOpen(true)
                  } : undefined
                }
              />
            )}
          </TabsContent>

          <TabsContent value="paid" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Waiting for Bank Approval</h3>
              {fullyPaidPayments.length > 0 && (userRole === 'admin' || userRole === 'manager') && (
                <ReportGeneration
                  title="Waiting for Bank Approval Report"
                  data={fullyPaidPayments}
                  columns={paymentReportColumns}
                  filename="payment_waiting_bank_approval_report"
                />
              )}
            </div>
            <PaymentManagementTable
              payments={filterPayments(fullyPaidPayments, searchTerm, searchFilter)}
              userRole={userRole}
              onApprove={(paymentId) => handleApproval(paymentId, 'approve')}
              onReject={(paymentId) => {
                const reason = prompt('Enter rejection reason:');
                if (reason) handleApproval(paymentId, 'reject', reason);
              }}
              onViewTransactions={(payment) => {
                setSelectedPayment(payment);
                fetchTransactions(payment.id);
                setTransactionsDialog(true);
              }}
              onPartPayment={handleOpenPartPayment}
              onViewReleaseHistory={handleOpenReleaseHistory}
            />
            
            {fullyPaidPayments.length === 0 && !loading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Payments Awaiting Bank Approval</h3>
                  <p className="text-muted-foreground">
                    {userRole === 'doctor' 
                      ? `No ${paymentTypeOnly ? paymentTypeOnly : ''} payments waiting for bank approval.`
                      : 'Payments awaiting bank approval will appear here.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Processed Payment Tab - Doctor Only */}
          {userRole === 'doctor' && (
            <TabsContent value="processed" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Processed Payments (Bank Approved)</h3>
                {processedPayments.length > 0 && (
                  <ReportGeneration
                    title="Processed Payments Report"
                    data={processedPayments}
                    columns={paymentReportColumns}
                    filename="payment_processed_report"
                  />
                )}
              </div>
              
              <PaymentManagementTable
                payments={filterPayments(processedPayments, searchTerm, searchFilter)}
                userRole={userRole}
                onApprove={(paymentId) => handleApproval(paymentId, 'approve')}
                onReject={(paymentId) => {
                  const reason = prompt('Enter rejection reason:');
                  if (reason) handleApproval(paymentId, 'reject', reason);
                }}
                onViewTransactions={(payment) => {
                  setSelectedPayment(payment);
                  fetchTransactions(payment.id);
                  setTransactionsDialog(true);
                }}
                onPartPayment={handleOpenPartPayment}
                onViewReleaseHistory={handleOpenReleaseHistory}
              />
              
              {processedPayments.length === 0 && !loading && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-semibold mb-2">No Processed Payments Yet</h3>
                    <p className="text-muted-foreground">
                      {paymentTypeOnly 
                        ? `Your ${paymentTypeOnly} payments that have been bank approved will appear here.`
                        : 'Your payments that have been bank approved will appear here.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Bank Advice Tab */}
          {userRole === 'admin' && (
            <TabsContent value="bankadvice" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Bank Advice Generation</h3>
                  <p className="text-sm text-muted-foreground">
                    Select payments to generate bank upload Excel file. Only showing fully paid payments without bank advice.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (selectedPaymentsForBankAdvice.size === 0) {
                      toast({
                        variant: "destructive",
                        title: "No Payments Selected",
                        description: "Please select at least one payment to process"
                      });
                      return;
                    }
                    setPaymentModeDialogOpen(true);
                  }}
                  disabled={selectedPaymentsForBankAdvice.size === 0 || generatingBankAdvice}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {generatingBankAdvice ? 'Loading...' : `Review & Generate (${selectedPaymentsForBankAdvice.size})`}
                </Button>
              </div>
              <PaymentManagementTable
                payments={filterPayments(fullyPaidPayments, searchTerm, searchFilter)}
                userRole={userRole}
                onApprove={(paymentId) => handleApproval(paymentId, 'approve')}
                onReject={(paymentId) => {
                  const reason = prompt('Enter rejection reason:');
                  if (reason) handleApproval(paymentId, 'reject', reason);
                }}
                onViewTransactions={(payment) => {
                  setSelectedPayment(payment);
                  fetchTransactions(payment.id);
                  setTransactionsDialog(true);
                }}
                onPartPayment={handleOpenPartPayment}
                onViewReleaseHistory={handleOpenReleaseHistory}
                showBankAdviceCheckbox={true}
                selectedPayments={selectedPaymentsForBankAdvice}
                onSelectPayment={handleSelectPaymentForBankAdvice}
              />
              
              {fullyPaidPayments.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Payments Pending Bank Advice</h3>
                    <p className="text-muted-foreground">
                      All fully paid payments have been processed for bank advice.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Bank Advice History Tab */}
          {userRole === 'admin' && (
            <TabsContent value="history">
              <BankAdviceReports />
            </TabsContent>
          )}
        </Tabs>
        </>
      )}

      {/* Suspect Dialog */}
        <Dialog open={suspectDialog} onOpenChange={setSuspectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Payment as Suspect</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedPayment) {
                handleSuspectToggle(selectedPayment.id, suspectFormData.suspect_reason);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="suspect_reason">Reason for marking as suspect</Label>
                  <Textarea
                    id="suspect_reason"
                    value={suspectFormData.suspect_reason}
                    onChange={(e) => setSuspectFormData({ ...suspectFormData, suspect_reason: e.target.value })}
                    placeholder="Enter reason..."
                    required
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setSuspectDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={submitting}>
                  {submitting ? 'Marking...' : 'Mark as Suspect'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Payment Recording Dialog */}
        <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
          <DialogContent className="sm:max-w-md p-4">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit}>
              <div className="space-y-3">
                {selectedPayment && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Payment for:</p>
                    <p className="font-semibold">{selectedPayment.doctors?.profiles?.full_name}</p>
                    <p className="text-sm">
                      Period: {formatDateIST(selectedPayment.period_start).split(',')[0].replace(' ', ' ')} - {formatDateIST(selectedPayment.period_end)}
                    </p>
                    <p className="text-sm">
                      Remaining Amount: <span className="font-semibold text-primary">{formatCurrency(selectedPayment.remaining_amount)}</span>
                    </p>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Payment Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedPayment?.remaining_amount || 0}
                    value={paymentFormData.amount}
                    onChange={(e) => {
                      const newAmount = parseFloat(e.target.value) || 0;
                      setPaymentFormData({ ...paymentFormData, amount: newAmount });
                      
                      if (selectedPayment) {
                        const error = validatePaymentAmount(newAmount, selectedPayment.remaining_amount);
                        setPaymentAmountError(error);
                      }
                    }}
                    required
                    className={cn(paymentAmountError && "border-destructive focus-visible:ring-destructive")}
                  />
                  {paymentAmountError && (
                    <p className="text-sm text-destructive mt-1">{paymentAmountError}</p>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="transaction_reference">Transaction Reference (Optional)</Label>
                  <Input
                    id="transaction_reference"
                    value={paymentFormData.transaction_reference}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, transaction_reference: e.target.value })}
                    placeholder="Enter transaction reference..."
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="payment_notes">Notes (Optional)</Label>
                  <Textarea
                    id="payment_notes"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    placeholder="Enter payment notes..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    processingPayment || 
                    !paymentFormData.amount || 
                    paymentFormData.amount === 0 ||
                    !!paymentAmountError ||
                    (selectedPayment && paymentFormData.amount > selectedPayment.remaining_amount)
                  }
                >
                  {processingPayment ? 'Recording...' : 'Record Payment'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bank Advice Review Dialog */}
        <Dialog open={showBankAdviceReviewDialog} onOpenChange={setShowBankAdviceReviewDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review & Select Transaction Types</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Summary Section with TDS Breakdown */}
              <div className="bg-muted p-4 rounded-lg space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Payments</p>
                    <p className="text-2xl font-bold">{selectedPaymentsForReview.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Amount</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(selectedPaymentsForReview.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">TDS (10%)</p>
                    <p className="text-2xl font-bold text-destructive">
                      -{formatCurrency(selectedPaymentsForReview.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0) * 0.10)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Payable</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(selectedPaymentsForReview.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0) * 0.90)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> 10% TDS will be deducted from all payments as per tax regulations. Net amounts shown will be transferred to doctors' accounts.
                  </p>
                </div>
              </div>

              {/* Bulk Selection Section */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-semibold min-w-fit">Apply to All Rows:</Label>
                    <Select value={bulkTransactionType} onValueChange={setBulkTransactionType}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSACTION_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleApplyBulkTransactionType} variant="outline">
                      Apply to All
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Payments Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Seq</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Doctor Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Account Number</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">IFSC Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Bank Name</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Gross Amount</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">TDS (10%)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Net Payable</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold min-w-[200px]">Transaction Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedPaymentsForReview.map((payment, index) => {
                        const doctor = payment.doctors;
                        const transactionType = transactionTypeSelections.get(payment.id) || 'NEFT TRANSFER';
                        const requiresIfsc = TRANSACTION_REQUIRES_IFSC[transactionType];
                        const hasIfscIssue = requiresIfsc && !doctor.ifsc_code;
                        
                        const grossAmount = parseFloat(payment.paid_amount || 0);
                        const tdsAmount = grossAmount * 0.10;
                        const netAmount = grossAmount - tdsAmount;
                        
                        return (
                          <tr key={payment.id} className={`hover:bg-muted/50 ${hasIfscIssue ? 'bg-destructive/10' : ''}`}>
                            <td className="px-4 py-3 text-sm">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium">{doctor.full_name}</td>
                            <td className="px-4 py-3 text-sm font-mono">{doctor.bank_account_number}</td>
                            <td className="px-4 py-3 text-sm font-mono">
                              {doctor.ifsc_code || <span className="text-destructive text-xs">Missing</span>}
                            </td>
                            <td className="px-4 py-3 text-sm">{doctor.bank_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">
                              {formatCurrency(grossAmount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-destructive font-medium">
                              -{formatCurrency(tdsAmount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-primary">
                              {formatCurrency(netAmount)}
                            </td>
                            <td className="px-4 py-3">
                              <Select
                                value={transactionType}
                                onValueChange={(value) => handleTransactionTypeChange(payment.id, value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TRANSACTION_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {hasIfscIssue && (
                                <p className="text-xs text-destructive mt-1">⚠️ IFSC required for this type</p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBankAdviceReviewDialog(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => {
                const cols = [
                  { label: '#', key: 'seq' },
                  { label: 'Doctor', key: 'doctor' },
                  { label: 'Account', key: 'account' },
                  { label: 'IFSC', key: 'ifsc' },
                  { label: 'Gross', key: 'gross' },
                  { label: 'TDS', key: 'tds' },
                  { label: 'Net', key: 'net' },
                ];
                const data = selectedPaymentsForReview.map((p, i) => ({
                  seq: i + 1,
                  doctor: p.doctors?.full_name || '',
                  account: p.doctors?.bank_account_number || '',
                  ifsc: p.doctors?.ifsc_code || '-',
                  gross: formatCurrency(parseFloat(p.paid_amount || 0)),
                  tds: formatCurrency(parseFloat(p.paid_amount || 0) * 0.10),
                  net: formatCurrency(parseFloat(p.paid_amount || 0) * 0.90),
                }));
                printReport({ title: 'Bank Advice Review', columns: cols, data });
              }}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={generateBankAdviceTextFile}>
                <Download className="h-4 w-4 mr-2" />
                Generate Text File (GEFU)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction History Dialog */}
        <Dialog open={transactionsDialog} onOpenChange={setTransactionsDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Payment Transactions</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-semibold">{selectedPayment.doctors?.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Period: {formatDateIST(selectedPayment.period_start).split(',')[0].replace(' ', ' ')} - {formatDateIST(selectedPayment.period_end)}
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Gross Amount</p>
                      <p className="font-semibold">{formatCurrency(selectedPayment.gross_amount || selectedPayment.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">TDS (10%)</p>
                      <p className="font-semibold text-warning">
                        {formatCurrency(selectedPayment.tds_amount || (selectedPayment.gross_amount || selectedPayment.total_amount) * 0.10)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net Amount</p>
                      <p className="font-semibold text-success">
                        {formatCurrency(selectedPayment.net_amount || (selectedPayment.gross_amount || selectedPayment.total_amount) * 0.90)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Paid Amount</p>
                      <p className="font-semibold text-success">{formatCurrency(selectedPayment.paid_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="font-semibold text-warning">{formatCurrency(selectedPayment.remaining_amount)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Transaction History</h3>
                  {transactions.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {transactions.map((transaction) => (
                        <Card key={transaction.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-primary">{formatCurrency(transaction.amount)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDateIST(transaction.transaction_date)}
                                </p>
                                {transaction.transaction_reference && (
                                  <p className="text-xs text-muted-foreground">
                                    Ref: {transaction.transaction_reference}
                                  </p>
                                )}
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>{formatDateTimeIST(transaction.created_at)}</p>
                              </div>
                            </div>
                            {transaction.notes && (
                              <p className="text-sm mt-2 text-muted-foreground">{transaction.notes}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No transactions recorded yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setTransactionsDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Part Payment Dialog */}
        <PartPaymentDialog
          open={showPartPaymentDialog}
          onOpenChange={setShowPartPaymentDialog}
          payment={partPaymentTarget}
          onSuccess={handlePartPaymentSuccess}
        />

        {/* Release History Dialog */}
        <PaymentReleaseHistory
          open={showReleaseHistoryDialog}
          onOpenChange={setShowReleaseHistoryDialog}
          payment={partPaymentTarget}
          onRefresh={fetchPayments}
        />

        {/* Payment Mode Dialog */}
        <PaymentModeDialog
          open={paymentModeDialogOpen}
          onOpenChange={setPaymentModeDialogOpen}
          onConfirm={handlePaymentModeConfirm}
          selectedCount={selectedPaymentsForBankAdvice.size}
          totalAmount={payments
            .filter(p => selectedPaymentsForBankAdvice.has(p.id))
            .reduce((sum, p) => sum + (p.net_amount || p.total_amount), 0)}
          isLoading={processingPaymentMode}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(false);
            setDeletePaymentId(null);
            setDeletePassword('');
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirm Delete Payment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This action is <strong>irreversible</strong>. The payment advice and all associated data will be permanently deleted.
              </p>
              <div className="space-y-2">
                <Label htmlFor="delete-password">Enter Admin Password to confirm</Label>
                <Input
                  id="delete-password"
                  type="password"
                  placeholder="Enter password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmDeleteWithPassword();
                  }}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => {
                setShowDeleteDialog(false);
                setDeletePaymentId(null);
                setDeletePassword('');
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteWithPassword} disabled={!deletePassword}>
                Confirm Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
   );
};

export default PaymentManagement;
