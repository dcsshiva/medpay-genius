import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Users, Stethoscope, Search, Download, Upload, Loader2, Eye, EyeOff, ChevronUp, ChevronDown, User, KeyRound, Landmark, Printer } from 'lucide-react';
import { printReport, autoFitColumns } from '@/lib/printUtils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  generateDoctorTemplate, 
  parseExcelFile, 
  validateDoctorCode,
  generateDoctorCode,
  analyzeDoctorImport,
  type ImportResults
} from '@/lib/excelImportUtils';
import { getSessionAuthHeaders } from '@/lib/sessionAuth';
import { validatePAN, handleCreateUserError } from '@/lib/utils';
import { validateMobileNumber, formatMobileNumber } from '@/lib/validators';
interface Doctor {
  id: string;
  user_id?: string;
  full_name?: string;
  doctor_code: string;
  specialization: string;
  is_active: boolean;
  email?: string;
  mobile_number?: string;
  pan_number?: string;
  bank_account_number?: string;
  account_holder_name?: string;
  bank_name?: string;
  branch_name?: string;
  ifsc_code?: string;
  profiles: {
    id: string;
    full_name: string;
  } | null;
}

const DoctorManagement = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    doctor: Doctor | null;
    action: 'activate' | 'deactivate' | null;
  }>({ open: false, doctor: null, action: null });
  const [sortField, setSortField] = useState<'doctor_code' | 'full_name' | 'specialization'>('doctor_code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState({
    full_name: '',
    doctor_code: '',
    specialization: '',
    is_active: true,
    email: '',
    password: '',
    pan_number: '',
    mobile_number: '',
    bank_account_number: '',
    account_holder_name: '',
    bank_name: '',
    branch_name: '',
    ifsc_code: ''
  });
  const [emailError, setEmailError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [showImportResults, setShowImportResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Real-time email validation with debouncing for doctors
  useEffect(() => {
    if (!formData.email.trim()) {
      setEmailError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      // Simple check: look for existing doctor emails in auth users
      // Since we can't directly query auth.users, we check against all doctors' user_ids
      const { data: existingDoctors } = await supabase
        .from('doctors')
        .select('id, user_id')
        .not('user_id', 'is', null);
      
      if (existingDoctors && existingDoctors.length > 0) {
        // If editing, exclude current doctor from check
        const filteredDoctors = editingDoctor 
          ? existingDoctors.filter(d => d.id !== editingDoctor.id)
          : existingDoctors;
        
        // Note: We can't directly query auth.users emails from client
        // So we'll just do a basic validation that email format is correct
        // The actual duplicate check will happen server-side in the edge function
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          setEmailError('Invalid email format');
        } else {
          setEmailError('');
        }
      } else {
        setEmailError('');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.email, editingDoctor]);

  // Real-time mobile number duplicate validation with debouncing
  useEffect(() => {
    if (!formData.mobile_number.trim()) {
      setMobileError('');
      return;
    }

    if (!validateMobileNumber(formData.mobile_number)) {
      setMobileError('Mobile number must be exactly 10 digits');
      return;
    }

    const timeoutId = setTimeout(async () => {
      let query = supabase
        .from('doctors')
        .select('id')
        .eq('mobile_number', formData.mobile_number);
      
      if (editingDoctor) {
        query = query.neq('id', editingDoctor.id);
      }

      const { data: existing } = await query.maybeSingle();
      
      if (existing) {
        setMobileError('This mobile number is already registered to another doctor');
      } else {
        setMobileError('');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.mobile_number, editingDoctor]);

  // Add a key to force re-render when dialog closes
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingDoctor(null);
    resetForm();
    // Force refresh to get updated data
    fetchDoctors();
  };

  const fetchDoctors = async () => {
    try {
        const { data, error } = await supabase
          .from('doctors')
          .select(`
            id,
            user_id,
            full_name,
            doctor_code,
            specialization,
            is_active,
            mobile_number,
            pan_number,
            bank_account_number,
            account_holder_name,
            bank_name,
            branch_name,
            ifsc_code
          `)
          .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Collect user IDs for email fetching
      const userIds = (data || [])
        .filter(doc => doc.user_id)
        .map(doc => doc.user_id as string);
      
      // Fetch emails via Edge Function if there are user IDs
      let emailMap = new Map<string, string>();
      if (userIds.length > 0) {
        try {
          const { data: emailData, error: emailError } = await supabase.functions.invoke(
            'get-user-emails',
            {
              body: { userIds },
              headers: getSessionAuthHeaders()
            }
          );
          
          if (emailError) {
            console.error('Error fetching emails:', emailError);
          } else if (emailData?.emails) {
            emailData.emails.forEach((item: { user_id: string; email: string | null }) => {
              if (item.email) {
                emailMap.set(item.user_id, item.email);
              }
            });
          }
        } catch (err) {
          console.error('Failed to fetch emails:', err);
        }
      }
      
      // Transform data with emails
      const doctorsWithEmails = (data || []).map(doc => ({
        ...doc,
        email: doc.user_id ? emailMap.get(doc.user_id) || '' : '',
        profiles: {
          id: doc.user_id,
          full_name: doc.full_name
        }
      }));
      
      setDoctors(doctorsWithEmails);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch doctors"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    if (!['admin', 'manager'].includes(userRole || '')) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins and managers can manage doctors"
      });
      return;
    }

    // Validate PAN number format if provided
    if (formData.pan_number && !validatePAN(formData.pan_number)) {
      toast({
        variant: "destructive",
        title: "Invalid PAN",
        description: "PAN must be in format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)"
      });
      setSubmitting(false);
      return;
    }

    // Validate mobile number if provided
    if (formData.mobile_number.trim() && !validateMobileNumber(formData.mobile_number)) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile Number",
        description: "Mobile number must be exactly 10 digits"
      });
      setSubmitting(false);
      return;
    }

    if (mobileError) {
      toast({
        variant: "destructive",
        title: "Duplicate Mobile Number",
        description: mobileError
      });
      setSubmitting(false);
      return;
    }

    try {
      if (editingDoctor) {
        // Validate doctor_code uniqueness (exclude current doctor)
        if (formData.doctor_code !== editingDoctor.doctor_code) {
          const { data: existingDoctor } = await supabase
            .from('doctors')
            .select('id')
            .eq('doctor_code', formData.doctor_code)
            .neq('id', editingDoctor.id)
            .single();
          
          if (existingDoctor) {
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: `Doctor code "${formData.doctor_code}" is already in use`
            });
            return;
          }
        }

        // Update existing doctor
        const { error: updateDoctorError } = await supabase
          .from('doctors')
          .update({
            full_name: formData.full_name,
            doctor_code: formData.doctor_code,
            specialization: formData.specialization,
            is_active: formData.is_active,
            pan_number: formData.pan_number || null,
            mobile_number: formData.mobile_number.trim() || null,
            bank_account_number: formData.bank_account_number,
            account_holder_name: formData.account_holder_name,
            bank_name: formData.bank_name,
            branch_name: formData.branch_name,
            ifsc_code: formData.ifsc_code
          })
          .eq('id', editingDoctor.id);

        if (updateDoctorError) {
          console.error('Doctor update error:', updateDoctorError);
          if (updateDoctorError.message.includes('duplicate key value')) {
            toast({
              variant: "destructive",
              title: "Duplicate Entry",
              description: "Doctor code already exists. Please use a different code."
            });
            return;
          }
          throw updateDoctorError;
        }

        // Update auth user email/password if provided and user_id exists
        if (editingDoctor.user_id && (formData.email.trim() || formData.password.trim())) {
          const updateBody: any = { userId: editingDoctor.user_id };
          if (formData.email.trim()) updateBody.email = formData.email.trim();
          if (formData.password.trim()) updateBody.password = formData.password.trim();
          
          const { data: credUpdateData, error: credUpdateError } = await supabase.functions.invoke('update-user-credentials', {
            body: updateBody,
            headers: getSessionAuthHeaders()
          });

          // Check both error object AND response data for errors
          if (credUpdateError || (credUpdateData && credUpdateData.error)) {
            const errorMsg = credUpdateError?.message || credUpdateData?.error || 'Unknown error';
            console.error('Failed to update credentials:', errorMsg);
            toast({
              variant: "destructive",
              title: "Credential Update Failed",
              description: errorMsg
            });
            setSubmitting(false);
            return;
          }
        }

        toast({
          title: "Success",
          description: "Doctor updated successfully"
        });
      } else {
        // Create new doctor
        if (!formData.password.trim()) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Password is required for new doctors"
          });
          return;
        }

        // Validate doctor_code uniqueness for new doctors
        const { data: existingDoctor } = await supabase
          .from('doctors')
          .select('id')
          .eq('doctor_code', formData.doctor_code)
          .single();
        
        if (existingDoctor) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: `Doctor code "${formData.doctor_code}" is already in use`
          });
          return;
        }

        // Auto-generate email if not provided
        const emailToUse = formData.email.trim() || `${formData.doctor_code}@gmail.com`;

        // Create auth user and doctor via edge function
        const { data: result, error: createUserError } = await supabase.functions.invoke('create-user', {
          body: {
            email: emailToUse,
            password: formData.password,
            designation: 'doctor',
            userData: {
              full_name: formData.full_name
            },
            doctorData: {
              password: formData.password,
              doctor_code: formData.doctor_code,
              specialization: formData.specialization,
              pan_number: formData.pan_number || null,
              mobile_number: formData.mobile_number.trim() || null,
              bank_account_number: formData.bank_account_number,
              account_holder_name: formData.account_holder_name,
              bank_name: formData.bank_name,
              branch_name: formData.branch_name,
              ifsc_code: formData.ifsc_code
            }
          },
          headers: getSessionAuthHeaders()
        });

        console.log('Create user response:', result, createUserError);

        if (createUserError || !result?.success) {
          const errorMessage = await handleCreateUserError(createUserError, result, emailToUse);
          throw new Error(errorMessage);
        }

        toast({
          title: "Success",
          description: "Doctor created successfully"
        });
      }

      setDialogOpen(false);
      setEditingDoctor(null);
      resetForm();
      // Force refresh to get updated data
      fetchDoctors();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save doctor"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      doctor_code: '',
      specialization: '',
      is_active: true,
      email: '',
      password: '',
      pan_number: '',
      mobile_number: '',
      bank_account_number: '',
      account_holder_name: '',
      bank_name: '',
      branch_name: '',
      ifsc_code: ''
    });
    setMobileError('');
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      full_name: doctor.profiles?.full_name || '',
      doctor_code: doctor.doctor_code,
      specialization: doctor.specialization,
      is_active: doctor.is_active,
      email: doctor.email || '',
      password: '',
      pan_number: doctor.pan_number || '',
      mobile_number: doctor.mobile_number || '',
      bank_account_number: doctor.bank_account_number || '',
      account_holder_name: doctor.account_holder_name || '',
      bank_name: doctor.bank_name || '',
      branch_name: doctor.branch_name || '',
      ifsc_code: doctor.ifsc_code || ''
    });
    setDialogOpen(true);
  };

  const handleStatusChange = (doctor: Doctor) => {
    const action = doctor.is_active ? 'deactivate' : 'activate';  
    
    // Check permissions for reactivation
    if (!doctor.is_active && userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only administrators can reactivate deactivated doctors"
      });
      return;
    }

    setConfirmDialog({
      open: true,
      doctor,
      action
    });
  };

  const confirmStatusChange = async () => {
    if (!confirmDialog.doctor || !confirmDialog.action) return;

    try {
      const { error } = await supabase
        .from('doctors')
        .update({ is_active: confirmDialog.action === 'activate' })
        .eq('id', confirmDialog.doctor.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Doctor ${confirmDialog.action === 'activate' ? 'activated' : 'deactivated'} successfully`
      });

      fetchDoctors();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update doctor status"
      });
    } finally {
      setConfirmDialog({ open: false, doctor: null, action: null });
    }
  };

  const handleDoctorImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!['admin', 'manager'].includes(userRole || '')) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins and managers can import doctors"
      });
      return;
    }
    
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload an Excel file (.xlsx or .xls)"
      });
      return;
    }
    
    setImporting(true);
    const results: ImportResults = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };
    
    try {
      const rows = await parseExcelFile(file);
      
      // Skip the first row (sample data)
      const dataRows = rows.slice(1);
      
      const { data: existingDoctors } = await supabase
        .from('doctors')
        .select(`
          id,
          doctor_code,
          specialization,
          pan_number,
          bank_account_number,
          account_holder_name,
          bank_name,
          branch_name,
          ifsc_code,
          profiles:profile_id (
            id,
            full_name,
            user_id
          )
        `);
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 3; // Excel row (1=header, 2=sample, 3+=data)
        
        try {
          // Skip sample/header row
          if (row.doctor_code?.includes('SAMPLE') || row.doctor_code?.includes('⚠️') || row.doctor_code?.includes('Optional')) {
            continue;
          }

          // Check required fields - only full_name is mandatory
          if (!row.full_name) {
            results.errors.push({
              row: rowNumber,
              message: 'Missing required field: full_name'
            });
            continue;
          }

          // Auto-generate doctor_code if missing
          if (!row.doctor_code) {
            row.doctor_code = await generateDoctorCode(supabase);
          }

          // Auto-generate email from account_holder_name if missing
          if (!row.email && row.account_holder_name) {
            const sanitizedName = row.account_holder_name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');
            row.email = `${sanitizedName}@gmail.com`;
          }

          // Set default password if missing
          if (!row.password) {
            row.password = 'SecurePass789';
          }

          // Replace blank specialization with "others"
          if (!row.specialization || row.specialization.trim() === '') {
            row.specialization = 'others';
          }

          // Validate doctor code format (only if provided or generated)
          if (row.doctor_code && !validateDoctorCode(row.doctor_code)) {
            results.errors.push({
              row: rowNumber,
              message: `Invalid doctor code format: ${row.doctor_code}. Expected format: ABC123`
            });
            continue;
          }
          
          const decision = analyzeDoctorImport(row, existingDoctors || []);
          
          if (decision.action === 'skip') {
            results.skipped++;
            continue;
          }
          
          if (decision.action === 'update') {
        const { error } = await supabase
          .from('doctors')
          .update({
            specialization: row.specialization || 'others',
            pan_number: row.pan_number || null,
            bank_account_number: row.bank_account_number || null,
            account_holder_name: row.account_holder_name || null,
            bank_name: row.bank_name || null,
            branch_name: row.branch_name || null,
            ifsc_code: row.ifsc_code || null
          })
          .eq('doctor_code', row.doctor_code);
            
            if (error) throw error;
            
            if (decision.existingRecord?.profiles?.id) {
              await supabase
                .from('profiles')
                .update({ full_name: row.full_name })
                .eq('id', decision.existingRecord.profiles.id);
                
              if (row.password && decision.existingRecord.profiles.user_id) {
                await supabase.functions.invoke('update-user-credentials', {
                  body: {
                    userId: decision.existingRecord.profiles.user_id,
                    password: row.password
                  },
                  headers: getSessionAuthHeaders()
                });
              }
            }
            
            results.updated++;
          } else {
            // Email and password are now auto-generated, so no need to check
            
            // Validate PAN number format if provided
            if (row.pan_number && !validatePAN(row.pan_number)) {
              results.errors.push({
                row: rowNumber,
                message: `Invalid PAN number format: ${row.pan_number}. Expected format: AAAAA9999A`
              });
              continue;
            }
            
            const { data: authResult, error: authError } = await supabase.functions.invoke('create-user', {
              body: {
                email: row.email,
                password: row.password,
                userData: {
                  full_name: row.full_name,
                  role: 'doctor'
                },
                doctorData: {
                  doctor_code: row.doctor_code,
                  specialization: row.specialization,
                  pan_number: row.pan_number || null,
                  bank_account_number: row.bank_account_number || null,
                  account_holder_name: row.account_holder_name || null,
                  bank_name: row.bank_name || null,
                  branch_name: row.branch_name || null,
                  ifsc_code: row.ifsc_code || null
                }
              },
              headers: getSessionAuthHeaders()
            });
            
            if (authError || !authResult?.success) {
              throw new Error(authResult?.error || 'Failed to create user');
            }
            
            results.inserted++;
          }
          
        } catch (error: any) {
          results.errors.push({
            row: rowNumber,
            message: error.message || 'Unknown error'
          });
        }
      }
      
      setImportResults(results);
      setShowImportResults(true);
      fetchDoctors();
      
      toast({
        title: "Import Complete",
        description: `Inserted: ${results.inserted}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`
      });
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleDoctorStatus = async (doctorId: string, currentStatus: boolean) => {
    if (!['admin', 'manager'].includes(userRole || '')) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins and managers can modify doctor status"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('doctors')
        .update({ is_active: !currentStatus })
        .eq('id', doctorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Doctor ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });

      fetchDoctors();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update doctor status"
      });
    }
  };

  const exportDoctorsToExcel = () => {
    // Get filtered doctors (same logic as displayed in the table)
    const filteredDoctors = doctors
      .filter((doctor) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          doctor.profiles?.full_name.toLowerCase().includes(searchLower) ||
          doctor.doctor_code.toLowerCase().includes(searchLower) ||
          doctor.specialization.toLowerCase().includes(searchLower) ||
          doctor.mobile_number?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        let aVal = sortField === 'full_name' ? (a.profiles?.full_name || '') : a[sortField];
        let bVal = sortField === 'full_name' ? (b.profiles?.full_name || '') : b[sortField];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

    if (filteredDoctors.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "There are no doctors to export. Please adjust your search filters."
      });
      return;
    }

    // Format data for Excel export
    const exportData = filteredDoctors.map(doctor => ({
      'Doctor Code': doctor.doctor_code,
      'Full Name': doctor.profiles?.full_name || 'N/A',
      'Specialization': doctor.specialization,
      'PAN Number': doctor.pan_number || 'Not provided',
      'Status': doctor.is_active ? 'Active' : 'Inactive',
      'Bank Account Number': doctor.bank_account_number || 'Not provided',
      'Account Holder Name': doctor.account_holder_name || 'Not provided',
      'Bank Name': doctor.bank_name || 'Not provided',
      'Branch Name': doctor.branch_name || 'Not provided',
      'IFSC Code': doctor.ifsc_code || 'Not provided'
    }));

    try {
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 15 }, // Doctor Code
        { wch: 25 }, // Full Name
        { wch: 20 }, // Specialization
        { wch: 15 }, // PAN Number
        { wch: 10 }, // Status
        { wch: 20 }, // Bank Account Number
        { wch: 25 }, // Account Holder Name
        { wch: 20 }, // Bank Name
        { wch: 20 }, // Branch Name
        { wch: 15 }  // IFSC Code
      ];

      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Doctors List');

      // Generate filename with timestamp
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const filename = `doctors_list_${day}${month}${year}_${hours}${minutes}_westmed.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Successful",
        description: `${filteredDoctors.length} doctor(s) exported to Excel successfully.`
      });
    } catch (error) {
      console.error('Excel Export Error:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: `Failed to export doctors: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Doctor Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Doctor Management</h1>
          <p className="text-muted-foreground">Manage doctor profiles</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateDoctorTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import from Excel
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleDoctorImport}
          />

          <Button
            variant="outline"
            onClick={exportDoctorsToExcel}
            disabled={doctors.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Doctors
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const cols = [
                { label: 'Doctor Code', key: 'Doctor Code' },
                { label: 'Full Name', key: 'Full Name' },
                { label: 'Specialization', key: 'Specialization' },
                { label: 'PAN Number', key: 'PAN Number' },
                { label: 'Status', key: 'Status' },
              ];
              const data = doctors.map(d => ({
                'Doctor Code': d.doctor_code,
                'Full Name': d.profiles?.full_name || 'N/A',
                'Specialization': d.specialization,
                'PAN Number': d.pan_number || '-',
                'Status': d.is_active ? 'Active' : 'Inactive',
              }));
              printReport({ title: 'Doctor List', columns: cols, data });
            }}
            disabled={doctors.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        
          {(userRole === 'admin' || userRole === 'manager') && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (open) {
                resetForm();
                setEditingDoctor(null);
              }
              setDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Doctor
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden" hasUnsavedChanges={Object.entries(formData).some(([key, value]) => key !== 'is_active' && value !== '' && value !== true)} onConfirmClose={() => { resetForm(); setDialogOpen(false); }}>
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-xl font-bold">
                  {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
                </DialogTitle>
                <DialogDescription>
                  {editingDoctor ? 'Update doctor information and settings.' : 'Create a new doctor account with login credentials.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="grid grid-rows-[minmax(0,1fr)_auto] overflow-hidden min-h-0">
                <ScrollArea className="h-full pr-4 -mr-4">
                  <div className="space-y-4 pb-4 pr-4">
                    {/* Personal Information Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="uppercase tracking-wide">Personal Information</span>
                      </div>
                      <div className="space-y-3 pl-6">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="full_name">Doctor Name *</Label>
                            <Input
                              id="full_name"
                              value={formData.full_name}
                              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                              placeholder="Dr. Ravi Kumar"
                              required
                              className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="doctor_code">Doctor Code *</Label>
                            <Input
                              id="doctor_code"
                              value={formData.doctor_code}
                              onChange={(e) => setFormData({ ...formData, doctor_code: e.target.value })}
                              placeholder="DOC001"
                              required
                              className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="specialization">Specialization *</Label>
                            <Input
                              id="specialization"
                              value={formData.specialization}
                              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                              placeholder="Cardiology"
                              required
                              className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="pan_number">PAN Number</Label>
                            <Input
                              id="pan_number"
                              value={formData.pan_number}
                              onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                              placeholder="ABCDE1234F"
                              maxLength={10}
                              pattern="[A-Z]{5}[0-9]{4}[A-Z]"
                              title="Enter valid PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)"
                              className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                            />
                            <p className="text-xs text-muted-foreground">
                              Format: 5 letters + 4 digits + 1 letter
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="is_active">Status</Label>
                          <Select 
                            value={formData.is_active.toString()} 
                            onValueChange={(value) => setFormData({ ...formData, is_active: value === 'true' })}
                          >
                            <SelectTrigger className="hover:border-primary/50 transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Active</SelectItem>
                              <SelectItem value="false">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Account & Login Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                        <KeyRound className="h-4 w-4 text-primary" />
                        <span className="uppercase tracking-wide">Account & Login</span>
                      </div>
                      <div className="space-y-3 pl-6">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="email">Email {!editingDoctor && '*'}</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              placeholder="ravi.kumar@hospital.com"
                              required={!editingDoctor}
                              className={`hover:border-primary/50 focus-visible:border-primary transition-colors ${emailError ? 'border-destructive' : ''}`}
                            />
                            {emailError && (
                              <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                                <span className="text-xs">⚠️</span>
                                {emailError}
                              </p>
                            )}
                            {editingDoctor && !emailError && (
                              <p className="text-xs text-muted-foreground">
                                Update email address if needed
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="mobile_number">Mobile Number</Label>
                            <Input
                              id="mobile_number"
                              type="tel"
                              value={formData.mobile_number}
                              onChange={(e) => setFormData({ ...formData, mobile_number: formatMobileNumber(e.target.value) })}
                              placeholder="9876543210"
                              maxLength={10}
                              className={`hover:border-primary/50 focus-visible:border-primary transition-colors ${mobileError ? 'border-destructive' : ''}`}
                            />
                            {mobileError && (
                              <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                                <span className="text-xs">⚠️</span>
                                {mobileError}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              10-digit number for OTP login
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="password">Password {!editingDoctor && '*'}</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder={editingDoctor ? "Leave blank to keep current password" : "Minimum 6 characters"}
                            required={!editingDoctor}
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                          {editingDoctor && (
                            <p className="text-xs text-muted-foreground">
                              Leave blank to keep current password
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bank Details Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                        <Landmark className="h-4 w-4 text-primary" />
                        <span className="uppercase tracking-wide">Bank Details</span>
                      </div>
                      <div className="space-y-3 pl-6">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="account_holder_name">Account Holder Name</Label>
                            <Input
                              id="account_holder_name"
                              value={formData.account_holder_name}
                              onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                              placeholder="Dr. Ravi Kumar"
                              className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="bank_account_number">Account Number</Label>
                            <Input
                              id="bank_account_number"
                              value={formData.bank_account_number}
                              onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                              placeholder="12345678901234"
                              className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="bank_name">Bank Name</Label>
                            <Input
                              id="bank_name"
                              value={formData.bank_name}
                              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                              placeholder="State Bank of India"
                              className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="branch_name">Branch Name</Label>
                            <Input
                              id="branch_name"
                              value={formData.branch_name}
                              onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                              placeholder="Chennai Main Branch"
                              className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="ifsc_code">IFSC Code</Label>
                          <Input
                            id="ifsc_code"
                            value={formData.ifsc_code}
                            onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                            placeholder="SBIN0001234"
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0 bg-background">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !!emailError}>
                    {submitting ? (editingDoctor ? 'Updating...' : 'Creating...') : (editingDoctor ? 'Update Doctor' : 'Create Doctor')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>

    {/* Search and Stats */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by doctor name, code, specialization, or mobile number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table View */}
      {(() => {
        const handleSort = (field: 'doctor_code' | 'full_name' | 'specialization') => {
          if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
          } else {
            setSortField(field);
            setSortDirection('asc');
          }
        };

        const SortIcon = ({ field }: { field: typeof sortField }) => {
          if (sortField !== field) return null;
          return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />;
        };

        const filteredAndSortedDoctors = doctors
          .filter((doctor) => {
            const searchLower = searchQuery.toLowerCase();
            return (
              doctor.profiles?.full_name.toLowerCase().includes(searchLower) ||
              doctor.doctor_code.toLowerCase().includes(searchLower) ||
              doctor.specialization.toLowerCase().includes(searchLower) ||
              doctor.mobile_number?.toLowerCase().includes(searchLower)
            );
          })
          .sort((a, b) => {
            let aVal = sortField === 'full_name' ? (a.profiles?.full_name || '') : a[sortField];
            let bVal = sortField === 'full_name' ? (b.profiles?.full_name || '') : b[sortField];
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
          });

        return filteredAndSortedDoctors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No doctors found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery ? "No doctors match your search criteria." : 
                  (userRole === 'admin' || userRole === 'manager')
                    ? "Get started by adding your first doctor to the system."
                    : "No doctors are currently registered in the system."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('doctor_code')}>
                    Doctor Code <SortIcon field="doctor_code" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('full_name')}>
                    Full Name <SortIcon field="full_name" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('specialization')}>
                    Specialization <SortIcon field="specialization" />
                  </TableHead>
                  <TableHead>PAN Number</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                  {(userRole === 'admin' || userRole === 'manager') && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedDoctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.doctor_code}</TableCell>
                    <TableCell>{doctor.profiles?.full_name || 'N/A'}</TableCell>
                    <TableCell>{doctor.specialization}</TableCell>
                    <TableCell>
                      {doctor.pan_number ? (
                        <span className="font-mono text-sm">{doctor.pan_number}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not provided</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doctor.bank_account_number ? (
                        <div className="text-sm">
                          <div className="font-mono">{doctor.bank_account_number}</div>
                          <div className="text-muted-foreground">{doctor.bank_name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{doctor.ifsc_code || 'N/A'}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not provided</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={doctor.is_active ? "default" : "secondary"}>
                        {doctor.is_active ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                        {doctor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(doctor)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant={doctor.is_active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handleStatusChange(doctor)}
                            disabled={!doctor.is_active && userRole !== 'admin'}
                          >
                            {doctor.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );
      })()}

       {/* Confirmation Dialog */}
       <AlertDialog open={confirmDialog.open} onOpenChange={(open) => 
         !open && setConfirmDialog({ open: false, doctor: null, action: null })
       }>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>
               {confirmDialog.action === 'deactivate' ? 'Deactivate Doctor' : 'Activate Doctor'}
             </AlertDialogTitle>
             <AlertDialogDescription>
               {confirmDialog.action === 'deactivate' 
                 ? `Are you sure you want to deactivate Dr. ${confirmDialog.doctor?.profiles?.full_name}? They will no longer be able to access the system.`
                 : `Are you sure you want to activate Dr. ${confirmDialog.doctor?.profiles?.full_name}? They will regain access to the system.`
               }
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction 
               onClick={confirmStatusChange}
               className={confirmDialog.action === 'deactivate' ? 'bg-destructive hover:bg-destructive/90' : ''}
             >
               {confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
 };

export default DoctorManagement;