import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReportGeneration from '@/components/ReportGeneration';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { 
  FileText, 
  Calendar,
  Filter,
  TrendingUp,
  Users,
  Download,
  Eye,
  Building2,
  DollarSign,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  MoreVertical,
  Edit
} from 'lucide-react';
import { formatDateTimeIST, formatDateIST } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/currency';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ReconciliationStatus = 'pending' | 'in_process' | 'completed' | 'failed' | 'partial';

interface BankAdviceHistory {
  id: string;
  filename: string;
  generation_date: string;
  payment_count: number;
  total_amount: number;
  payment_ids: string[];
  generated_by: string;
  file_content: string;
  created_at: string;
  generator_name?: string;
  payment_source: 'doctor' | 'quick_payment' | 'staff_payment';
  reconciliation_status: ReconciliationStatus;
  bank_confirmation_date?: string;
  bank_reference_number?: string;
  reconciliation_notes?: string;
  reconciled_by?: string;
  reconciled_at?: string;
  reconciler_name?: string;
  reconciliation_proof_file_path?: string;
  reconciliation_proof_file_name?: string;
}

const BankAdviceReports = () => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<BankAdviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<BankAdviceHistory | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    doctorSearch: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'all'>(20);
  const [reconciliationDialog, setReconciliationDialog] = useState(false);
  const [reconciliationForm, setReconciliationForm] = useState({
    status: 'completed' as ReconciliationStatus,
    bank_confirmation_date: '',
    bank_reference_number: '',
    reconciliation_notes: ''
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any[]>([]);
  const [loadingPaymentDetails, setLoadingPaymentDetails] = useState(false);

  // Fetch user's profile ID
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserProfileId(data.id);
      }
    };
    
    fetchUserProfile();
  }, [user?.id]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.dateFrom, filters.dateTo, filters.doctorSearch]);

  // Quick date filters
  const setQuickFilter = (days: number) => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - days);
    
    setFilters({
      ...filters,
      dateFrom: from.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0]
    });
  };

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'manager') {
      fetchBankAdviceHistory();
    }
  }, [userRole, filters]);

  const fetchBankAdviceHistory = async () => {
    if (userRole !== 'admin' && userRole !== 'manager') return;

    try {
      // Fetch from bank_advice_history (doctor payments)
      let doctorQuery = supabase
        .from('bank_advice_history')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filters
      if (filters.dateFrom) {
        doctorQuery = doctorQuery.gte('generation_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        doctorQuery = doctorQuery.lte('generation_date', filters.dateTo);
      }

      // Fetch from quick_payment_bank_advice_history (quick payments)
      let quickQuery = supabase
        .from('quick_payment_bank_advice_history')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply same date filters
      if (filters.dateFrom) {
        quickQuery = quickQuery.gte('generation_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        quickQuery = quickQuery.lte('generation_date', filters.dateTo);
      }

      // Fetch from staff_payment_bank_advice_history (staff payments)
      let staffQuery = supabase
        .from('staff_payment_bank_advice_history')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply same date filters
      if (filters.dateFrom) {
        staffQuery = staffQuery.gte('generation_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        staffQuery = staffQuery.lte('generation_date', filters.dateTo);
      }

      const [doctorResult, quickResult, staffResult] = await Promise.all([
        doctorQuery,
        quickQuery,
        staffQuery
      ]);

      if (doctorResult.error) throw doctorResult.error;
      if (quickResult.error) throw quickResult.error;
      if (staffResult.error) throw staffResult.error;

      // Map doctor payments with payment_source
      const doctorRecords = (doctorResult.data || []).map((record: any) => ({
        ...record,
        payment_source: 'doctor' as const,
        payment_ids: record.payment_ids || []
      }));

      // Map quick payments with payment_source and normalize field names
      const quickRecords = (quickResult.data || []).map((record: any) => ({
        ...record,
        payment_source: 'quick_payment' as const,
        total_amount: record.total_net_amount || 0,
        payment_ids: record.payment_ids || []
      }));

      // Map staff payments with payment_source
      const staffRecords = (staffResult.data || []).map((record: any) => ({
        ...record,
        payment_source: 'staff_payment' as const,
        payment_ids: record.payment_ids || []
      }));

      // Merge and sort by created_at
      const allRecords = [...doctorRecords, ...quickRecords, ...staffRecords].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Fetch generator and reconciler names for all records
      const recordsWithNames = await Promise.all(
        allRecords.map(async (record: any) => {
          let generatorName = 'Unknown';
          let reconcilerName = '';
          
          if (record.generated_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', record.generated_by)
              .single();
            
            if (profile) generatorName = profile.full_name;
          }

          if (record.reconciled_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', record.reconciled_by)
              .single();
            
            if (profile) reconcilerName = profile.full_name;
          }

          return {
            ...record,
            generator_name: generatorName,
            reconciler_name: reconcilerName
          };
        })
      );

      setRecords(recordsWithNames);
    } catch (error) {
      console.error('Error fetching bank advice history:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch bank advice history"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentDetails = async (record: BankAdviceHistory) => {
    setLoadingPaymentDetails(true);
    try {
      let details: any[] = [];

      if (record.payment_source === 'doctor') {
        // Fetch doctor payment details
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            id,
            total_amount,
            paid_amount,
            net_amount,
            tds_amount,
            doctors (
              id,
              full_name,
              doctor_code,
              bank_name,
              account_holder_name,
              bank_account_number,
              ifsc_code,
              branch_name
            )
          `)
          .in('id', record.payment_ids);

        details = (payments || []).map((p: any) => ({
          id: p.id,
          beneficiary_name: p.doctors?.full_name || 'N/A',
          beneficiary_code: p.doctors?.doctor_code || '',
          account_holder: p.doctors?.account_holder_name || 'N/A',
          bank_name: p.doctors?.bank_name || 'N/A',
          account_number: p.doctors?.bank_account_number || 'N/A',
          ifsc_code: p.doctors?.ifsc_code || 'N/A',
          branch_name: p.doctors?.branch_name || '',
          amount: p.net_amount || p.paid_amount || p.total_amount,
          payment_type: 'Doctor Payment'
        }));
      } 
      else if (record.payment_source === 'quick_payment') {
        // Fetch quick payment details
        const { data: payments } = await supabase
          .from('quick_payments')
          .select(`
            id,
            name,
            account_holder_name,
            bank_name,
            account_number,
            ifsc_code,
            branch_name,
            gross_amount,
            tds_amount,
            net_amount,
            quick_payment_types (type_name)
          `)
          .in('id', record.payment_ids);

        details = (payments || []).map((p: any) => ({
          id: p.id,
          beneficiary_name: p.name || 'N/A',
          beneficiary_code: '',
          account_holder: p.account_holder_name || 'N/A',
          bank_name: p.bank_name || 'N/A',
          account_number: p.account_number || 'N/A',
          ifsc_code: p.ifsc_code || 'N/A',
          branch_name: p.branch_name || '',
          amount: p.net_amount,
          gross_amount: p.gross_amount,
          tds_amount: p.tds_amount,
          payment_type: p.quick_payment_types?.type_name || 'Quick Payment'
        }));
      }
      else if (record.payment_source === 'staff_payment') {
        // Fetch staff payment details
        const { data: payments } = await supabase
          .from('staff_payments')
          .select(`
            id,
            amount,
            account_holder_name,
            bank_name,
            account_number,
            ifsc_code,
            branch_name,
            staff (
              id,
              full_name,
              staff_code
            )
          `)
          .in('id', record.payment_ids);

        details = (payments || []).map((p: any) => ({
          id: p.id,
          beneficiary_name: p.staff?.full_name || 'N/A',
          beneficiary_code: p.staff?.staff_code || '',
          account_holder: p.account_holder_name || 'N/A',
          bank_name: p.bank_name || 'N/A',
          account_number: p.account_number || 'N/A',
          ifsc_code: p.ifsc_code || 'N/A',
          branch_name: p.branch_name || '',
          amount: p.amount,
          payment_type: 'Staff Payment'
        }));
      }

      setPaymentDetails(details);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payment details"
      });
    } finally {
      setLoadingPaymentDetails(false);
    }
  };

  const handleDownload = (record: BankAdviceHistory) => {
    if (!record.file_content) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "File content not available"
      });
      return;
    }

    const blob = new Blob([record.file_content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = record.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: `Downloaded ${record.filename}`
    });
  };

  const openReconciliationDialog = (record: BankAdviceHistory) => {
    const today = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    
    setSelectedRecord(record);
    setReconciliationForm({
      status: record.reconciliation_status || 'completed', // Default to completed
      bank_confirmation_date: record.bank_confirmation_date || today, // Default to today
      bank_reference_number: record.bank_reference_number || '',
      reconciliation_notes: record.reconciliation_notes || ''
    });
    
    // Load existing file if available
    if (record.reconciliation_proof_file_path) {
      setFilePreviewUrl(record.reconciliation_proof_file_path);
    } else {
      setFilePreviewUrl(null);
    }
    
    setSelectedFile(null);
    setReconciliationDialog(true);
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    if (!selectedRecord) return null;

    try {
      setUploadingFile(true);
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Only PDF, PNG, and JPEG files are allowed"
        });
        return null;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "File size must be less than 5MB"
        });
        return null;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `reconciliation_${selectedRecord.id}_${timestamp}.${fileExt}`;
      const filePath = `${selectedRecord.payment_source}/${fileName}`;

      console.log('Attempting to upload file:', {
        fileName,
        filePath,
        fileSize: file.size,
        fileType: file.type,
        bucket: 'bank-reconciliation-proofs'
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('bank-reconciliation-proofs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error details:', error);
        throw error;
      }

      console.log('File uploaded successfully:', data);

      return filePath;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to upload reconciliation proof file"
      });
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setFilePreviewUrl(previewUrl);
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const handleDownloadProofFile = async (record: BankAdviceHistory) => {
    if (!record.reconciliation_proof_file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('bank-reconciliation-proofs')
        .download(record.reconciliation_proof_file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = record.reconciliation_proof_file_name || 'reconciliation_proof';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Reconciliation proof downloaded successfully"
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download reconciliation proof"
      });
    }
  };

  const handleViewProofFile = async (record: BankAdviceHistory) => {
    if (!record.reconciliation_proof_file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('bank-reconciliation-proofs')
        .createSignedUrl(record.reconciliation_proof_file_path, 60);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
      toast({
        variant: "destructive",
        title: "View Failed",
        description: "Failed to view reconciliation proof"
      });
    }
  };

  const handleReconciliationUpdate = async () => {
    if (!selectedRecord) return;

    // Prevent updating locked records
    if (selectedRecord.reconciliation_status === 'completed') {
      toast({
        variant: "destructive",
        title: "Action Not Allowed",
        description: "Completed reconciliations cannot be modified. This is for audit trail protection."
      });
      return;
    }

    try {
      const table = selectedRecord.payment_source === 'doctor' 
        ? 'bank_advice_history' 
        : selectedRecord.payment_source === 'quick_payment' 
        ? 'quick_payment_bank_advice_history' 
        : 'staff_payment_bank_advice_history';

      let uploadedFilePath: string | null = null;
      let uploadedFileName: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        console.log('Starting file upload for reconciliation...');
        try {
          uploadedFilePath = await handleFileUpload(selectedFile);
          if (!uploadedFilePath) {
            console.error('File upload returned null');
            return; // Upload failed, error already shown
          }
          uploadedFileName = selectedFile.name;
          console.log('File upload successful, path:', uploadedFilePath);
        } catch (uploadError) {
          console.error('File upload exception:', uploadError);
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "Could not upload reconciliation proof file. Please try again."
          });
          return;
        }
      }

      const updateData: any = {
        reconciliation_status: reconciliationForm.status,
        bank_confirmation_date: reconciliationForm.bank_confirmation_date || null,
        bank_reference_number: reconciliationForm.bank_reference_number || null,
        reconciliation_notes: reconciliationForm.reconciliation_notes || null
      };

      if (uploadedFilePath) {
        updateData.reconciliation_proof_file_path = uploadedFilePath;
        updateData.reconciliation_proof_file_name = uploadedFileName;
      }

      if (reconciliationForm.status === 'completed') {
        updateData.reconciled_by = userProfileId;
        updateData.reconciled_at = new Date().toISOString();
      }

      console.log('Updating database with data:', { table, updateData, recordId: selectedRecord.id });

      const { data, error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', selectedRecord.id)
        .select();

      if (error) {
        console.error('Database update error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.error('Database update affected 0 rows');
        throw new Error('No records were updated. Please check permissions.');
      }

      console.log('Reconciliation updated successfully');
      
      toast({
        title: "Success",
        description: `Reconciliation status updated to ${reconciliationForm.status.replace('_', ' ')}`
      });

      setReconciliationDialog(false);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      fetchBankAdviceHistory();
      
    } catch (error: any) {
      console.error('Error in handleReconciliationUpdate:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update reconciliation status. Check console for details."
      });
    }
  };

  const getStatusBadge = (status: ReconciliationStatus) => {
    const statusConfig = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending', animate: 'animate-pulse' },
      in_process: { icon: RefreshCw, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'In Process', animate: 'animate-spin' },
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed', animate: '' },
      failed: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Failed', animate: '' },
      partial: { icon: AlertCircle, color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Partial', animate: '' }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={cn(config.color, "border")}>
        <Icon className={cn("h-3 w-3 mr-1", config.animate)} />
        {config.label}
      </Badge>
    );
  };

  const handleRegenerate = async (record: BankAdviceHistory) => {
    try {
      // Fetch latest bank details from doctors table
      if (record.payment_source === 'doctor') {
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            id,
            net_amount,
            doctors (
              full_name,
              bank_account_number,
              ifsc_code,
              bank_name,
              account_holder_name
            )
          `)
          .in('id', record.payment_ids);

        if (!payments || payments.length === 0) {
          throw new Error('No payment records found');
        }

        // Rebuild GEFU format with latest bank details
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);

        let gefuContent = `H~${dd}/${mm}/20${yy}~WESTMED\n`;
        
        let totalNetAmount = 0;
        payments.forEach((payment: any, index: number) => {
          const doctor = payment.doctors;
          const seq = String(index + 1).padStart(6, '0');
          const netAmount = Number(payment.net_amount).toFixed(2);
          totalNetAmount += Number(payment.net_amount);

          gefuContent += `D~N06~HOSPITAL_ACCOUNT~HOSPITAL_NAME~ADDRESS1~ADDRESS2~ADDRESS3~${doctor.ifsc_code}~${doctor.bank_account_number}~${doctor.account_holder_name}~~~~~${seq}~${dd}/${mm}/20${yy}~${netAmount}~CONSULTING CHARGES~~~~\n`;
        });

        gefuContent += `F~${payments.length}~${totalNetAmount.toFixed(2)}\n`;

        // Download regenerated file
        const blob = new Blob([gefuContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = record.filename.replace('.txt', '-updated.txt');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Bank advice regenerated with latest bank details"
        });
      } else if (record.payment_source === 'quick_payment') {
        // For quick payments
        const { data: payments } = await supabase
          .from('quick_payments')
          .select('*, quick_payment_types (type_name)')
          .in('id', record.payment_ids);

        if (!payments || payments.length === 0) {
          throw new Error('No payment records found');
        }

        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);

        let gefuContent = `H~${dd}/${mm}/20${yy}~WESTMED\n`;
        
        let totalNetAmount = 0;
        payments.forEach((payment: any, index: number) => {
          const seq = String(index + 1).padStart(6, '0');
          const netAmount = Number(payment.net_amount).toFixed(2);
          totalNetAmount += Number(payment.net_amount);

          // Determine sender-to-receiver info
          const senderToRcvrInfo = payment.payment_notes?.trim()
            ? payment.payment_notes.trim().replace(/[~\r\n]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 35).toUpperCase()
            : (payment.quick_payment_types?.type_name || 'PAYMENT').replace(/[~\r\n]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 35).toUpperCase();

          gefuContent += `D~N06~HOSPITAL_ACCOUNT~HOSPITAL_NAME~ADDRESS1~ADDRESS2~ADDRESS3~${payment.ifsc_code}~${payment.account_number}~${payment.account_holder_name}~~~~~${seq}~${dd}/${mm}/20${yy}~${netAmount}~${senderToRcvrInfo}~~~~\n`;
        });

        gefuContent += `F~${payments.length}~${totalNetAmount.toFixed(2)}\n`;

        const blob = new Blob([gefuContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = record.filename.replace('.txt', '-updated.txt');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Bank advice regenerated with latest bank details"
        });
      } else if (record.payment_source === 'staff_payment') {
        // Helper to sanitize GEFU fields
        const sanitizeGEFUField = (val: unknown): string => {
          return String(val ?? '')
            .replace(/[\r\n]+/g, ' ')
            .replace(/~/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
        };

        // Fetch website settings for hospital details
        const { data: websiteSettings } = await supabase
          .from('website_settings')
          .select('*')
          .eq('is_active', true)
          .single();

        // For staff payments
        const { data: payments } = await supabase
          .from('staff_payments')
          .select('*')
          .in('id', record.payment_ids);

        if (!payments || payments.length === 0) {
          throw new Error('No payment records found');
        }

        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const dateStr = `${dd}/${mm}/${yyyy}`;

        const hospAcc = sanitizeGEFUField(websiteSettings?.hospital_bank_account_number || '120000794291');
        const hospName = sanitizeGEFUField(websiteSettings?.hospital_bank_account_holder_name || 'WESTMED HEALTHCARE PRIVATE LIMITED');
        const hospCode = sanitizeGEFUField(websiteSettings?.hospital_institution_code || 'ABC07112007');

        let gefuContent = `H~${dateStr}~${hospCode}\n`;
        
        let totalAmount = 0;
        payments.forEach((payment: any, index: number) => {
          const amount = Number(payment.amount);
          totalAmount += amount;

          const detailLine = [
            'D',
            'N06',
            hospAcc,
            hospName,
            sanitizeGEFUField('ADDRESS1'),
            sanitizeGEFUField('ADDRESS2'),
            sanitizeGEFUField('ADDRESS3'),
            sanitizeGEFUField(payment.ifsc_code),
            sanitizeGEFUField(payment.account_number),
            sanitizeGEFUField(payment.account_holder_name),
            '', '', '', '',  // Four empty fields
            (index + 1).toString(),
            dateStr,
            amount.toFixed(2),
            'STAFF PAYMENT',
            '', '', '', ''  // Four empty fields at the end
          ].join('~');
          
          gefuContent += detailLine + '\n';
        });

        gefuContent += `F~${payments.length}~${totalAmount.toFixed(2)}`;

        const blob = new Blob([gefuContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = record.filename.replace('.txt', '-updated.txt');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Bank advice regenerated with latest bank details"
        });
      }
    } catch (error) {
      console.error('Error regenerating bank advice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to regenerate bank advice"
      });
    }
  };

  const filteredRecords = records.filter(record => {
    // Apply filename search filter
    if (filters.doctorSearch) {
      const searchTerm = filters.doctorSearch.toLowerCase();
      const matchesFilename = record.filename.toLowerCase().includes(searchTerm);
      if (!matchesFilename) {
        return false;
      }
    }
    return true;
  });

  // Calculate pagination
  const indexOfLastRecord = recordsPerPage === 'all' 
    ? filteredRecords.length 
    : currentPage * recordsPerPage;
  const indexOfFirstRecord = recordsPerPage === 'all' 
    ? 0 
    : indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  // Calculate statistics
  const totalGenerated = filteredRecords.length;
  const totalAmount = filteredRecords.reduce((sum, r) => sum + r.total_amount, 0);
  const totalPayments = filteredRecords.reduce((sum, r) => sum + r.payment_count, 0);
  
  // This month count
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthRecords = filteredRecords.filter(r => 
    new Date(r.created_at) >= thisMonthStart
  );

  if (userRole !== 'admin' && userRole !== 'manager') {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              Only administrators and managers can view bank advice reports.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Bank Advice History</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bank Advice History</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            View and analyze all generated bank advice files
          </p>
        </div>
        
        <ReportGeneration
          title="Bank Advice History Report"
          data={filteredRecords}
          columns={[
            { key: 'filename', label: 'Filename' },
            { key: 'generation_date', label: 'Generation Date', format: (value: string) => formatDateIST(value) },
            { key: 'created_at', label: 'Generated At', format: (value: string) => formatDateTimeIST(value) },
            { key: 'payment_count', label: 'Payment Count' },
            { key: 'total_amount', label: 'Total Amount', format: (value: number) => formatCurrency(value) },
            { key: 'generator_name', label: 'Generated By' }
          ]}
          filename="bank_advice_history_report"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Files</p>
                <p className="text-lg md:text-2xl font-bold">{totalGenerated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-lg md:text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Payments</p>
                <p className="text-lg md:text-2xl font-bold">{totalPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-lg md:text-2xl font-bold">{thisMonthRecords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Filter className="h-4 w-4 md:h-5 md:w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctorSearch" className="text-xs md:text-sm">Search Filename</Label>
                <Input
                  id="doctorSearch"
                  type="text"
                  placeholder="Search by filename..."
                  value={filters.doctorSearch}
                  onChange={(e) => setFilters({ ...filters, doctorSearch: e.target.value })}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-xs md:text-sm">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-xs md:text-sm">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
            
            {/* Quick Filters */}
            <div className="space-y-2">
              <Label className="text-xs md:text-sm text-muted-foreground">Quick Filters:</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuickFilter(0)} className="text-xs">
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickFilter(7)} className="text-xs">
                  Last 7 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickFilter(30)} className="text-xs">
                  Last 30 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickFilter(90)} className="text-xs">
                  Last 3 Months
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setFilters({ dateFrom: '', dateTo: '', doctorSearch: '' })}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Advice Records ({filteredRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length > 0 && (
            <PaginationControls
              totalRecords={filteredRecords.length}
              recordsPerPage={recordsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onRecordsPerPageChange={setRecordsPerPage}
              className="mb-4"
            />
          )}
          
          <div className="space-y-3">
            {currentRecords.map((record, index) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 md:p-4">
                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {recordsPerPage === 'all' ? index + 1 : indexOfFirstRecord + index + 1}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{record.filename}</p>
                          <Badge variant="outline" className="text-xs">{record.payment_count} payments</Badge>
                          <Badge variant={
                            record.payment_source === 'doctor' ? 'default' : 
                            record.payment_source === 'quick_payment' ? 'secondary' : 
                            'outline'
                          } className="text-xs">
                            {record.payment_source === 'doctor' ? 'Doctor Payments' : 
                             record.payment_source === 'quick_payment' ? 'Quick Payments' : 
                             'Staff Payments'}
                          </Badge>
                          {getStatusBadge(record.reconciliation_status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTimeIST(record.created_at)}
                          </span>
                          <span>by {record.generator_name}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Amount Display */}
                      <div className="text-right mr-4">
                        <p className="text-sm font-bold text-primary">
                          {formatCurrency(record.total_amount)}
                        </p>
                      </div>
                      
                      {/* Action Icons with Tooltips */}
                      <TooltipProvider>
                        <div className="flex items-center gap-1">
                          {/* Update Status Button */}
                          {record.reconciliation_status !== 'completed' ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                                  onClick={() => openReconciliationDialog(record)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Update Status</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-green-600 cursor-default"
                                  disabled
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reconciled ✓</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {/* Download Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 hover:bg-blue-50 hover:text-blue-600"
                                onClick={() => handleDownload(record)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          {/* Regenerate Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 hover:bg-orange-50 hover:text-orange-600"
                                onClick={() => handleRegenerate(record)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Regenerate</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          {/* View Details Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 hover:bg-purple-50 hover:text-purple-600"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setDetailsDialog(true);
                                  fetchPaymentDetails(record);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View Details</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="flex md:hidden flex-col space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          #{recordsPerPage === 'all' ? index + 1 : indexOfFirstRecord + index + 1}
                        </Badge>
                        <p className="font-semibold text-sm">{record.filename}</p>
                      </div>
                      {getStatusBadge(record.reconciliation_status)}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">{record.payment_count} payments</Badge>
                      <Badge variant={
                        record.payment_source === 'doctor' ? 'default' : 
                        record.payment_source === 'quick_payment' ? 'secondary' : 
                        'outline'
                      } className="text-xs">
                        {record.payment_source === 'doctor' ? 'Doctor' : 
                         record.payment_source === 'quick_payment' ? 'Quick' : 
                         'Staff'}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTimeIST(record.created_at)}
                      </div>
                      <div>by {record.generator_name}</div>
                    </div>
                    
                    {/* Amount and Actions Row */}
                    <div className="flex items-center justify-between">
                      <div className="py-2 px-3 bg-primary/5 rounded-md">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(record.total_amount)}
                        </p>
                      </div>
                      
                      {/* Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9 w-9">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                          {record.reconciliation_status !== 'completed' ? (
                            <DropdownMenuItem
                              onClick={() => openReconciliationDialog(record)}
                              className="cursor-pointer"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Update Status
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled className="text-green-600">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Reconciled ✓
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem
                            onClick={() => handleDownload(record)}
                            className="cursor-pointer"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => handleRegenerate(record)}
                            className="cursor-pointer"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRecord(record);
                              setDetailsDialog(true);
                              fetchPaymentDetails(record);
                            }}
                            className="cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRecords.length > 0 && (
            <PaginationControls
              totalRecords={filteredRecords.length}
              recordsPerPage={recordsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onRecordsPerPageChange={setRecordsPerPage}
              className="mt-4"
            />
          )}

          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Records Found</h3>
              <p className="text-muted-foreground">
                No bank advice records match your current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Bank Advice Details</DialogTitle>
          </DialogHeader>
          
            {selectedRecord && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Filename</Label>
                    <p className="font-medium">{selectedRecord.filename}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Count</Label>
                    <p className="font-medium">{selectedRecord.payment_count}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Amount</Label>
                    <p className="font-medium text-primary">{formatCurrency(selectedRecord.total_amount)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Generation Date</Label>
                    <p className="font-medium">{formatDateIST(selectedRecord.generation_date)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Generated At</Label>
                    <p className="font-medium">{formatDateTimeIST(selectedRecord.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Generated By</Label>
                    <p className="font-medium">{selectedRecord.generator_name || 'Unknown'}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground mb-3 block">
                    Payment Details ({selectedRecord.payment_ids.length} payments)
                  </Label>
                  
                  {loadingPaymentDetails ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading payment details...</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {paymentDetails.map((payment, index) => (
                          <Card key={payment.id} className="p-4 hover:bg-muted/50 transition-colors">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">Payment #{index + 1}</Label>
                                <p className="font-semibold text-sm">{payment.beneficiary_name}</p>
                                {payment.beneficiary_code && (
                                  <p className="text-xs text-muted-foreground">Code: {payment.beneficiary_code}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <Label className="text-xs text-muted-foreground">Amount</Label>
                                <p className="font-bold text-primary">{formatCurrency(payment.amount)}</p>
                                {payment.tds_amount > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Gross: {formatCurrency(payment.gross_amount)} | TDS: {formatCurrency(payment.tds_amount)}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <Separator className="my-2" />
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <Label className="text-muted-foreground">Account Holder</Label>
                                <p className="font-medium">{payment.account_holder}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Bank</Label>
                                <p className="font-medium">{payment.bank_name}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Account Number</Label>
                                <p className="font-mono">{payment.account_number}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">IFSC Code</Label>
                                <p className="font-mono">{payment.ifsc_code}</p>
                              </div>
                              {payment.branch_name && (
                                <div className="col-span-2">
                                  <Label className="text-muted-foreground">Branch</Label>
                                  <p className="font-medium">{payment.branch_name}</p>
                                </div>
                              )}
                            </div>
                            
                            <Badge variant="outline" className="mt-2 text-xs">
                              {payment.payment_type}
                            </Badge>
                          </Card>
                        ))}
                        
                        {paymentDetails.length === 0 && !loadingPaymentDetails && (
                          <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">No payment details available</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog(false)}>
              Close
            </Button>
            <Button onClick={() => selectedRecord && handleDownload(selectedRecord)}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Dialog */}
      <Dialog open={reconciliationDialog} onOpenChange={setReconciliationDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Reconciliation Status</DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm">Bank Advice File</Label>
                <p className="font-medium">{selectedRecord.filename}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord.payment_count} payments • {formatCurrency(selectedRecord.total_amount)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reconciliation-status">Reconciliation Status</Label>
                <Select 
                  value={reconciliationForm.status}
                  onValueChange={(value) => setReconciliationForm({ ...reconciliationForm, status: value as ReconciliationStatus })}
                  disabled={selectedRecord.reconciliation_status === 'completed'}
                >
                  <SelectTrigger id="reconciliation-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">🟡 Pending</SelectItem>
                    <SelectItem value="in_process">🔵 In Process</SelectItem>
                    <SelectItem value="completed">🟢 Completed</SelectItem>
                    <SelectItem value="failed">🔴 Failed</SelectItem>
                    <SelectItem value="partial">⚠️ Partial</SelectItem>
                  </SelectContent>
                </Select>
                {selectedRecord.reconciliation_status === 'completed' && (
                  <p className="text-xs text-muted-foreground">
                    ✓ Completed reconciliations are locked for audit trail protection
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation-date">Bank Confirmation Date</Label>
                <Input
                  id="confirmation-date"
                  type="date"
                  value={reconciliationForm.bank_confirmation_date}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, bank_confirmation_date: e.target.value })}
                  disabled={selectedRecord.reconciliation_status === 'completed'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference-number">Bank Reference Number</Label>
                <Input
                  id="reference-number"
                  type="text"
                  placeholder="UTR/Transaction ID"
                  value={reconciliationForm.bank_reference_number}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, bank_reference_number: e.target.value })}
                  disabled={selectedRecord.reconciliation_status === 'completed'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Reconciliation Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any discrepancies or additional remarks..."
                  value={reconciliationForm.reconciliation_notes}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, reconciliation_notes: e.target.value })}
                  disabled={selectedRecord.reconciliation_status === 'completed'}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof-file">Reconciliation Proof (PDF/Image)</Label>
                <div className="space-y-2">
                  <Input
                    id="proof-file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    disabled={selectedRecord.reconciliation_status === 'completed' || uploadingFile}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload bank statement screenshot, PDF, or confirmation image (Max 5MB)
                  </p>
                  
                  {/* Show existing file */}
                  {selectedRecord.reconciliation_proof_file_path && !selectedFile && (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm flex-1 truncate">
                        {selectedRecord.reconciliation_proof_file_name || 'Reconciliation Proof'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewProofFile(selectedRecord)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadProofFile(selectedRecord)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Show selected file preview */}
                  {selectedFile && (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm flex-1 truncate">
                        {selectedFile.name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreviewUrl(null);
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Image preview */}
                  {filePreviewUrl && selectedFile?.type.startsWith('image/') && (
                    <div className="border rounded-md overflow-hidden">
                      <img 
                        src={filePreviewUrl} 
                        alt="Preview" 
                        className="w-full h-auto max-h-48 object-contain bg-muted"
                      />
                    </div>
                  )}
                  
                  {uploadingFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Uploading file...
                    </div>
                  )}
                </div>
              </div>

              {selectedRecord.reconciliation_status === 'completed' && selectedRecord.reconciled_at && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-sm">Reconciliation Info</Label>
                  <div className="text-sm space-y-1 mt-2">
                    <p>✓ Reconciled by: {selectedRecord.reconciler_name || 'Unknown'}</p>
                    <p>✓ Reconciled on: {formatDateTimeIST(selectedRecord.reconciled_at)}</p>
                    {selectedRecord.bank_confirmation_date && (
                      <p>✓ Bank confirmed: {formatDateIST(selectedRecord.bank_confirmation_date)}</p>
                    )}
                    {selectedRecord.bank_reference_number && (
                      <p>✓ Reference: {selectedRecord.bank_reference_number}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReconciliationDialog(false)}>
              Cancel
            </Button>
            {selectedRecord && selectedRecord.reconciliation_status !== 'completed' && (
              <Button onClick={handleReconciliationUpdate}>
                Update Status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankAdviceReports;
