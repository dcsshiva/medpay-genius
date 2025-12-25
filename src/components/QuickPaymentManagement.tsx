import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Pencil, Trash2, Eye, Download, FileText, Image, MoreVertical, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { validateMobileNumber, formatMobileNumber } from '@/lib/validators';
import { formatCurrency } from '@/lib/currency';
import { useAuth } from '@/lib/auth';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { formatDateTimeIST } from '@/lib/dateUtils';
import { StaffBulkPaymentTab } from './quick-payment/StaffBulkPaymentTab';
import { StaffPaymentHistoryTab } from './quick-payment/StaffPaymentHistoryTab';

interface QuickPaymentType {
  id: string;
  type_name: string;
  type_code: string;
}

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  mobile_number: string;
  gst_number: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  account_holder_name: string | null;
}

interface StaffMember {
  id: string;
  staff_code: string;
  full_name: string;
  phone: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  account_holder_name: string | null;
}

interface QuickPayment {
  id: string;
  name: string;
  mobile_number: string;
  payment_type_id: string;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  account_holder_name: string | null;
  gross_amount: number;
  tds_percentage: number;
  tds_amount: number;
  net_amount: number;
  payment_notes: string | null;
  bank_advice_generated: boolean;
  bank_advice_reference: string | null;
  bank_advice_generated_at: string | null;
  created_at: string;
  quick_payment_types: { type_name: string };
  supporting_document_path: string | null;
  supporting_document_name: string | null;
  supporting_document_type: string | null;
}

interface QuickPaymentBankComparison {
  beneficiary_name: string;
  payment_type: string;
  original_ifsc: string;
  latest_ifsc: string;
  original_account: string;
  latest_account: string;
  original_bank: string;
  latest_bank: string;
  has_changes: boolean;
}

const QuickPaymentManagement = () => {
  const { user } = useAuth();
  const { data: websiteSettings } = useWebsiteSettings();
  const [activeTab, setActiveTab] = useState('add-payment');
  const [types, setTypes] = useState<QuickPaymentType[]>([]);
  const [payments, setPayments] = useState<QuickPayment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [isVendorPayment, setIsVendorPayment] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [isStaffAdvance, setIsStaffAdvance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<QuickPayment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // History tab state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'generated'>('all');
  const [regeneratingQuickPayment, setRegeneratingQuickPayment] = useState<string | null>(null);
  const [quickPaymentComparisonDialog, setQuickPaymentComparisonDialog] = useState(false);
  const [quickPaymentComparison, setQuickPaymentComparison] = useState<QuickPaymentBankComparison[]>([]);
  const [quickPaymentDetailsDialog, setQuickPaymentDetailsDialog] = useState(false);
  const [selectedQuickPaymentDetails, setSelectedQuickPaymentDetails] = useState<QuickPayment | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [autoFilledFromHistory, setAutoFilledFromHistory] = useState(false);
  const [loadingBankDetails, setLoadingBankDetails] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    mobile_number: '',
    payment_type_id: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_holder_name: '',
    gross_amount: '',
    tds_percentage: '0',
    payment_notes: '',
    gst_number: '',
  });

  useEffect(() => {
    fetchTypes();
    fetchPayments();
    fetchVendors();
    fetchStaffMembers();
  }, []);

  // Calculate TDS and net amount when gross amount or TDS percentage changes
  useEffect(() => {
    const gross = parseFloat(formData.gross_amount) || 0;
    const tdsRate = parseFloat(formData.tds_percentage) || 0;
    const tdsAmount = (gross * tdsRate) / 100;
    const netAmount = gross - tdsAmount;
    
    // Store in hidden fields (we'll handle this in submit)
  }, [formData.gross_amount, formData.tds_percentage]);

  const fetchTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_payment_types')
        .select('id, type_name, type_code')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setTypes(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch payment types');
      console.error('Error:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, vendor_code, vendor_name, mobile_number, gst_number, bank_name, account_number, ifsc_code, branch_name, account_holder_name')
        .eq('is_active', true)
        .order('vendor_name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch vendors');
      console.error('Error:', error);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, staff_code, full_name, phone, bank_name, bank_account_number, ifsc_code, branch_name, account_holder_name')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setStaffMembers(data?.map(s => ({
        ...s,
        account_number: s.bank_account_number
      })) || []);
    } catch (error: any) {
      toast.error('Failed to fetch staff members');
      console.error('Error:', error);
    }
  };

  const fetchBankDetailsByMobile = async (mobileNumber: string) => {
    // Only proceed if mobile number is valid and not in vendor or staff advance mode
    if (!validateMobileNumber(mobileNumber) || isVendorPayment || isStaffAdvance) {
      return;
    }

    setLoadingBankDetails(true);
    setAutoFilledFromHistory(false);

    try {
      // Get payment type codes to exclude
      const vendorTypes = types.filter(t => 
        t.type_code?.toLowerCase() === 'vendor' || 
        t.type_name?.toLowerCase().includes('vendor')
      ).map(t => t.id);
      
      const staffTypes = types.filter(t => 
        t.type_name?.toLowerCase().includes('staff advance')
      ).map(t => t.id);
      
      const excludedTypes = [...vendorTypes, ...staffTypes];

      const { data, error } = await supabase
        .from('quick_payments')
        .select('bank_name, account_number, ifsc_code, branch_name, account_holder_name, name, payment_type_id')
        .eq('mobile_number', mobileNumber)
        .not('bank_name', 'is', null)
        .not('account_number', 'is', null)
        .not('payment_type_id', 'in', `(${excludedTypes.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching bank details:', error);
        return;
      }
      
      if (!data) {
        console.log('No previous payment records found for this mobile number');
        return;
      }

      if (data) {
        // Auto-fill the bank details
        setFormData(prev => ({
          ...prev,
          bank_name: data.bank_name || '',
          account_number: data.account_number || '',
          ifsc_code: data.ifsc_code || '',
          branch_name: data.branch_name || '',
          account_holder_name: data.account_holder_name || '',
          // Optionally pre-fill name if current name is empty
          name: prev.name || data.name || '',
        }));
        
        setAutoFilledFromHistory(true);
        toast.success('Bank details loaded from previous payment');
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
      // Silent fail - don't show error to user
    } finally {
      setLoadingBankDetails(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_payments')
        .select(`
          *,
          quick_payment_types (type_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch payments');
      console.error('Error:', error);
    }
  };

  const calculateTDS = (grossAmount: number, tdsPercentage: number) => {
    const tdsAmount = (grossAmount * tdsPercentage) / 100;
    const netAmount = grossAmount - tdsAmount;
    return { tdsAmount, netAmount };
  };

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and JPEG files are allowed');
      return false;
    }

    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return false;
    }

    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      e.target.value = ''; // Reset input
      return;
    }

    setSelectedFile(file);
    
    // Generate preview for JPEG
    if (file.type.includes('image')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const uploadDocument = async (paymentId: string): Promise<{ path: string; name: string; type: string } | null> => {
    if (!selectedFile) return null;

    try {
      setIsUploading(true);
      
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${paymentId}_${timestamp}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('quick-payment-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      return {
        path: filePath,
        name: selectedFile.name,
        type: selectedFile.type
      };
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload document');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateMobileNumber(formData.mobile_number)) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }

    const grossAmount = parseFloat(formData.gross_amount) || 0;
    const tdsPercentage = parseFloat(formData.tds_percentage) || 0;
    const { tdsAmount, netAmount } = calculateTDS(grossAmount, tdsPercentage);

    setLoading(true);
    try {
      // First insert the payment record
      const { data: paymentData, error: insertError } = await supabase
        .from('quick_payments')
        .insert([{
          ...formData,
          vendor_id: isVendorPayment ? selectedVendor : null,
          gst_number: formData.gst_number || null,
          gross_amount: grossAmount,
          tds_percentage: tdsPercentage,
          tds_amount: tdsAmount,
          net_amount: netAmount,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload document if selected
      if (selectedFile && paymentData) {
        const documentInfo = await uploadDocument(paymentData.id);
        
        if (documentInfo) {
          // Update payment record with document info
          const { error: updateError } = await supabase
            .from('quick_payments')
            .update({
              supporting_document_path: documentInfo.path,
              supporting_document_name: documentInfo.name,
              supporting_document_type: documentInfo.type
            })
            .eq('id', paymentData.id);

          if (updateError) {
            console.error('Error updating document info:', updateError);
            toast.error('Payment saved but document upload failed');
          }
        }
      }
      
      toast.success('Quick payment added successfully');
      resetForm();
      setActiveTab('review');
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add payment');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPayment) return;
    
    if (!validateMobileNumber(formData.mobile_number)) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }

    const grossAmount = parseFloat(formData.gross_amount) || 0;
    const tdsPercentage = parseFloat(formData.tds_percentage) || 0;
    const { tdsAmount, netAmount } = calculateTDS(grossAmount, tdsPercentage);

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quick_payments')
        .update({
          ...formData,
          gross_amount: grossAmount,
          tds_percentage: tdsPercentage,
          tds_amount: tdsAmount,
          net_amount: netAmount,
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;
      
      toast.success('Payment updated successfully');
      setEditDialogOpen(false);
      resetForm();
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update payment');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      const { error } = await supabase
        .from('quick_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Payment deleted successfully');
      fetchPayments();
    } catch (error: any) {
      toast.error('Failed to delete payment');
      console.error('Error:', error);
    }
  };

  const generateBankAdvice = async () => {
    if (selectedPayments.length === 0) {
      toast.error('Please select at least one payment');
      return;
    }

    const paymentsToGenerate = payments.filter(p => 
      selectedPayments.includes(p.id) && !p.bank_advice_generated
    );

    if (paymentsToGenerate.length === 0) {
      toast.error('No valid payments selected');
      return;
    }

    try {
      // Generate GEFU format text file (same as Cash/Insurance payments)
      const totalGrossAmount = paymentsToGenerate.reduce((sum, p) => sum + p.gross_amount, 0);
      const totalTDSAmount = paymentsToGenerate.reduce((sum, p) => sum + p.tds_amount, 0);
      const totalNetAmount = paymentsToGenerate.reduce((sum, p) => sum + p.net_amount, 0);
      
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      
      // Header line
      let fileContent = `H~${dateStr}~${websiteSettings?.hospital_institution_code || 'ABC07112007'}\n`;

      // Detail lines
      paymentsToGenerate.forEach((payment, index) => {
        const netAmount = payment.net_amount.toFixed(2);
        
        const detailLine = [
          'D',                          // Record type
          'N06',                        // Transaction Type Code (NEFT TRANSFER)
          websiteSettings?.hospital_bank_account_number || '120000794291', // Hospital Account Number
          websiteSettings?.hospital_bank_account_holder_name || 'Westmed Healthcare Pvt Ltd', // Hospital Name
          'ADDRESS1',                   // Address Line 1
          'ADDRESS2',                   // Address Line 2
          'ADDRESS3',                   // Address Line 3
          payment.ifsc_code || '',      // Beneficiary IFSC Code
          payment.account_number || '', // Beneficiary Account Number
          payment.account_holder_name || payment.name, // Beneficiary Name
          '',                           // Empty
          '',                           // Empty
          '',                           // Empty
          '',                           // Empty
          index + 1,                    // Sequence Number
          dateStr,                      // Transaction Date
          netAmount,                    // Net Amount (after TDS)
          index + 1,                    // Sequence Number (again)
          '',                           // Empty
          '',                           // Empty
          '',                           // Empty
          ''                            // Empty
        ].join('~');
        
        fileContent += detailLine + '\n';
      });

      // Footer line (use net amount after TDS)
      fileContent += `F~${paymentsToGenerate.length}~${totalNetAmount.toFixed(2)}`;

      // Generate filename with format: DDMMYY-X.txt
      const filenameDateStr = format(today, 'ddMMyy');
      const paymentCount = paymentsToGenerate.length;
      const filename = `${filenameDateStr}-${paymentCount}.txt`;
      
      // Store bank advice generation in history with file content
      const { error: historyError } = await supabase
        .from('quick_payment_bank_advice_history')
        .insert({
          filename: filename,
          generation_date: today.toISOString().split('T')[0],
          payment_count: paymentCount,
          total_gross_amount: totalGrossAmount,
          total_tds_amount: totalTDSAmount,
          total_net_amount: totalNetAmount,
          payment_ids: paymentsToGenerate.map(p => p.id),
          generated_by: user?.id,
          file_content: fileContent
        });
      
      if (historyError) {
        console.error('Error saving bank advice history:', historyError);
        // Continue with download even if history save fails
      }

      // Create and download text file
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Update payments as bank advice generated
      const { error: updateError } = await supabase
        .from('quick_payments')
        .update({
          bank_advice_generated: true,
          bank_advice_generated_at: new Date().toISOString(),
          bank_advice_generated_by: user?.id,
          bank_advice_reference: filename,
        })
        .in('id', paymentsToGenerate.map(p => p.id));
      
      if (updateError) throw updateError;
      
      toast.success(`Downloaded ${filename}`, {
        description: `Bank advice generated for ${paymentsToGenerate.length} payment(s)`
      });
      
      setSelectedPayments([]);
      fetchPayments();
    } catch (error: any) {
      toast.error('Failed to generate bank advice');
      console.error('Error:', error);
    }
  };

  const openEditDialog = (payment: QuickPayment) => {
    setSelectedPayment(payment);
    setFormData({
      name: payment.name,
      mobile_number: payment.mobile_number,
      payment_type_id: payment.payment_type_id,
      bank_name: payment.bank_name || '',
      account_number: payment.account_number || '',
      ifsc_code: payment.ifsc_code || '',
      branch_name: payment.branch_name || '',
      account_holder_name: payment.account_holder_name || '',
      gross_amount: payment.gross_amount.toString(),
      tds_percentage: payment.tds_percentage.toString(),
      payment_notes: payment.payment_notes || '',
      gst_number: '',
    });
    setEditDialogOpen(true);
  };

  const handlePaymentTypeChange = (value: string) => {
    setFormData({ ...formData, payment_type_id: value });
    
    const selectedType = types.find(t => t.id === value);
    const isVendor = selectedType?.type_code?.toLowerCase() === 'vendor' || 
                     selectedType?.type_name?.toLowerCase().includes('vendor');
    const isStaff = selectedType?.type_name?.toLowerCase().includes('staff advance');
    
    setIsVendorPayment(isVendor);
    setIsStaffAdvance(isStaff);
    setAutoFilledFromHistory(false);
    
    if (!isVendor && !isStaff) {
      setSelectedVendor('');
      setSelectedStaff('');
      setFormData(prev => ({
        ...prev,
        name: '',
        mobile_number: '',
        gst_number: '',
      }));
    } else if (!isVendor) {
      setSelectedVendor('');
    } else if (!isStaff) {
      setSelectedStaff('');
    }
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendor(vendorId);
    
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      setFormData(prev => ({
        ...prev,
        name: vendor.vendor_name,
        mobile_number: vendor.mobile_number,
        gst_number: vendor.gst_number || '',
        bank_name: vendor.bank_name || '',
        account_number: vendor.account_number || '',
        ifsc_code: vendor.ifsc_code || '',
        branch_name: vendor.branch_name || '',
        account_holder_name: vendor.account_holder_name || '',
      }));
    }
  };

  const handleStaffChange = (staffId: string) => {
    setSelectedStaff(staffId);
    
    const staff = staffMembers.find(s => s.id === staffId);
    if (staff) {
      setFormData(prev => ({
        ...prev,
        name: staff.full_name,
        mobile_number: staff.phone || '',
        bank_name: staff.bank_name || '',
        account_number: staff.account_number || '',
        ifsc_code: staff.ifsc_code || '',
        branch_name: staff.branch_name || '',
        account_holder_name: staff.account_holder_name || '',
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      mobile_number: '',
      payment_type_id: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      account_holder_name: '',
      gross_amount: '',
      tds_percentage: '0',
      payment_notes: '',
      gst_number: '',
    });
    setSelectedPayment(null);
    setSelectedVendor('');
    setSelectedStaff('');
    setIsVendorPayment(false);
    setIsStaffAdvance(false);
    setSelectedFile(null);
    setFilePreview(null);
    setAutoFilledFromHistory(false);
    setLoadingBankDetails(false);
  };

  const pendingPayments = payments.filter(p => !p.bank_advice_generated);
  const generatedPayments = payments.filter(p => p.bank_advice_generated);

  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.net_amount, 0);
  const generatedTotal = generatedPayments.reduce((sum, p) => sum + p.net_amount, 0);

  // Filter payments for history tab
  const getFilteredPayments = () => {
    let filtered = payments;

    // Status filter
    if (statusFilter === 'pending') {
      filtered = filtered.filter(p => !p.bank_advice_generated);
    } else if (statusFilter === 'generated') {
      filtered = filtered.filter(p => p.bank_advice_generated);
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      filtered = filtered.filter(p => {
        const created = new Date(p.created_at);
        return created.toDateString() === now.toDateString();
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(p => new Date(p.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(p => new Date(p.created_at) >= monthAgo);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.mobile_number.includes(term) ||
        p.quick_payment_types.type_name.toLowerCase().includes(term) ||
        (p.bank_advice_reference && p.bank_advice_reference.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const filteredPayments = getFilteredPayments();

  // Document preview functions
  const handleViewDocument = async (payment: QuickPayment) => {
    if (!payment.supporting_document_path) return;

    setLoadingDocument(true);
    try {
      const { data, error } = await supabase.storage
        .from('quick-payment-documents')
        .createSignedUrl(payment.supporting_document_path, 3600);

      if (error) throw error;

      setPreviewDocument({
        url: data.signedUrl,
        name: payment.supporting_document_name || 'Document',
        type: payment.supporting_document_type || 'application/pdf',
      });
      setIsDocumentPreviewOpen(true);
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Failed to load document preview');
    } finally {
      setLoadingDocument(false);
    }
  };

  const handleDownloadDocument = async (payment: QuickPayment) => {
    if (!payment.supporting_document_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('quick-payment-documents')
        .download(payment.supporting_document_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = payment.supporting_document_name || 'document';
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Document downloaded successfully');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleDownloadQuickPaymentBankAdvice = async (payment: QuickPayment) => {
    if (!payment.bank_advice_reference) {
      toast.error('No bank advice reference found');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('quick_payment_bank_advice_history')
        .select('file_content, filename')
        .eq('filename', payment.bank_advice_reference)
        .single();

      if (error) throw error;

      if (!data?.file_content) {
        toast.error('Bank advice file content not found');
        return;
      }

      const blob = new Blob([data.file_content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Bank advice downloaded successfully');
    } catch (error: any) {
      toast.error('Failed to download bank advice');
      console.error('Error:', error);
    }
  };

  const handleRegenerateQuickPayment = async (payment: QuickPayment) => {
    setRegeneratingQuickPayment(payment.id);
    
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('quick_payment_bank_advice_history')
        .select('file_content, filename')
        .eq('filename', payment.bank_advice_reference)
        .single();

      if (historyError) throw historyError;

      const { data: latestPayment, error: paymentError } = await supabase
        .from('quick_payments')
        .select(`
          *,
          quick_payment_types (type_name)
        `)
        .eq('id', payment.id)
        .single();

      if (paymentError) throw paymentError;

      const lines = historyData.file_content.split('\n');
      const detailLine = lines.find(line => line.startsWith('D~'));
      
      let originalIfsc = '';
      let originalAccount = '';
      let originalBank = payment.bank_name || '';
      
      if (detailLine) {
        const parts = detailLine.split('~');
        originalIfsc = parts[7] || '';
        originalAccount = parts[8] || '';
      }

      const comparison: QuickPaymentBankComparison = {
        beneficiary_name: latestPayment.name,
        payment_type: latestPayment.quick_payment_types?.type_name || 'Quick Payment',
        original_ifsc: originalIfsc,
        latest_ifsc: latestPayment.ifsc_code || '',
        original_account: originalAccount,
        latest_account: latestPayment.account_number || '',
        original_bank: originalBank,
        latest_bank: latestPayment.bank_name || '',
        has_changes: (originalIfsc !== latestPayment.ifsc_code) || 
                     (originalAccount !== latestPayment.account_number) ||
                     (originalBank !== latestPayment.bank_name),
      };

      setQuickPaymentComparison([comparison]);
      setQuickPaymentComparisonDialog(true);

      const dateStr = format(new Date(latestPayment.created_at), 'dd/MM/yyyy');
      let gefuContent = `H~${dateStr}~${websiteSettings?.hospital_institution_code || 'ABC07112007'}\n`;

      const netAmount = latestPayment.net_amount.toFixed(2);
      const detailLineNew = [
        'D',
        'N06',
        websiteSettings?.hospital_bank_account_number || '120000794291',
        websiteSettings?.hospital_bank_account_holder_name || 'Westmed Healthcare Pvt Ltd',
        'ADDRESS1',
        'ADDRESS2',
        'ADDRESS3',
        latestPayment.ifsc_code || '',
        latestPayment.account_number || '',
        latestPayment.account_holder_name || latestPayment.name,
        '', '', '', '',
        '1',
        dateStr,
        netAmount,
        '1',
        '', '', '', ''
      ].join('~');

      gefuContent += detailLineNew + '\n';
      gefuContent += `F~1~${netAmount}`;

      const blob = new Blob([gefuContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = historyData.filename.replace('.txt', '-updated.txt');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Bank advice regenerated with latest details');
    } catch (error: any) {
      toast.error('Failed to regenerate bank advice');
      console.error('Error:', error);
    } finally {
      setRegeneratingQuickPayment(null);
    }
  };

  const handleViewQuickPaymentDetails = (payment: QuickPayment) => {
    setSelectedQuickPaymentDetails(payment);
    setQuickPaymentDetailsDialog(true);
  };

  // Form validation function
  const isFormValid = () => {
    const hasName = formData.name.trim().length > 0;
    const hasMobile = validateMobileNumber(formData.mobile_number);
    const hasType = formData.payment_type_id.length > 0;
    const hasGrossAmount = parseFloat(formData.gross_amount) > 0;
    
    const vendorValid = !isVendorPayment || selectedVendor.length > 0;
    const staffValid = !isStaffAdvance || selectedStaff.length > 0;
    
    // All bank details are now required
    const hasBankName = formData.bank_name.trim().length > 0;
    const hasAccountNumber = formData.account_number.trim().length > 0;
    const hasIFSC = formData.ifsc_code.trim().length > 0;
    const hasBranchName = formData.branch_name.trim().length > 0;
    const hasAccountHolder = formData.account_holder_name.trim().length > 0;
    
    return hasName && hasMobile && hasType && hasGrossAmount && vendorValid && staffValid &&
           hasBankName && hasAccountNumber && hasIFSC && hasBranchName && hasAccountHolder;
  };

  return (
    <div className="container mx-auto p-2 md:p-6">
      <h1 className="text-xl md:text-3xl font-bold mb-4 md:mb-6">Quick Payment Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max md:grid md:grid-cols-5 md:w-full h-auto p-1 gap-1">
            <TabsTrigger value="add-payment" className="whitespace-nowrap text-xs md:text-sm px-3 py-2 md:px-4">Add Payment</TabsTrigger>
            <TabsTrigger value="review" className="whitespace-nowrap text-xs md:text-sm px-3 py-2 md:px-4">Review</TabsTrigger>
            <TabsTrigger value="staff-bulk" className="whitespace-nowrap text-xs md:text-sm px-3 py-2 md:px-4">Staff Bulk</TabsTrigger>
            <TabsTrigger value="staff-history" className="whitespace-nowrap text-xs md:text-sm px-3 py-2 md:px-4">Staff History</TabsTrigger>
            <TabsTrigger value="history" className="whitespace-nowrap text-xs md:text-sm px-3 py-2 md:px-4">History</TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="add-payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Quick Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Payment Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment_type_id">Payment Type *</Label>
                    <Select
                      value={formData.payment_type_id}
                      onValueChange={handlePaymentTypeChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.type_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isVendorPayment && (
                    <div>
                      <Label htmlFor="vendor_id">Select Vendor *</Label>
                      <Select
                        value={selectedVendor}
                        onValueChange={handleVendorChange}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.vendor_code} - {vendor.vendor_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {isStaffAdvance && (
                    <div>
                      <Label htmlFor="staff_id">Select Staff Member *</Label>
                      <Select
                        value={selectedStaff}
                        onValueChange={handleStaffChange}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffMembers.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.staff_code} - {staff.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {isVendorPayment && formData.gst_number && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800">
                      <strong>GST Number:</strong> {formData.gst_number}
                    </p>
                  </div>
                )}

                {/* Basic Details - Mobile Number First */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mobile_number">Mobile Number *</Label>
                      <Input
                        id="mobile_number"
                        value={formData.mobile_number}
                        onChange={(e) => {
                          const formatted = formatMobileNumber(e.target.value);
                          setFormData({ 
                            ...formData, 
                            mobile_number: formatted
                          });
                          
                          // Trigger auto-fill when 10 digits are entered
                          if (formatted.length === 10 && validateMobileNumber(formatted)) {
                            fetchBankDetailsByMobile(formatted);
                          }
                        }}
                        onBlur={(e) => {
                          // Also trigger on blur in case user pastes the number
                          const mobile = e.target.value;
                          if (mobile.length === 10 && validateMobileNumber(mobile) && !isVendorPayment && !isStaffAdvance) {
                            fetchBankDetailsByMobile(mobile);
                          }
                        }}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        required
                        disabled={isVendorPayment || isStaffAdvance}
                      />
                    {formData.mobile_number && !validateMobileNumber(formData.mobile_number) && (
                      <p className="text-sm text-destructive mt-1">
                        Mobile number must be exactly 10 digits
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="name">Name / Company Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter name"
                        required
                        disabled={isVendorPayment || isStaffAdvance}
                      />
                  </div>
                </div>

                {/* Auto-fill notification */}
                {autoFilledFromHistory && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-center justify-between">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      ✓ Bank details loaded from previous payment for this mobile number
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          bank_name: '',
                          account_number: '',
                          ifsc_code: '',
                          branch_name: '',
                          account_holder_name: '',
                        }));
                        setAutoFilledFromHistory(false);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                )}

                {/* Basic Details Grid End */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                </div>

                {/* Amount and TDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gross_amount">Gross Amount *</Label>
                    <Input
                      id="gross_amount"
                      type="number"
                      step="0.01"
                      value={formData.gross_amount}
                      onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tds_percentage">TDS Percentage (%)</Label>
                    <Input
                      id="tds_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.tds_percentage}
                      onChange={(e) => setFormData({ ...formData, tds_percentage: e.target.value })}
                      placeholder="Enter TDS %"
                    />
                  </div>
                </div>

                {/* TDS Calculation Display */}
                {formData.gross_amount && (
                  <Card className="bg-muted">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Gross Amount</p>
                          <p className="font-semibold">{formatCurrency(parseFloat(formData.gross_amount) || 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">TDS Amount</p>
                          <p className="font-semibold">
                            {formatCurrency(calculateTDS(
                              parseFloat(formData.gross_amount) || 0,
                              parseFloat(formData.tds_percentage) || 0
                            ).tdsAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Net Amount</p>
                          <p className="font-semibold text-primary">
                            {formatCurrency(calculateTDS(
                              parseFloat(formData.gross_amount) || 0,
                              parseFloat(formData.tds_percentage) || 0
                            ).netAmount)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bank Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Bank Details *
                    {loadingBankDetails && <span className="text-sm font-normal text-muted-foreground ml-2">(Loading...)</span>}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank_name">Bank Name *</Label>
                        <Input
                          id="bank_name"
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          placeholder="Enter bank name"
                          required
                          disabled={isStaffAdvance}
                        />
                    </div>
                    <div>
                      <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                        <Input
                          id="account_holder_name"
                          value={formData.account_holder_name}
                          onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                          placeholder="Enter account holder name"
                          required
                          disabled={isStaffAdvance}
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="account_number">Account Number *</Label>
                        <Input
                          id="account_number"
                          value={formData.account_number}
                          onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                          placeholder="Enter account number"
                          required
                          disabled={isStaffAdvance}
                        />
                    </div>
                    <div>
                      <Label htmlFor="ifsc_code">IFSC Code *</Label>
                        <Input
                          id="ifsc_code"
                          value={formData.ifsc_code}
                          onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                          placeholder="e.g., SBIN0001234"
                          required
                          disabled={isStaffAdvance}
                        />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="branch_name">Branch Name *</Label>
                      <Input
                        id="branch_name"
                        value={formData.branch_name}
                        onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                        placeholder="Enter branch name"
                        required
                        disabled={isStaffAdvance}
                      />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="payment_notes">Payment Notes</Label>
                  <Textarea
                    id="payment_notes"
                    value={formData.payment_notes}
                    onChange={(e) => setFormData({ ...formData, payment_notes: e.target.value })}
                    placeholder="Optional notes"
                    rows={3}
                  />
                </div>

                {/* Supporting Document Upload */}
                <div className="space-y-2">
                  <Label htmlFor="supporting_document">Supporting Document</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload a supporting document (PDF or JPEG, max 5MB)
                  </p>
                  
                  {!selectedFile ? (
                    <div className="flex items-center gap-4">
                      <Input
                        id="supporting_document"
                        type="file"
                        accept=".pdf,.jpg,.jpeg"
                        onChange={handleFileSelect}
                        disabled={loading || isUploading}
                        className="cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="border rounded-md p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedFile.type === 'application/pdf' ? (
                            <FileText className="h-5 w-5 text-red-500" />
                          ) : (
                            <Image className="h-5 w-5 text-blue-500" />
                          )}
                          <span className="text-sm font-medium">{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleFileRemove}
                          disabled={loading || isUploading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Image Preview */}
                      {filePreview && (
                        <div className="mt-2">
                          <img 
                            src={filePreview} 
                            alt="Preview" 
                            className="max-w-xs max-h-48 rounded border"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex gap-4">
                    <Button type="submit" disabled={loading || !isFormValid()}>
                      {loading ? 'Saving...' : 'Submit Payment'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Clear Form
                    </Button>
                  </div>
                  {!isFormValid() && (
                    <p className="text-sm text-muted-foreground">
                      Please fill all required fields: Name, Mobile (10 digits), Payment Type, Gross Amount, and all Bank Details
                    </p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="mt-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingPayments.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(pendingTotal)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Generated Advices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{generatedPayments.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Generated Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(generatedTotal)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Payments */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Pending Payments</CardTitle>
                  <Button
                    onClick={generateBankAdvice}
                    disabled={selectedPayments.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Generate Bank Advice ({selectedPayments.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedPayments.length === pendingPayments.length && pendingPayments.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPayments(pendingPayments.map(p => p.id));
                            } else {
                              setSelectedPayments([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Gross Amount</TableHead>
                      <TableHead>TDS</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPayments.includes(payment.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPayments([...selectedPayments, payment.id]);
                              } else {
                                setSelectedPayments(selectedPayments.filter(id => id !== payment.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{payment.name}</TableCell>
                        <TableCell>{payment.mobile_number}</TableCell>
                        <TableCell>{payment.quick_payment_types.type_name}</TableCell>
                        <TableCell>{formatCurrency(payment.gross_amount)}</TableCell>
                        <TableCell>{payment.tds_percentage}%</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(payment.net_amount)}</TableCell>
                        <TableCell>{payment.bank_name || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(payment)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(payment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Generated Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Bank Advices</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Generated Date & Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.name}</TableCell>
                        <TableCell>{payment.mobile_number}</TableCell>
                        <TableCell>{payment.quick_payment_types.type_name}</TableCell>
                        <TableCell>{formatCurrency(payment.net_amount)}</TableCell>
                        <TableCell>{payment.bank_name || '-'}</TableCell>
                        <TableCell className="text-sm">{payment.bank_advice_reference}</TableCell>
                        <TableCell>{formatDateTimeIST(payment.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staff-bulk" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Bulk Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <StaffBulkPaymentTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff-history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <StaffPaymentHistoryTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter Section */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, mobile, type, or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="generated">Generated</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Filter */}
                <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Summary */}
              <div className="text-sm text-muted-foreground">
                Showing {filteredPayments.length} of {payments.length} payments
              </div>

              {/* History Table */}
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">TDS</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-center">Document</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                            ? 'No payments found matching your filters' 
                            : 'No payment records found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="text-sm">
                            {formatDateTimeIST(payment.created_at)}
                          </TableCell>
                          <TableCell className="font-medium">{payment.name}</TableCell>
                          <TableCell>{payment.mobile_number}</TableCell>
                          <TableCell className="text-sm">{payment.quick_payment_types.type_name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(payment.gross_amount)}</TableCell>
                          <TableCell className="text-right">{payment.tds_percentage}%</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(payment.net_amount)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              payment.bank_advice_generated 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {payment.bank_advice_generated ? 'Generated' : 'Pending'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {payment.bank_advice_reference || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {payment.supporting_document_path ? (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewDocument(payment)}
                                  disabled={loadingDocument}
                                  title="Preview Document"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownloadDocument(payment)}
                                  title="Download Document"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {payment.bank_advice_generated ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleDownloadQuickPaymentBankAdvice(payment)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleRegenerateQuickPayment(payment)}
                                    disabled={regeneratingQuickPayment === payment.id}
                                  >
                                    <RefreshCw className={`mr-2 h-4 w-4 ${regeneratingQuickPayment === payment.id ? 'animate-spin' : ''}`} />
                                    Regenerate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewQuickPaymentDetails(payment)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setViewDialogOpen(true);
                                  }}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditDialog(payment)}
                                  title="Edit Payment"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(payment.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <p className="font-medium">{selectedPayment.name}</p>
                </div>
                <div>
                  <Label>Mobile Number</Label>
                  <p className="font-medium">{selectedPayment.mobile_number}</p>
                </div>
                <div>
                  <Label>Payment Type</Label>
                  <p className="font-medium">{selectedPayment.quick_payment_types.type_name}</p>
                </div>
                <div>
                  <Label>Gross Amount</Label>
                  <p className="font-medium">{formatCurrency(selectedPayment.gross_amount)}</p>
                </div>
                <div>
                  <Label>TDS Percentage</Label>
                  <p className="font-medium">{selectedPayment.tds_percentage}%</p>
                </div>
                <div>
                  <Label>TDS Amount</Label>
                  <p className="font-medium">{formatCurrency(selectedPayment.tds_amount)}</p>
                </div>
                <div>
                  <Label>Net Amount</Label>
                  <p className="font-medium text-primary">{formatCurrency(selectedPayment.net_amount)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Bank Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bank Name</Label>
                    <p>{selectedPayment.bank_name || '-'}</p>
                  </div>
                  <div>
                    <Label>Account Holder</Label>
                    <p>{selectedPayment.account_holder_name || '-'}</p>
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <p>{selectedPayment.account_number || '-'}</p>
                  </div>
                  <div>
                    <Label>IFSC Code</Label>
                    <p>{selectedPayment.ifsc_code || '-'}</p>
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <p>{selectedPayment.branch_name || '-'}</p>
                  </div>
                </div>
              </div>
              
              {selectedPayment.payment_notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedPayment.payment_notes}</p>
                </div>
              )}

              {selectedPayment.supporting_document_path && (
                <div className="border-t pt-4">
                  <Label>Supporting Document</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedPayment.supporting_document_type === 'application/pdf' ? (
                      <FileText className="h-5 w-5 text-red-500" />
                    ) : (
                      <Image className="h-5 w-5 text-blue-500" />
                    )}
                    <span className="text-sm flex-1">{selectedPayment.supporting_document_name}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase.storage
                            .from('quick-payment-documents')
                            .download(selectedPayment.supporting_document_path!);
                          
                          if (error) throw error;
                          
                          const url = URL.createObjectURL(data);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = selectedPayment.supporting_document_name || 'document';
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (error) {
                          toast.error('Failed to download document');
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Name *</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_mobile">Mobile Number *</Label>
                <Input
                  id="edit_mobile"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    mobile_number: formatMobileNumber(e.target.value) 
                  })}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_type">Payment Type *</Label>
                <Select
                  value={formData.payment_type_id}
                  onValueChange={(value) => setFormData({ ...formData, payment_type_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_gross">Gross Amount *</Label>
                <Input
                  id="edit_gross"
                  type="number"
                  step="0.01"
                  value={formData.gross_amount}
                  onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_tds">TDS Percentage (%)</Label>
                <Input
                  id="edit_tds"
                  type="number"
                  step="0.01"
                  value={formData.tds_percentage}
                  onChange={(e) => setFormData({ ...formData, tds_percentage: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Payment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={isDocumentPreviewOpen} onOpenChange={setIsDocumentPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDocument?.type?.includes('pdf') ? (
                <FileText className="h-5 w-5 text-red-500" />
              ) : (
                <Image className="h-5 w-5 text-blue-500" />
              )}
              {previewDocument?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[70vh]">
            {previewDocument?.type?.includes('image') ? (
              <img 
                src={previewDocument.url} 
                alt={previewDocument.name}
                className="w-full h-auto"
              />
            ) : previewDocument?.type?.includes('pdf') ? (
              <iframe
                src={previewDocument.url}
                className="w-full h-[70vh] border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Preview not available for this file type
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsDocumentPreviewOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Payment Bank Comparison Dialog */}
      <Dialog open={quickPaymentComparisonDialog} onOpenChange={setQuickPaymentComparisonDialog}>
        <DialogContent className="max-w-3xl max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Bank Details Comparison - Original vs Latest</DialogTitle>
            <DialogDescription>
              Comparing bank details from original payment record with current payment details
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 p-4">
              {quickPaymentComparison.map((comp, idx) => (
                <Card key={idx} className={comp.has_changes ? 'border-orange-500 border-2' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold">{comp.beneficiary_name}</p>
                        <p className="text-sm text-muted-foreground">{comp.payment_type}</p>
                      </div>
                      {comp.has_changes && (
                        <Badge variant="destructive">Changed</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Original Bank</p>
                        <p className="font-mono">{comp.original_bank}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Latest Bank</p>
                        <p className={`font-mono ${comp.original_bank !== comp.latest_bank ? 'text-orange-600 font-semibold' : ''}`}>
                          {comp.latest_bank}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Original IFSC</p>
                        <p className="font-mono">{comp.original_ifsc}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Latest IFSC</p>
                        <p className={`font-mono ${comp.original_ifsc !== comp.latest_ifsc ? 'text-orange-600 font-semibold' : ''}`}>
                          {comp.latest_ifsc}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Original Account</p>
                        <p className="font-mono">{comp.original_account}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Latest Account</p>
                        <p className={`font-mono ${comp.original_account !== comp.latest_account ? 'text-orange-600 font-semibold' : ''}`}>
                          {comp.latest_account}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Quick Payment Details Dialog */}
      <Dialog open={quickPaymentDetailsDialog} onOpenChange={setQuickPaymentDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Quick Payment Details</DialogTitle>
          </DialogHeader>
          {selectedQuickPaymentDetails && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Payment Type</Label>
                    <p className="font-medium">{selectedQuickPaymentDetails.quick_payment_types?.type_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Beneficiary Name</Label>
                    <p className="font-medium">{selectedQuickPaymentDetails.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Mobile Number</Label>
                    <p>{selectedQuickPaymentDetails.mobile_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Date</Label>
                    <p>{format(new Date(selectedQuickPaymentDetails.created_at), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-3">Amount Details</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Gross Amount</Label>
                      <p className="font-semibold">{formatCurrency(selectedQuickPaymentDetails.gross_amount)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">TDS Amount ({selectedQuickPaymentDetails.tds_percentage}%)</Label>
                      <p className="font-semibold">{formatCurrency(selectedQuickPaymentDetails.tds_amount)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Net Amount</Label>
                      <p className="font-semibold text-lg text-primary">{formatCurrency(selectedQuickPaymentDetails.net_amount)}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-3">Bank Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Bank Name</Label>
                      <p>{selectedQuickPaymentDetails.bank_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Account Holder</Label>
                      <p>{selectedQuickPaymentDetails.account_holder_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Account Number</Label>
                      <p className="font-mono">{selectedQuickPaymentDetails.account_number || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">IFSC Code</Label>
                      <p className="font-mono">{selectedQuickPaymentDetails.ifsc_code || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Branch</Label>
                      <p>{selectedQuickPaymentDetails.branch_name || '-'}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-3">Bank Advice Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div>
                        <Badge variant={selectedQuickPaymentDetails.bank_advice_generated ? "default" : "secondary"}>
                          {selectedQuickPaymentDetails.bank_advice_generated ? 'Generated' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Reference</Label>
                      <p className="font-mono text-sm">{selectedQuickPaymentDetails.bank_advice_reference || '-'}</p>
                    </div>
                    {selectedQuickPaymentDetails.bank_advice_generated_at && (
                      <div>
                        <Label className="text-muted-foreground">Generated At</Label>
                        <p>{format(new Date(selectedQuickPaymentDetails.bank_advice_generated_at), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedQuickPaymentDetails.payment_notes && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-muted-foreground">Notes</Label>
                      <p className="text-sm mt-1">{selectedQuickPaymentDetails.payment_notes}</p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuickPaymentManagement;
