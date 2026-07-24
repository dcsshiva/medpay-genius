import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Users, Stethoscope, Search, Edit, Trash2, CheckCircle, Clock, TrendingUp, Activity, FileText, X, Download, Upload, DollarSign, Printer } from 'lucide-react';
import { printReport } from '@/lib/printUtils';
import { DoctorSearchCombobox } from '@/components/ui/doctor-search-combobox';
import * as XLSX from 'xlsx';
import { parseExcelFile, generatePatientId, analyzeVisitImport, ImportResults } from '@/lib/excelImportUtils';
import { VisitManagementTable } from './VisitManagementTable';
import { formatDateIST, formatDateTimeIST, formatInputDateIST, getCurrentISTDate } from '@/lib/dateUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportGeneration from './ReportGeneration';
import { StatsCard } from '@/components/ui/stats-card';
import { LoadingScreen } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChips } from '@/components/ui/filter-chip';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Visit {
  id: string;
  visit_code?: string;
  visit_date: string;
  patient_count: number;
  patient_id?: string;
  patient_name: string;
  visit_payment?: number;
  payment_type: string;
  visit_reason: string;
  notes?: string;
  doctor_id: string;
  is_processed: boolean;
  processed_in_payment_id?: string;
  processed_at?: string;
  insurance_company_id?: string;
  insurance_company_name?: string;
  insurance_company_code?: string;
  doctors: {
    doctor_code: string;
    profiles: {
      full_name: string;
    };
  };
}

interface InsuranceCompany {
  id: string;
  company_name: string;
  company_code?: string;
}

interface Doctor {
  id: string;
  doctor_code: string;
  profiles: {
    full_name: string;
  };
}

interface VisitManagementProps {
  initialSubTab?: string;
}

const VisitManagement = ({ initialSubTab }: VisitManagementProps = {}) => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [visitReasons, setVisitReasons] = useState<Array<{
    id: string;
    reason_code: string;
    reason_name: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'doctor_name' | 'doctor_code' | 'patient_name' | 'insurance_company' | 'payment_type_cash' | 'payment_type_insurance'>('all');
  const [sortField, setSortField] = useState<'visit_date' | 'patient_name' | 'doctor_name'>('visit_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeSubTab, setActiveSubTab] = useState('unprocessed');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  
  // Pagination states for unprocessed visits
  const [unprocessedCurrentPage, setUnprocessedCurrentPage] = useState(1);
  const [unprocessedRecordsPerPage, setUnprocessedRecordsPerPage] = useState<number | 'all'>(20);
  
  // Pagination states for processed visits
  const [processedCurrentPage, setProcessedCurrentPage] = useState(1);
  const [processedRecordsPerPage, setProcessedRecordsPerPage] = useState<number | 'all'>(20);
  
  const [formData, setFormData] = useState({
    visit_date: formatInputDateIST(getCurrentISTDate()),
    patient_id: '',
    patient_name: '',
    visit_payment: '',
    payment_type: 'cash',
    visit_reason: '',
    notes: '',
    doctor_id: '',
    insurance_company_id: ''
  });

  useEffect(() => {
    fetchVisits();
    fetchInsuranceCompanies();
    fetchVisitReasons();
    if (userRole === 'admin' || userRole === 'manager') {
      fetchDoctors();
    }
  }, [userRole]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const fetchVisits = async () => {
    try {
      // Use auth_user_id for doctor to match RLS policies
      const userId = userRole === 'doctor' 
        ? user?.user_metadata?.auth_user_id || user?.id
        : user?.id;

      // Paginate the RPC to bypass PostgREST's 1000-row response cap.
      const { fetchAllPaginatedRpc } = await import('@/lib/fetchAllPaginated');
      let data: any[] = [];
      try {
        data = await fetchAllPaginatedRpc<any>(() =>
          supabase.rpc('get_user_visits', {
            _user_type: userRole === 'doctor' ? 'doctor' : 'staff',
            _user_id: userId,
            _user_role: userRole || 'staff'
          }) as any
        );
      } catch (error) {
        console.error('Error fetching visits:', error);
        setVisits([]);
        return;
      }

      {
        // Transform the RPC response to match the expected format
        const transformedVisits = data?.map((visit: any) => ({
          id: visit.id,
          visit_code: visit.visit_code,
          visit_date: visit.visit_date,
          patient_count: visit.patient_count,
          patient_id: visit.patient_id,
          patient_name: visit.patient_name,
          visit_payment: visit.visit_payment,
          payment_type: visit.payment_type,
          visit_reason: visit.visit_reason,
          notes: visit.notes,
          doctor_id: visit.doctor_id,
          is_processed: visit.is_processed,
          processed_in_payment_id: visit.processed_in_payment_id,
          processed_at: visit.processed_at,
          insurance_company_id: visit.insurance_company_id,
          insurance_company_name: visit.insurance_company_name,
          insurance_company_code: visit.insurance_company_code,
          doctors: {
            doctor_code: visit.doctor_code,
            profiles: {
              full_name: visit.doctor_name
            }
          }
        })) || [];
        setVisits(transformedVisits);
      }
    } catch (error) {
      console.error('Error:', error);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          doctor_code,
          full_name
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

  const fetchInsuranceCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('id, company_name, company_code')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setInsuranceCompanies(data || []);
    } catch (error) {
      console.error('Error fetching insurance companies:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch insurance companies"
      });
    }
  };

  const fetchVisitReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_reasons')
        .select('id, reason_code, reason_name')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setVisitReasons(data || []);
    } catch (error) {
      console.error('Error fetching visit reasons:', error);
    }
  };

  // Reset unprocessed pagination when filters change
  useEffect(() => {
    setUnprocessedCurrentPage(1);
  }, [searchQuery, searchFilter]);

  // Reset processed pagination when filters change
  useEffect(() => {
    setProcessedCurrentPage(1);
  }, [searchQuery, searchFilter]);

  const handleDownloadTemplate = async () => {
    try {
      // Prepare data for template
      const doctorData = doctors.map(d => ({
        doctor_code: d.doctor_code,
        full_name: d.profiles?.full_name || '',
        specialization: '' // Add if available in your schema
      }));
      
      const insuranceData = insuranceCompanies.map(ic => ({
        company_code: ic.company_code || '',
        company_name: ic.company_name
      }));
      
      const visitReasonData = visitReasons.map(vr => ({
        reason_code: vr.reason_code,
        reason_name: vr.reason_name
      }));
      
      // Dynamically import the template generator
      const { generateVisitTemplate } = await import('@/lib/excelImportUtils');
      
      await generateVisitTemplate(doctorData, insuranceData, visitReasonData);
      
      toast({
        title: "Template Downloaded",
        description: "Visit import template has been downloaded successfully"
      });
    } catch (error) {
      console.error('Template generation error:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: `Failed to generate template: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleVisitImport = async () => {
    if (!importFile) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select an Excel file to import"
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Parse Excel file
      const rows = await parseExcelFile(importFile);
      
      if (rows.length === 0) {
        toast({
          variant: "destructive",
          title: "Empty File",
          description: "The Excel file contains no data rows"
        });
        setSubmitting(false);
        return;
      }
      
      const results: ImportResults = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };
      
      // Fetch existing visits for duplicate detection — scoped to only the
      // (doctor_id, visit_date) pairs that appear in the import, and paginated
      // to bypass the 1000-row PostgREST cap. Selects only the columns
      // analyzeVisitImport actually needs.
      const { fetchAllPaginated } = await import('@/lib/fetchAllPaginated');
      const importDoctorCodes = Array.from(new Set(
        rows.map((r: any) => {
          const m = r.doctor?.toString().trim().match(/^([A-Z]{3}\d+)/i);
          return m ? m[1].toUpperCase() : null;
        }).filter(Boolean)
      )) as string[];
      const importDoctorIds = doctors
        .filter(d => importDoctorCodes.includes(d.doctor_code))
        .map(d => d.id);

      const existingVisits = importDoctorIds.length > 0
        ? await fetchAllPaginated<any>(() =>
            supabase
              .from('visits')
              .select('id, doctor_id, patient_name, visit_date, visit_payment')
              .in('doctor_id', importDoctorIds) as any
          )
        : [];
      
      
      const visitsToInsert = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // Excel row (header is row 1)
        
        try {
          // === 1. PARSE DOCTOR ===
          const doctorStr = row.doctor?.toString().trim();
          if (!doctorStr || doctorStr.includes('Select from dropdown')) {
            results.errors.push({
              row: rowNumber,
              message: 'Doctor is required'
            });
            continue;
          }
          
          // Extract doctor code (format: "DOC001 - Dr. Name")
          const doctorCodeMatch = doctorStr.match(/^([A-Z]{3}\d+)/i);
          if (!doctorCodeMatch) {
            results.errors.push({
              row: rowNumber,
              message: `Invalid doctor format: ${doctorStr}`
            });
            continue;
          }
          
          const doctorCode = doctorCodeMatch[1].toUpperCase();
          const doctor = doctors.find(d => d.doctor_code === doctorCode);
          
          if (!doctor) {
            results.errors.push({
              row: rowNumber,
              message: `Doctor not found: ${doctorCode}`
            });
            continue;
          }
          
          // === 2. VALIDATE VISIT DATE ===
          let visitDate: string;
          
          if (row.visit_date instanceof Date) {
            visitDate = row.visit_date.toISOString().split('T')[0];
          } else if (typeof row.visit_date === 'number') {
            // Excel serial date
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + row.visit_date * 86400000);
            visitDate = date.toISOString().split('T')[0];
          } else if (typeof row.visit_date === 'string') {
            visitDate = row.visit_date.trim();
          } else {
            results.errors.push({
              row: rowNumber,
              message: 'Visit date is required'
            });
            continue;
          }
          
          // Validate: no future dates
          const today = getCurrentISTDate();
          const selectedDate = new Date(visitDate);
          today.setHours(0, 0, 0, 0);
          selectedDate.setHours(0, 0, 0, 0);
          
          if (selectedDate > today) {
            results.errors.push({
              row: rowNumber,
              message: `Visit date cannot be in the future: ${visitDate}`
            });
            continue;
          }
          
          // === 3. VALIDATE PATIENT NAME ===
          const patientName = row.patient_name?.toString().trim();
          if (!patientName) {
            results.errors.push({
              row: rowNumber,
              message: 'Patient name is required'
            });
            continue;
          }
          
          // === 4. GENERATE PATIENT ID IF EMPTY ===
          let patientId = row.patient_id?.toString().trim();
          if (!patientId || patientId.includes('Optional') || patientId.includes('Auto-generated')) {
            patientId = await generatePatientId(supabase);
          }
          
          // === 5. VALIDATE PAYMENT AMOUNT ===
          const paymentAmount = parseFloat(row.payment_amount);
          if (isNaN(paymentAmount) || paymentAmount <= 0) {
            results.errors.push({
              row: rowNumber,
              message: `Invalid payment amount: ${row.payment_amount}`
            });
            continue;
          }
          
          // Enforce whole numbers (no decimals)
          if (paymentAmount % 1 !== 0) {
            results.errors.push({
              row: rowNumber,
              message: `Payment amount must be a whole number (no decimals): ${paymentAmount}`
            });
            continue;
          }
          
          // === 6. VALIDATE PAYMENT TYPE ===
          const paymentType = row.payment_type?.toString().trim().toLowerCase();
          if (!paymentType || (paymentType !== 'cash' && paymentType !== 'insurance')) {
            results.errors.push({
              row: rowNumber,
              message: `Invalid payment type: ${row.payment_type} (must be cash or insurance)`
            });
            continue;
          }
          
          // === 7. VALIDATE VISIT REASON ===
          const visitReasonStr = row.visit_reason?.toString().trim();
          if (!visitReasonStr || visitReasonStr.includes('Select from dropdown')) {
            results.errors.push({
              row: rowNumber,
              message: 'Visit reason is required'
            });
            continue;
          }
          
          // Extract reason code (format: "CONS - Consultation")
          const reasonCodeMatch = visitReasonStr.match(/^([A-Z0-9]+)/i);
          if (!reasonCodeMatch) {
            results.errors.push({
              row: rowNumber,
              message: `Invalid visit reason format: ${visitReasonStr}`
            });
            continue;
          }
          
          const reasonCode = reasonCodeMatch[1].toUpperCase();
          const visitReason = visitReasons.find(vr => vr.reason_code === reasonCode);
          
          if (!visitReason) {
            results.errors.push({
              row: rowNumber,
              message: `Visit reason not found: ${reasonCode}`
            });
            continue;
          }
          
          // === 8. VALIDATE INSURANCE COMPANY (if payment type is insurance) ===
          let insuranceCompanyId = null;
          
          if (paymentType === 'insurance') {
            const insuranceStr = row.insurance_company?.toString().trim();
            
            if (!insuranceStr || insuranceStr.includes('Required if Payment Type')) {
              results.errors.push({
                row: rowNumber,
                message: 'Insurance company is required when payment type is insurance'
              });
              continue;
            }
            
            // Extract company code (format: "IC001 - Company Name")
            const companyCodeMatch = insuranceStr.match(/^([A-Z0-9]+)/i);
            if (!companyCodeMatch) {
              results.errors.push({
                row: rowNumber,
                message: `Invalid insurance company format: ${insuranceStr}`
              });
              continue;
            }
            
            const companyCode = companyCodeMatch[1].toUpperCase();
            const insuranceCompany = insuranceCompanies.find(ic => ic.company_code === companyCode);
            
            if (!insuranceCompany) {
              results.errors.push({
                row: rowNumber,
                message: `Insurance company not found: ${companyCode}`
              });
              continue;
            }
            
            insuranceCompanyId = insuranceCompany.id;
          }
          
          // === 9. DUPLICATE DETECTION ===
          const importData = {
            doctor_id: doctor.id,
            patient_name: patientName,
            visit_date: visitDate,
            visit_payment: paymentAmount
          };
          
          const decision = analyzeVisitImport(importData, existingVisits || []);
          
          if (decision.action === 'skip') {
            results.skipped++;
            continue;
          }
          
          // === 10. PREPARE FOR INSERT ===
          const notes = row.notes?.toString().trim() || null;
          
          visitsToInsert.push({
            visit_date: visitDate,
            patient_count: 1,
            patient_id: patientId,
            patient_name: patientName,
            visit_payment: paymentAmount,
            payment_type: paymentType,
            visit_reason: visitReason.reason_code,
            notes: notes,
            doctor_id: doctor.id,
            insurance_company_id: insuranceCompanyId
          });
          
        } catch (error) {
          results.errors.push({
            row: rowNumber,
            message: `Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
      
      // === 11. BATCH INSERT ===
      if (visitsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('visits')
          .insert(visitsToInsert);
        
        if (insertError) {
          throw insertError;
        }
        
        results.inserted = visitsToInsert.length;
      }
      
      // === 12. SHOW RESULTS ===
      setImportResults(results);
      
      const totalProcessed = results.inserted + results.skipped + results.errors.length;
      
      toast({
        title: "Import Complete",
        description: `Processed ${totalProcessed} rows: ${results.inserted} inserted, ${results.skipped} skipped, ${results.errors.length} errors`
      });
      
      // Refresh visits
      fetchVisits();
      
      // Close import dialog if no errors
      if (results.errors.length === 0) {
        setImportDialogOpen(false);
        setImportFile(null);
      }
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: `Failed to import visits: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setSubmitting(false);
    }
  };

  const exportVisitsToExcel = () => {
    // Get current filtered and sorted visits
    const unprocessedVisits = visits.filter(v => !v.is_processed);
    const processedVisits = visits.filter(v => v.is_processed);
    
    // Determine which tab is active
    const visitsToExport = activeSubTab === 'unprocessed' ? unprocessedVisits : processedVisits;
    
    // Apply search filter
    const filteredVisits = filterVisits(visitsToExport, searchQuery, searchFilter);
    
    if (filteredVisits.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "There are no visits to export. Please adjust your filters."
      });
      return;
    }
    
    // Format data for Excel export
    const exportData = filteredVisits.map(visit => ({
      'Visit Code': visit.visit_code || 'N/A',
      'Visit Date': formatDateIST(visit.visit_date),
      'Doctor Code': visit.doctors?.doctor_code || 'N/A',
      'Doctor Name': visit.doctors?.profiles?.full_name || 'N/A',
      'Patient ID': visit.patient_id || 'N/A',
      'Patient Name': visit.patient_name,
      'Patient Count': visit.patient_count,
      'Payment Type': visit.payment_type === 'cash' ? 'Cash' : 'Insurance',
      'Insurance Company': visit.insurance_company_name || 'N/A',
      'Visit Payment': visit.visit_payment?.toFixed(0) || '0',
      'Visit Reason': visit.visit_reason,
      'Notes': visit.notes || '',
      'Status': visit.is_processed ? 'Processed' : 'Pending',
      'Processed At': visit.processed_at ? formatDateTimeIST(visit.processed_at) : 'N/A'
    }));
    
    try {
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Visit Code
        { wch: 12 }, // Visit Date
        { wch: 12 }, // Doctor Code
        { wch: 25 }, // Doctor Name
        { wch: 15 }, // Patient ID
        { wch: 25 }, // Patient Name
        { wch: 12 }, // Patient Count
        { wch: 15 }, // Payment Type
        { wch: 25 }, // Insurance Company
        { wch: 15 }, // Visit Payment
        { wch: 20 }, // Visit Reason
        { wch: 30 }, // Notes
        { wch: 12 }, // Status
        { wch: 20 }  // Processed At
      ];
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Visits');
      
      // Generate filename
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const status = activeSubTab === 'unprocessed' ? 'pending' : 'processed';
      const filename = `visits_${status}_${day}${month}${year}_${hours}${minutes}_westmed.xlsx`;
      
      // Download
      XLSX.writeFile(wb, filename);
      
      toast({
        title: "Export Successful",
        description: `${filteredVisits.length} visit(s) exported to Excel successfully`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: `Failed to export visits: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Real-time subscription for visit reasons
  useEffect(() => {
    const channel = supabase
      .channel('visit-reasons-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visit_reasons'
        },
        (payload) => {
          console.log('Visit reason change detected:', payload);
          fetchVisitReasons();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isFormValid = () => {
    // Basic required fields
    if (!formData.patient_name.trim()) return false;
    if (!formData.visit_payment || parseFloat(formData.visit_payment) <= 0) return false;
    if (!formData.payment_type) return false;
    if (!formData.visit_reason) return false;
    
    // Date validation: discharge date cannot be in the future
    const today = getCurrentISTDate();
    const selectedDate = new Date(formData.visit_date);
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate > today) return false;
    
    // Doctor required for admin/manager
    if ((userRole === 'admin' || userRole === 'manager') && !formData.doctor_id) return false;
    
    // Insurance company required when payment type is insurance
    if (formData.payment_type === 'insurance' && !formData.insurance_company_id) return false;
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: insurance company required when payment type is insurance
    if (formData.payment_type === 'insurance' && !formData.insurance_company_id) {
      toast({
        variant: "destructive",
        title: "Insurance Company Required",
        description: "Please select an insurance company before recording this visit"
      });
      return;
    }
    
    setSubmitting(true);

    // Validation: discharge date cannot be in the future
    const today = getCurrentISTDate();
    const selectedDate = new Date(formData.visit_date);
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      toast({
        variant: "destructive",
        title: "Invalid Discharge Date",
        description: "Discharge date cannot be a future date. Please select today or a past date."
      });
      setSubmitting(false);
      return;
    }

    try {
      const doctorId = (userRole === 'admin' || userRole === 'manager')
        ? formData.doctor_id 
        : (user?.user_metadata?.original_id || user?.id);

      const visitData = {
        visit_date: formData.visit_date,
        patient_count: 1,
        patient_id: formData.patient_id || null,
        patient_name: formData.patient_name,
        visit_payment: parseFloat(formData.visit_payment),
        payment_type: formData.payment_type,
        visit_reason: formData.visit_reason,
        notes: formData.notes || null,
        doctor_id: doctorId,
        insurance_company_id: formData.payment_type === 'insurance' ? formData.insurance_company_id : null
      };

      if (editingVisit) {
        // Update existing visit
        const { error } = await supabase
          .from('visits')
          .update(visitData)
          .eq('id', editingVisit.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Visit updated successfully"
        });
      } else {
        // Create new visit
        const { error } = await supabase
          .from('visits')
          .insert([visitData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Visit recorded successfully"
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchVisits();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save visit"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      visit_date: formatInputDateIST(getCurrentISTDate()),
      patient_id: '',
      patient_name: '',
      visit_payment: '',
      payment_type: 'cash',
      visit_reason: '',
      notes: '',
      doctor_id: '',
      insurance_company_id: ''
    });
    setEditingVisit(null);
  };

  const handleEdit = async (visit: Visit) => {
    // Always reload from DB so we never prefill stale cached values
    let fresh: Visit = visit;
    try {
      const { data } = await supabase.from('visits').select('*').eq('id', visit.id).maybeSingle();
      if (data) fresh = { ...visit, ...(data as any) } as Visit;
    } catch { /* fall back */ }
    setFormData({
      visit_date: fresh.visit_date,
      patient_id: fresh.patient_id || '',
      patient_name: fresh.patient_name,
      visit_payment: fresh.visit_payment?.toString() || '',
      payment_type: fresh.payment_type,
      visit_reason: fresh.visit_reason,
      notes: fresh.notes || '',
      doctor_id: fresh.doctor_id,
      insurance_company_id: fresh.insurance_company_id || ''
    });
    setEditingVisit(fresh);
    setDialogOpen(true);
  };

  const handleDelete = async (visitId: string) => {
    if (!confirm('Are you sure you want to delete this visit?')) return;

    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Visit deleted successfully"
      });
      
      fetchVisits();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete visit"
      });
    }
  };

  // Filter visits by search term and filter type
  const filterVisits = (visitList: Visit[], term: string, filter: typeof searchFilter) => {
    // Handle payment type filters (no search term needed)
    if (filter === 'payment_type_cash') {
      return visitList.filter(visit => visit.payment_type === 'cash');
    }
    if (filter === 'payment_type_insurance') {
      return visitList.filter(visit => visit.payment_type === 'insurance');
    }
    
    if (!term.trim()) return visitList;
    
    const lowerTerm = term.toLowerCase().trim();
    
    return visitList.filter(visit => {
      switch (filter) {
        case 'doctor_name':
          return visit.doctors?.profiles?.full_name?.toLowerCase().includes(lowerTerm);
        
        case 'doctor_code':
          return visit.doctors?.doctor_code?.toLowerCase().includes(lowerTerm);
        
        case 'patient_name':
          return visit.patient_name?.toLowerCase().includes(lowerTerm);
        
        case 'insurance_company':
          return visit.insurance_company_name?.toLowerCase().includes(lowerTerm);
        
        case 'all':
        default:
          // Search across all fields
          return (
            (visit.visit_code && visit.visit_code.toLowerCase().includes(lowerTerm)) ||
            visit.doctors?.profiles?.full_name?.toLowerCase().includes(lowerTerm) ||
            visit.doctors?.doctor_code?.toLowerCase().includes(lowerTerm) ||
            visit.patient_name?.toLowerCase().includes(lowerTerm) ||
            (visit.patient_id && visit.patient_id.toLowerCase().includes(lowerTerm)) ||
            (visit.insurance_company_name && visit.insurance_company_name.toLowerCase().includes(lowerTerm))
          );
      }
    });
  };

  // Handle click on doctor name in table to filter
  const handleDoctorNameClick = (doctorName: string) => {
    setSearchFilter('doctor_name');
    setSearchQuery(doctorName);
  };

  // Handle click on payment type badge to filter
  const handlePaymentTypeFilter = (paymentType: 'cash' | 'insurance') => {
    setSearchFilter(paymentType === 'cash' ? 'payment_type_cash' : 'payment_type_insurance');
    setSearchQuery('');
  };

  const getTotalPatients = () => {
    return visits.reduce((total, visit) => total + visit.patient_count, 0);
  };

  const getProcessedCount = () => {
    return visits.filter(v => v.is_processed).length;
  };

  const getCashVisits = () => {
    return visits.filter(v => v.payment_type === 'cash').length;
  };

  const getInsuranceVisits = () => {
    return visits.filter(v => v.payment_type === 'insurance').length;
  };

  const handlePaymentTypeNavigation = (paymentType: 'cash' | 'insurance') => {
    if (paymentType === 'cash') {
      navigate('/dashboard', { state: { activeTab: 'cash-payments' } });
    } else {
      navigate('/dashboard', { state: { activeTab: 'insurance-payments' } });
    }
    
    toast({
      title: "Navigation",
      description: `Opening ${paymentType === 'cash' ? 'Cash' : 'Insurance'} Payment Management`,
    });
  };

  if (loading) {
    return <LoadingScreen message="Loading visit data..." />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-foreground">Visit Management</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Record and manage patient visits</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Import/Export Buttons */}
          {(userRole === 'admin' || userRole === 'manager') && (
            <>
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                onClick={handleDownloadTemplate}
                disabled={doctors.length === 0 || insuranceCompanies.length === 0 || visitReasons.length === 0}
                className="text-xs md:text-sm"
              >
                <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                {isMobile ? "Template" : "Download Template"}
              </Button>
              
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import from Excel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import Visits from Excel</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="import-file">Select Excel File</Label>
                      <Input
                        id="import-file"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    
                    {importResults && (
                      <div className="border rounded p-4 space-y-2">
                        <h4 className="font-medium">Import Results:</h4>
                        <p className="text-sm text-green-600">✅ Inserted: {importResults.inserted}</p>
                        <p className="text-sm text-yellow-600">⏭️ Skipped: {importResults.skipped}</p>
                        <p className="text-sm text-red-600">❌ Errors: {importResults.errors.length}</p>
                        
                        {importResults.errors.length > 0 && (
                          <div className="mt-4 max-h-60 overflow-y-auto">
                            <h5 className="font-medium text-sm mb-2">Error Details:</h5>
                            {importResults.errors.map((err, idx) => (
                              <p key={idx} className="text-xs text-red-600">
                                Row {err.row}: {err.message}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setImportDialogOpen(false);
                          setImportFile(null);
                          setImportResults(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleVisitImport}
                        disabled={!importFile || submitting}
                      >
                        {submitting ? 'Importing...' : 'Import Visits'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                onClick={exportVisitsToExcel}
                disabled={visits.length === 0}
                className="text-xs md:text-sm"
              >
                <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                {isMobile ? "Export" : "Export Visits"}
              </Button>
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                onClick={() => {
                  const cols = [
                    { label: 'Visit Code', key: 'Visit Code' },
                    { label: 'Date', key: 'Date' },
                    { label: 'Doctor', key: 'Doctor' },
                    { label: 'Patient', key: 'Patient' },
                    { label: 'Type', key: 'Type' },
                    { label: 'Amount', key: 'Amount' },
                    { label: 'Status', key: 'Status' },
                  ];
                  const data = visits.map(v => ({
                    'Visit Code': v.visit_code || '-',
                    'Date': formatDateIST(v.visit_date),
                    'Doctor': v.doctors?.profiles?.full_name || '-',
                    'Patient': v.patient_name,
                    'Type': v.payment_type === 'cash' ? 'Cash' : 'Insurance',
                    'Amount': v.visit_payment?.toFixed(0) || '0',
                    'Status': v.is_processed ? 'Processed' : 'Pending',
                  }));
                  printReport({ title: 'Visit Report', columns: cols, data });
                }}
                disabled={visits.length === 0}
                className="text-xs md:text-sm"
              >
                <Printer className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                {isMobile ? "Print" : "Print Report"}
              </Button>
            </>
          )}
          
          {(userRole === 'admin' || userRole === 'manager' || userRole === 'doctor') && (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm"
              size={isMobile ? "sm" : "default"}
              onClick={() => {
                resetForm();
                setEditingVisit(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              {isMobile ? "Record" : "Record Visit"}
            </Button>
          )}
        </div>
      </div>

      {/* Record Visit Dialog/Sheet */}
      {(userRole === 'admin' || userRole === 'manager' || userRole === 'doctor') && (
        <>
          {isMobile ? (
            <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
              <SheetContent side="bottom" className="h-[95vh] flex flex-col p-0" hasUnsavedChanges={!!(formData.patient_name.trim() || formData.visit_payment.trim() || formData.notes.trim())} onConfirmClose={() => { resetForm(); setDialogOpen(false); }}>
                <div className="flex-shrink-0 p-4 border-b">
                  <h2 className="text-xl font-bold">
                    {editingVisit ? 'Edit Visit' : 'Record New Visit'}
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto px-4">
                  <form onSubmit={handleSubmit} className="space-y-2 py-4">
                    {/* Doctor & Patient Section */}
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Users className="h-4 w-4" />
                            <span>DOCTOR & PATIENT</span>
                          </div>
                          <div className="space-y-3 pl-4">
                            <div className="space-y-1">
                              <Label htmlFor="doctor_id" className="text-sm">Doctor *</Label>
                              <DoctorSearchCombobox
                                doctors={doctors}
                                value={formData.doctor_id}
                                onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}
                                placeholder="Type 3+ characters to search doctor..."
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="patient_name" className="text-sm">Patient Name *</Label>
                              <Input
                                id="patient_name"
                                value={formData.patient_name}
                                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                                placeholder="Enter patient name"
                                required
                                className="h-9 text-sm"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="patient_id" className="text-sm">Patient ID</Label>
                              <Input
                                id="patient_id"
                                value={formData.patient_id}
                                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                                placeholder="Optional"
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t" />
                      </>
                    )}

                    {/* Visit Details Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <FileText className="h-4 w-4" />
                        <span>VISIT DETAILS</span>
                      </div>
                      <div className="space-y-3 pl-4">
                        <div className="space-y-1">
                          <Label htmlFor="visit_date" className="text-sm">Discharge Date *</Label>
                          <Input
                            id="visit_date"
                            type="date"
                            value={formData.visit_date}
                            onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                            max={formatInputDateIST(getCurrentISTDate())}
                            required
                            className="h-9 text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="visit_reason" className="text-sm">Visit Reason *</Label>
                          <Select value={formData.visit_reason} onValueChange={(value) => setFormData({ ...formData, visit_reason: value })}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {visitReasons.map((reason) => (
                                <SelectItem key={reason.id} value={reason.reason_code}>
                                  {reason.reason_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="notes" className="text-sm">Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={2}
                            placeholder="Any additional notes about this visit..."
                            className="resize-none text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t" />

                    {/* Payment Information Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>PAYMENT INFORMATION</span>
                      </div>
                      <div className="space-y-3 pl-4">
                        <div className="space-y-1">
                          <Label htmlFor="visit_payment" className="text-sm">Payment Amount *</Label>
                          <Input
                            id="visit_payment"
                            type="number"
                            step="1"
                            min="0"
                            value={formData.visit_payment}
                            onChange={(e) => setFormData({ ...formData, visit_payment: e.target.value })}
                            required
                            placeholder="₹ 0"
                            className="h-9 text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="payment_type" className="text-sm">Payment Type *</Label>
                          <Select 
                            value={formData.payment_type} 
                            onValueChange={(value) => setFormData({ 
                              ...formData, 
                              payment_type: value,
                              insurance_company_id: value === 'cash' ? '' : formData.insurance_company_id
                            })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="insurance">Insurance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.payment_type === 'insurance' && (
                          <div className="space-y-1">
                            <Label htmlFor="insurance_company" className="text-sm">Insurance Company *</Label>
                            <Select 
                              value={formData.insurance_company_id} 
                              onValueChange={(value) => setFormData({ ...formData, insurance_company_id: value })}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select insurance company" />
                              </SelectTrigger>
                              <SelectContent>
                                {insuranceCompanies.map((company) => (
                                  <SelectItem key={company.id} value={company.id}>
                                    {company.company_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sticky Footer Buttons */}
                    <div className="sticky bottom-0 left-0 right-0 bg-background border-t pt-3 pb-2 -mx-4 px-4 mt-4">
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || !isFormValid()}>
                          {submitting ? (editingVisit ? 'Updating...' : 'Recording...') : (editingVisit ? 'Update Visit' : 'Record Visit')}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[85vh] grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden" hasUnsavedChanges={!!(formData.patient_name.trim() || formData.visit_payment.trim() || formData.notes.trim())} onConfirmClose={() => { resetForm(); setDialogOpen(false); }}>
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle className="text-2xl font-bold">
                    {editingVisit ? 'Edit Visit' : 'Record New Visit'}
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-full pr-4 -mr-4">
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Doctor & Patient Section */}
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                            <Users className="h-4 w-4" />
                            <span>DOCTOR & PATIENT</span>
                          </div>
                          <div className="space-y-3 pl-6">
                            <div className="space-y-1.5">
                              <Label htmlFor="doctor_id">Doctor *</Label>
                              <DoctorSearchCombobox
                                doctors={doctors}
                                value={formData.doctor_id}
                                onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}
                                placeholder="Type 3+ characters to search doctor..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="patient_name">Patient Name *</Label>
                              <Input
                                id="patient_name"
                                value={formData.patient_name}
                                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                                placeholder="Enter patient name"
                                required
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="patient_id">Patient ID</Label>
                              <Input
                                id="patient_id"
                                value={formData.patient_id}
                                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                                placeholder="Optional"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t" />
                      </>
                    )}

                    {/* Visit Details Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                        <FileText className="h-4 w-4" />
                        <span>VISIT DETAILS</span>
                      </div>
                      <div className="space-y-3 pl-6">
                        <div className="space-y-1.5">
                          <Label htmlFor="visit_date">Discharge Date *</Label>
                          <Input
                            id="visit_date"
                            type="date"
                            value={formData.visit_date}
                            onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                            max={formatInputDateIST(getCurrentISTDate())}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="visit_reason">Visit Reason *</Label>
                          <Select value={formData.visit_reason} onValueChange={(value) => setFormData({ ...formData, visit_reason: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {visitReasons.map((reason) => (
                                <SelectItem key={reason.id} value={reason.reason_code}>
                                  {reason.reason_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={2}
                            placeholder="Any additional notes about this visit..."
                            className="resize-none text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t" />

                    {/* Payment Information Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                        <DollarSign className="h-4 w-4" />
                        <span>PAYMENT INFORMATION</span>
                      </div>
                      <div className="space-y-3 pl-6">
                        <div className="space-y-1.5">
                          <Label htmlFor="visit_payment">Payment Amount *</Label>
                          <Input
                            id="visit_payment"
                            type="number"
                            step="1"
                            min="0"
                            value={formData.visit_payment}
                            onChange={(e) => setFormData({ ...formData, visit_payment: e.target.value })}
                            required
                            placeholder="₹ 0"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="payment_type">Payment Type *</Label>
                          <Select 
                            value={formData.payment_type} 
                            onValueChange={(value) => setFormData({ 
                              ...formData, 
                              payment_type: value,
                              insurance_company_id: value === 'cash' ? '' : formData.insurance_company_id
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="insurance">Insurance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.payment_type === 'insurance' && (
                          <div className="space-y-1.5">
                            <Label htmlFor="insurance_company">Insurance Company *</Label>
                            <Select 
                              value={formData.insurance_company_id} 
                              onValueChange={(value) => setFormData({ ...formData, insurance_company_id: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select insurance company" />
                              </SelectTrigger>
                              <SelectContent>
                                {insuranceCompanies.map((company) => (
                                  <SelectItem key={company.id} value={company.id}>
                                    {company.company_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sticky Footer Buttons */}
                    <div className="sticky bottom-0 left-0 right-0 bg-background border-t pt-3 pb-2 -mx-1 px-1 mt-4">
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || !isFormValid()}>
                          {submitting ? (editingVisit ? 'Updating...' : 'Recording...') : (editingVisit ? 'Update Visit' : 'Record Visit')}
                        </Button>
                      </div>
                    </div>
                  </form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Enhanced Summary Cards with Better Shadows and Borders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
        <Card className="bg-gradient-to-br from-background to-muted/30 border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Visits</p>
              <p className="text-3xl font-bold text-foreground">{visits.length}</p>
              <p className="text-xs text-muted-foreground">Recorded visits</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-background to-green-50 dark:to-green-950/20 border-2 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-400">{getTotalPatients()}</p>
              <p className="text-xs text-muted-foreground">Patients seen</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-background to-blue-50 dark:to-blue-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Processed Visits</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{getProcessedCount()}/{visits.length}</p>
              <p className="text-xs text-muted-foreground">{visits.length > 0 ? ((getProcessedCount() / visits.length) * 100).toFixed(0) : 0}% completed</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-background to-amber-50 dark:to-amber-950/20 border-2 border-amber-200 dark:border-amber-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Activity className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Payment Split</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{getCashVisits()}</span>
                <span className="text-sm text-muted-foreground">CASH</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{getInsuranceVisits()}</span>
                <span className="text-sm text-muted-foreground">INS</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visits Dashboard with Enhanced Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <TabsList className="grid w-full lg:w-auto lg:min-w-[500px] grid-cols-2 h-auto p-1.5 bg-muted/50 border-2 shadow-sm">
            <TabsTrigger 
              value="unprocessed" 
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border transition-all duration-200"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Unprocessed Visits</span>
              <span className="sm:hidden">Unprocessed</span>
              <Badge variant="secondary" className="ml-1 font-bold">
                {visits.filter(v => !v.is_processed).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="processed" 
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border transition-all duration-200"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Processed Visits</span>
              <span className="sm:hidden">Processed</span>
              <Badge variant="secondary" className="ml-1 font-bold">
                {visits.filter(v => v.is_processed).length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          {/* Generate Report button with enhanced styling */}
          <div className="w-full lg:w-auto">
            <ReportGeneration
            title="Visit Management Report"
            data={visits}
            columns={[
              { 
                key: 'visit_code', 
                label: 'Visit Code' 
              },
              { 
                key: 'visit_date', 
                label: 'Visit Date',
                format: (value) => formatDateIST(value)
              },
              { 
                key: 'doctors.profiles.full_name', 
                label: 'Doctor Name' 
              },
              { 
                key: 'doctors.doctor_code', 
                label: 'Doctor Code' 
              },
              { 
                key: 'patient_name', 
                label: 'Patient Name' 
              },
              { 
                key: 'patient_id', 
                label: 'Patient ID' 
              },
              { 
                key: 'patient_count', 
                label: 'Patient Count' 
              },
              { 
                key: 'visit_payment', 
                label: 'Payment',
                format: (value) => value ? `₹${value}` : 'N/A'
              },
              { 
                key: 'payment_type', 
                label: 'Payment Type' 
              },
              { 
                key: 'insurance_company_name', 
                label: 'Insurance Company'
              },
              { 
                key: 'visit_reason', 
                label: 'Visit Reason' 
              },
              { 
                key: 'notes', 
                label: 'Notes' 
              },
              { 
                key: 'is_processed', 
                label: 'Status',
                format: (value) => value ? 'Processed' : 'Unprocessed'
              }
            ]}
            filename="visit_management_report"
          />
          </div>
        </div>

        <TabsContent value="unprocessed" className="space-y-4">
          {/* Enhanced Search Box with Better Visibility */}
          <Card className="border-2 shadow-md bg-background">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                {/* Enhanced Search Input with Better Contrast */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                  <Input
                    type="text"
                    placeholder={
                      searchFilter === 'all' 
                        ? "Search all fields..." 
                        : `Search by ${searchFilter.replace('_', ' ')}...`
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-14 pl-12 pr-12 text-base border-2 font-medium bg-background shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-300"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchFilter('all');
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                
                {/* Filter Buttons with Better Styling */}
                <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/30 rounded-lg border">
                  <span className="text-sm font-semibold text-foreground mr-2">Filter by:</span>
                  <Button
                    variant={searchFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('all')}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'all' 
                        ? "shadow-md" 
                        : "hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    All Fields
                  </Button>
                  <Button
                    variant={searchFilter === 'doctor_name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('doctor_name')}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'doctor_name' 
                        ? "shadow-md" 
                        : "hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    Doctor Name
                  </Button>
                  <Button
                    variant={searchFilter === 'doctor_code' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('doctor_code')}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'doctor_code' 
                        ? "shadow-md" 
                        : "hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    Doctor Code
                  </Button>
                  <Button
                    variant={searchFilter === 'patient_name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('patient_name')}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'patient_name' 
                        ? "shadow-md" 
                        : "hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    Patient Name
                  </Button>
                  <Button
                    variant={searchFilter === 'insurance_company' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('insurance_company')}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'insurance_company' 
                        ? "shadow-md" 
                        : "hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    Insurance Company
                  </Button>
                  
                  {/* Payment Type Filters */}
                  <div className="h-6 w-px bg-border mx-1" />
                  <span className="text-sm font-semibold text-foreground mr-1">Payment:</span>
                  <Button
                    variant={searchFilter === 'payment_type_cash' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSearchFilter('payment_type_cash');
                      setSearchQuery('');
                    }}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'payment_type_cash' 
                        ? "shadow-md bg-green-600 hover:bg-green-700" 
                        : "hover:bg-green-50 hover:border-green-500 dark:hover:bg-green-950"
                    )}
                  >
                    Cash
                  </Button>
                  <Button
                    variant={searchFilter === 'payment_type_insurance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSearchFilter('payment_type_insurance');
                      setSearchQuery('');
                    }}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'payment_type_insurance' 
                        ? "shadow-md bg-blue-600 hover:bg-blue-700" 
                        : "hover:bg-blue-50 hover:border-blue-500 dark:hover:bg-blue-950"
                    )}
                  >
                    Insurance
                  </Button>
                </div>
              
                {/* Animated Search Results Count */}
                {(searchQuery || searchFilter === 'payment_type_cash' || searchFilter === 'payment_type_insurance') && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-muted-foreground">
                      {searchFilter === 'payment_type_cash' || searchFilter === 'payment_type_insurance' ? (
                        <>Showing <span className="font-semibold text-foreground">{filterVisits(visits.filter(v => !v.is_processed), searchQuery, searchFilter).length}</span> {searchFilter === 'payment_type_cash' ? 'Cash' : 'Insurance'} visits</>
                      ) : (
                        <>Found <span className="font-semibold text-foreground">{filterVisits(visits.filter(v => !v.is_processed), searchQuery, searchFilter).length}</span> result{filterVisits(visits.filter(v => !v.is_processed), searchQuery, searchFilter).length !== 1 ? 's' : ''}</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Modern Table or No Results */}
          {(() => {
            const unprocessedVisits = visits.filter(v => !v.is_processed);
            const filteredVisits = filterVisits(unprocessedVisits, searchQuery, searchFilter);
            
            // Calculate pagination for unprocessed visits
            const unprocessedIndexOfLastRecord = unprocessedRecordsPerPage === 'all' 
              ? filteredVisits.length 
              : unprocessedCurrentPage * unprocessedRecordsPerPage;
            const unprocessedIndexOfFirstRecord = unprocessedRecordsPerPage === 'all' 
              ? 0 
              : unprocessedIndexOfLastRecord - unprocessedRecordsPerPage;
            const currentUnprocessedRecords = filteredVisits.slice(
              unprocessedIndexOfFirstRecord, 
              unprocessedIndexOfLastRecord
            );
            
            if (filteredVisits.length > 0) {
              return (
                <div className="space-y-4">
                  <VisitManagementTable
                    visits={currentUnprocessedRecords}
                    onEdit={(userRole === 'admin' || userRole === 'manager') ? handleEdit : undefined}
                    onDelete={(userRole === 'admin' || userRole === 'manager') ? handleDelete : undefined}
                    onPaymentTypeClick={handlePaymentTypeNavigation}
                    onDoctorClick={handleDoctorNameClick}
                    onPaymentTypeFilter={handlePaymentTypeFilter}
                    showActions={userRole === 'admin' || userRole === 'manager'}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field) => {
                      if (sortField === field) {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField(field);
                        setSortDirection('desc');
                      }
                    }}
                  />
                  
                  <PaginationControls
                    totalRecords={filteredVisits.length}
                    recordsPerPage={unprocessedRecordsPerPage}
                    currentPage={unprocessedCurrentPage}
                    onPageChange={setUnprocessedCurrentPage}
                    onRecordsPerPageChange={setUnprocessedRecordsPerPage}
                  />
                </div>
              );
            }
            
            // Show enhanced "No matching records" when search is active
            if (searchQuery) {
              return (
                <Card className="mt-4">
                  <CardContent className="py-16">
                    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                      {/* Animated Search Icon */}
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full animate-pulse" />
                        <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 rounded-full p-6">
                          <Search className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        No Matching Records Found
                      </h3>
                      
                      {/* Search Details */}
                      <p className="text-muted-foreground mb-1">
                        No unprocessed visits found for:
                      </p>
                      <p className="text-sm font-mono bg-muted px-3 py-1 rounded-md mb-4">
                        "{searchQuery}" 
                        {searchFilter !== 'all' && (
                          <span className="text-muted-foreground"> in {searchFilter.replace('_', ' ')}</span>
                        )}
                      </p>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3 mb-6">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSearchQuery('');
                            setSearchFilter('all');
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Search
                        </Button>
                        {searchFilter !== 'all' && (
                          <Button 
                            variant="default"
                            onClick={() => setSearchFilter('all')}
                          >
                            <Search className="h-4 w-4 mr-2" />
                            Search All Fields
                          </Button>
                        )}
                      </div>
                      
                      {/* Search Tips */}
                      <div className="text-left w-full bg-muted/50 rounded-lg p-4">
                        <p className="text-sm font-medium text-foreground mb-2">Try these tips:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Check your spelling</li>
                          <li>• Try different keywords</li>
                          <li>• Use "All Fields" filter for broader search</li>
                          <li>• Remove filters to see all visits</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            
            // Default empty state
            return (
              <EmptyState
                icon={FileText}
                title="No Unprocessed Visits"
                description="All visits have been processed or no visits recorded yet."
                action={(userRole === 'admin' || userRole === 'manager' || userRole === 'doctor') ? {
                  label: 'Record New Visit',
                  onClick: () => setDialogOpen(true)
                } : undefined}
              />
            );
          })()}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          {/* Enhanced Search Box with Better Visibility */}
          <Card className="border-2 shadow-md bg-background">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                {/* Enhanced Search Input with Better Contrast */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                  <Input
                    type="text"
                    placeholder={
                      searchFilter === 'all' 
                        ? "Search all fields..." 
                        : `Search by ${searchFilter.replace('_', ' ')}...`
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-14 pl-12 pr-12 text-base border-2 font-medium bg-background shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-300"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchFilter('all');
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                
                {/* Filter Buttons with Better Styling */}
                <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/30 rounded-lg border">
                  <span className="text-sm font-semibold text-foreground mr-2">Filter by:</span>
                  <Button
                    variant={searchFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('all')}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'all' 
                        ? "shadow-md" 
                        : "hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    All Fields
                  </Button>
                  <Button
                    variant={searchFilter === 'doctor_name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('doctor_name')}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'doctor_name' 
                        ? "shadow-md" 
                        : "hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    Doctor Name
                  </Button>
                  <Button
                    variant={searchFilter === 'doctor_code' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('doctor_code')}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'doctor_code' 
                        ? "shadow-md" 
                        : "hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    Doctor Code
                  </Button>
                  <Button
                    variant={searchFilter === 'patient_name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('patient_name')}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'patient_name' 
                        ? "shadow-md" 
                        : "hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    Patient Name
                  </Button>
                  <Button
                    variant={searchFilter === 'insurance_company' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchFilter('insurance_company')}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'insurance_company' 
                        ? "shadow-md" 
                        : "hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    Insurance Company
                  </Button>
                  
                  {/* Payment Type Filters */}
                  <div className="h-6 w-px bg-border mx-1" />
                  <span className="text-sm font-semibold text-foreground mr-1">Payment:</span>
                  <Button
                    variant={searchFilter === 'payment_type_cash' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSearchFilter('payment_type_cash');
                      setSearchQuery('');
                    }}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'payment_type_cash' 
                        ? "shadow-md bg-green-600 hover:bg-green-700" 
                        : "hover:bg-green-50 hover:border-green-500 dark:hover:bg-green-950"
                    )}
                  >
                    Cash
                  </Button>
                  <Button
                    variant={searchFilter === 'payment_type_insurance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSearchFilter('payment_type_insurance');
                      setSearchQuery('');
                    }}
                    className={cn(
                      "font-semibold transition-all duration-200 border-2",
                      searchFilter === 'payment_type_insurance' 
                        ? "shadow-md bg-blue-600 hover:bg-blue-700" 
                        : "hover:bg-blue-50 hover:border-blue-500 dark:hover:bg-blue-950"
                    )}
                  >
                    Insurance
                  </Button>
                </div>
              
                {/* Animated Search Results Count */}
                {(searchQuery || searchFilter === 'payment_type_cash' || searchFilter === 'payment_type_insurance') && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-muted-foreground">
                      {searchFilter === 'payment_type_cash' || searchFilter === 'payment_type_insurance' ? (
                        <>Showing <span className="font-semibold text-foreground">{filterVisits(visits.filter(v => v.is_processed), searchQuery, searchFilter).length}</span> {searchFilter === 'payment_type_cash' ? 'Cash' : 'Insurance'} visits</>
                      ) : (
                        <>Found <span className="font-semibold text-foreground">{filterVisits(visits.filter(v => v.is_processed), searchQuery, searchFilter).length}</span> result{filterVisits(visits.filter(v => v.is_processed), searchQuery, searchFilter).length !== 1 ? 's' : ''}</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Modern Table or No Results */}
          {(() => {
            const processedVisits = visits.filter(v => v.is_processed);
            const filteredVisits = filterVisits(processedVisits, searchQuery, searchFilter);
            
            // Calculate pagination for processed visits
            const processedIndexOfLastRecord = processedRecordsPerPage === 'all' 
              ? filteredVisits.length 
              : processedCurrentPage * processedRecordsPerPage;
            const processedIndexOfFirstRecord = processedRecordsPerPage === 'all' 
              ? 0 
              : processedIndexOfLastRecord - processedRecordsPerPage;
            const currentProcessedRecords = filteredVisits.slice(
              processedIndexOfFirstRecord, 
              processedIndexOfLastRecord
            );
            
            if (filteredVisits.length > 0) {
              return (
                <div className="space-y-4">
                  <VisitManagementTable
                    visits={currentProcessedRecords}
                    onEdit={undefined}
                    onDelete={undefined}
                    onPaymentTypeClick={handlePaymentTypeNavigation}
                    onDoctorClick={handleDoctorNameClick}
                    onPaymentTypeFilter={handlePaymentTypeFilter}
                    showActions={false}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field) => {
                      if (sortField === field) {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField(field);
                        setSortDirection('desc');
                      }
                    }}
                  />
                  
                  <PaginationControls
                    totalRecords={filteredVisits.length}
                    recordsPerPage={processedRecordsPerPage}
                    currentPage={processedCurrentPage}
                    onPageChange={setProcessedCurrentPage}
                    onRecordsPerPageChange={setProcessedRecordsPerPage}
                  />
                </div>
              );
            }
            
            // Show enhanced "No matching records" when search is active
            if (searchQuery) {
              return (
                <Card className="mt-4">
                  <CardContent className="py-16">
                    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                      {/* Animated Search Icon */}
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full animate-pulse" />
                        <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 rounded-full p-6">
                          <Search className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        No Matching Records Found
                      </h3>
                      
                      {/* Search Details */}
                      <p className="text-muted-foreground mb-1">
                        No processed visits found for:
                      </p>
                      <p className="text-sm font-mono bg-muted px-3 py-1 rounded-md mb-4">
                        "{searchQuery}" 
                        {searchFilter !== 'all' && (
                          <span className="text-muted-foreground"> in {searchFilter.replace('_', ' ')}</span>
                        )}
                      </p>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3 mb-6">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSearchQuery('');
                            setSearchFilter('all');
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Search
                        </Button>
                        {searchFilter !== 'all' && (
                          <Button 
                            variant="default"
                            onClick={() => setSearchFilter('all')}
                          >
                            <Search className="h-4 w-4 mr-2" />
                            Search All Fields
                          </Button>
                        )}
                      </div>
                      
                      {/* Search Tips */}
                      <div className="text-left w-full bg-muted/50 rounded-lg p-4">
                        <p className="text-sm font-medium text-foreground mb-2">Try these tips:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Check your spelling</li>
                          <li>• Try different keywords</li>
                          <li>• Use "All Fields" filter for broader search</li>
                          <li>• Remove filters to see all visits</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            
            // Default empty state
            return (
              <EmptyState
                icon={CheckCircle}
                title="No Processed Visits"
                description="No visits have been processed yet."
              />
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VisitManagement;