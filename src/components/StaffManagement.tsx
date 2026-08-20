import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Users, UserCheck, UserX, Search, Download, Upload, Loader2, Eye, EyeOff, ChevronUp, ChevronDown, IdCard, Phone, Landmark, ShieldCheck, Printer } from 'lucide-react';
import { printReport, autoFitColumns } from '@/lib/printUtils';
import { formatDateIST } from '@/lib/dateUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  generateStaffTemplate, 
  generateStaffMappingExport,
  parseExcelFile, 
  generateStaffCodeByRole, 
  validateStaffCode,
  analyzeStaffImport,
  stripSampleRows,
  type ImportResults

} from '@/lib/excelImportUtils';

import { getSessionAuthHeaders } from '@/lib/sessionAuth';
import { handleCreateUserError } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { validateIFSCCode } from '@/lib/validators';

interface Staff {
  id: string;
  staff_code: string;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: string;
  department?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  user_id?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  bank_name?: string;
  branch_name?: string;
  biometric_code?: string;
  biometric_device?: string;
}

interface StaffManagementProps {
  excludeAdminAndDoctor?: boolean;
}

const StaffManagement = ({ excludeAdminAndDoctor = false }: StaffManagementProps = {}) => {
  const { userRole, userDesignation } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    staff: Staff | null;
    action: 'activate' | 'deactivate' | null;
  }>({ open: false, staff: null, action: null });
  const [sortField, setSortField] = useState<'staff_code' | 'full_name' | 'role'>('staff_code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'all'>(20);
  const [formData, setFormData] = useState({
    staff_code: '',
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    bank_account_number: '',
    ifsc_code: '',
    account_holder_name: '',
    bank_name: '',
    branch_name: '',
    biometric_code: '',
    biometric_device: ''
  });
  const [emailError, setEmailError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [showImportResults, setShowImportResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rolesMaster, setRolesMaster] = useState<Array<{ id: string; role_code: string; role_name: string }>>([]);
  const [departmentsMaster, setDepartmentsMaster] = useState<Array<{ id: string; department_code: string; department_name: string }>>([]);
  const [deptRoleMappings, setDeptRoleMappings] = useState<Array<{ department_id: string; role_id: string }>>([]);
  const [filteredRoles, setFilteredRoles] = useState<Array<{ id: string; role_code: string; role_name: string }>>([]);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin' || 
        userDesignation === 'admin' || userDesignation === 'manager' || userDesignation === 'super_admin') {
      fetchStaff();
      fetchRolesMaster();
      fetchDepartmentsMaster();
      fetchDeptRoleMappings();
    }
  }, [userRole, userDesignation]);

  // Filter roles based on selected department
  useEffect(() => {
    if (!formData.department) {
      setFilteredRoles(rolesMaster);
      return;
    }
    const selectedDept = departmentsMaster.find(d => d.department_code === formData.department);
    if (!selectedDept) {
      setFilteredRoles(rolesMaster);
      return;
    }
    const mappedRoleIds = deptRoleMappings
      .filter(m => m.department_id === selectedDept.id)
      .map(m => m.role_id);
    
    if (mappedRoleIds.length === 0) {
      // Fallback: show all roles if no mapping exists
      setFilteredRoles(rolesMaster);
    } else {
      setFilteredRoles(rolesMaster.filter(r => mappedRoleIds.includes(r.id)));
    }
  }, [formData.department, deptRoleMappings, departmentsMaster, rolesMaster]);

  // Real-time email validation with debouncing
  useEffect(() => {
    if (!formData.email.trim() || formData.email === editingStaff?.email) {
      setEmailError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      const { data } = await supabase
        .from('staff')
        .select('id, email')
        .eq('email', formData.email.trim())
        .maybeSingle();
      
      if (data) {
        setEmailError('This email is already registered');
      } else {
        setEmailError('');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.email, editingStaff]);

  const fetchStaff = async () => {
    try {
      let query: any = supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });
      if (excludeAdminAndDoctor) {
        query = query.not('role', 'in', '(doctor,admin)');
      }
      const { data, error } = await query;

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch staff. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDeptRoleMappings = async () => {
    const { data, error } = await (supabase as any)
      .from('department_role_mapping')
      .select('department_id, role_id')
      .eq('is_active', true);
    
    if (!error && data) {
      setDeptRoleMappings(data);
    }
  };

  const fetchRolesMaster = async () => {
    const { data, error } = await supabase
      .from('roles_master')
      .select('id, role_code, role_name')
      .eq('is_active', true)
      .order('display_order');
    
    if (!error && data) {
      setRolesMaster(data);
    }
  };

  const fetchDepartmentsMaster = async () => {
    const { data, error } = await supabase
      .from('departments_master')
      .select('id, department_code, department_name')
      .eq('is_active', true)
      .order('display_order');
    
    if (!error && data) {
      setDepartmentsMaster(data);
    }
  };

  const generateStaffCode = () => {
    const roles = {
      'admin': 'ADM',
      'manager': 'MGR', 
      'nurse': 'NUR',
      'doctor': 'DOC',
      'technician': 'TEC',
      'receptionist': 'REC',
      'pharmacist': 'PHM',
      'cleaner': 'CLN',
      'security': 'SEC'
    };
    const prefix = roles[formData.role as keyof typeof roles] || 'STF';
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${randomNum}`;
  };

  const hashPassword = async (password: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!['admin', 'manager', 'super_admin'].includes(userRole || '')) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins and managers can create staff members"
      });
      return;
    }

    // Validation
    if (!formData.username.trim() || !formData.full_name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Username and full name are required"
      });
      setSubmitting(false);
      return;
    }

    // Biometric code is mandatory for new and edited staff (existing records may be blank until edited)
    if (!formData.biometric_code.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Biometric Code is required (employee code from the punch machine)"
      });
      setSubmitting(false);
      return;
    }

    {
      const biometricQuery = supabase
        .from('staff')
        .select('id, full_name, staff_code')
        .ilike('biometric_code', formData.biometric_code.trim());
      const { data: dupBiometric } = await (editingStaff
        ? biometricQuery.neq('id', editingStaff.id)
        : biometricQuery
      ).maybeSingle();
      if (dupBiometric) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: `Biometric code "${formData.biometric_code.trim()}" is already assigned to ${(dupBiometric as any).full_name}`
        });
        setSubmitting(false);
        return;
      }
    }



    // Validate bank details if provided
    if (formData.bank_account_number.trim() && !formData.ifsc_code.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "IFSC Code is required when Account Number is provided"
      });
      setSubmitting(false);
      return;
    }

    if (formData.ifsc_code.trim() && !formData.bank_account_number.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Account Number is required when IFSC Code is provided"
      });
      setSubmitting(false);
      return;
    }

    // Validate IFSC code format if provided
    if (formData.ifsc_code.trim() && !validateIFSCCode(formData.ifsc_code.trim())) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Invalid IFSC Code format. It should be 11 characters (e.g., SBIN0001234)"
      });
      setSubmitting(false);
      return;
    }

    try {
      if (editingStaff) {
        // Validate staff_code uniqueness (exclude current staff)
        if (formData.staff_code && formData.staff_code !== editingStaff.staff_code) {
          const { data: existingStaffCode } = await supabase
            .from('staff')
            .select('id')
            .eq('staff_code', formData.staff_code)
            .neq('id', editingStaff.id)
            .maybeSingle();
          
          if (existingStaffCode) {
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: `Staff code "${formData.staff_code}" is already in use`
            });
            return;
          }
        }

        // Validate username uniqueness (exclude current staff)
        if (formData.username !== editingStaff.username) {
          const { data: existingUsername } = await supabase
            .from('staff')
            .select('id')
            .eq('username', formData.username)
            .neq('id', editingStaff.id)
            .maybeSingle();
          
          if (existingUsername) {
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: `Username "${formData.username}" is already in use`
            });
            return;
          }
        }

        // Email can be duplicate, so no validation needed

        // Update existing staff
        const { error: staffError } = await supabase
          .from('staff')
          .update({
            staff_code: formData.staff_code || generateStaffCode(),
            username: formData.username.trim(),
            full_name: formData.full_name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            role: formData.role as any,
            department: formData.department.trim() || null,
            bank_account_number: formData.bank_account_number.trim() || null,
            ifsc_code: formData.ifsc_code.trim().toUpperCase() || null,
            account_holder_name: formData.account_holder_name.trim() || null,
            bank_name: formData.bank_name.trim() || null,
            branch_name: formData.branch_name.trim() || null,
            biometric_code: formData.biometric_code.trim() || null,
            biometric_device: formData.biometric_device.trim() || null
          })
          .eq('id', editingStaff.id);

        if (staffError) {
          console.error('Staff update error:', staffError);
          if (staffError.message.includes('duplicate key value')) {
            toast({
              variant: "destructive",
              title: "Duplicate Entry",
              description: "Username, email, or staff code already exists. Please use different values."
            });
            return;
          }
          throw staffError;
        }

        // Update profile name and password if staff has user_id
        if (editingStaff.user_id) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: formData.full_name.trim(),
              role: ((['admin','manager','doctor'] as const).includes(formData.role as any) ? formData.role : 'staff') as any
            })
            .eq('user_id', editingStaff.user_id);

          if (profileError) {
            console.error('Failed to update profile:', profileError);
            // Don't throw error - continue with other updates
          }

          // Update auth user credentials (email and/or password) if provided
          const shouldUpdateEmail = formData.email.trim() && formData.email.trim() !== editingStaff.email;
          const shouldUpdatePassword = formData.password.trim();
          
          if (shouldUpdateEmail || shouldUpdatePassword) {
            const updateBody: any = { userId: editingStaff.user_id };
            if (shouldUpdateEmail) updateBody.email = formData.email.trim();
            if (shouldUpdatePassword) updateBody.password = formData.password.trim();
            
            const { error: credUpdateError } = await supabase.functions.invoke('update-user-credentials', {
              body: updateBody,
              headers: getSessionAuthHeaders()
            });

            if (credUpdateError) {
              console.error('Failed to update credentials:', credUpdateError);
              toast({
                variant: "destructive",
                title: "Credential Sync Warning",
                description: "Staff record updated but authentication credentials may not be synced. Please use the Auth Synchronization tool."
              });
            }
          }
        }

        toast({
          title: "Success",
          description: "Staff member updated successfully"
        });

        setDialogOpen(false);
        setEditingStaff(null);
        resetForm();
        fetchStaff();
        return;
      }

      // Create new staff (existing logic)
      if (!formData.password.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Password is required for new staff members"
        });
        return;
      }

      if (formData.password.length < 6) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Password must be at least 6 characters long"
        });
        return;
      }

      const staffCode = formData.staff_code || generateStaffCode();

      // Validate uniqueness for new staff (username and email if provided)
      const usernameCheck = await supabase.from('staff').select('id').eq('username', formData.username).maybeSingle();
      const staffCodeCheck = await supabase.from('staff').select('id').eq('staff_code', staffCode).maybeSingle();

      if (usernameCheck.data) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: `Username "${formData.username}" is already in use`
        });
        setSubmitting(false);
        return;
      }

      if (staffCodeCheck.data) {
        // Generate a new code if collision
        const newStaffCode = generateStaffCode();
        console.log(`Staff code collision, using ${newStaffCode} instead of ${staffCode}`);
      }

      // Email validation now handled by real-time useEffect
      // Additional check for safety (should never trigger due to button disable)
      if (emailError) {
        toast({
          variant: "destructive",
          title: "Email Already Exists",
          description: emailError
        });
        setSubmitting(false);
        return;
      }

      // Generate unique email if none provided
      const baseGenerated = `${formData.username}.${Date.now()}@hospital.local`;
      const uniqueEmail = formData.email || baseGenerated;
      // Map staff role to profiles.user_role enum
      const profileRole = (['admin','manager','doctor'] as const).includes(formData.role as any)
        ? (formData.role as 'admin'|'manager'|'doctor')
        : 'staff';

      // Map staff role to designation for user_designations table
      const mapRoleToDesignation = (role: string): string => {
        if (role === 'admin') return 'admin';
        if (role === 'manager') return 'manager';
        if (role === 'doctor') return 'doctor';
        return 'staff';
      };

      const designation = mapRoleToDesignation(formData.role);

      // Attempt to create auth user via edge function (with one retry on email collision)
      let createdUser: any = null;
      let { data: result, error: createUserError } = await supabase.functions.invoke('create-user', {
        body: {
          email: uniqueEmail,
          password: formData.password,
          designation: designation,
          userData: {
            full_name: formData.full_name,
            role: profileRole
          },
          staffData: {
            password: formData.password,
            staff_code: staffCode,
            username: formData.username.trim(),
            role: formData.role,
            department: formData.department.trim() || null,
            phone: formData.phone.trim() || null,
            bank_account_number: formData.bank_account_number.trim() || null,
            ifsc_code: formData.ifsc_code.trim().toUpperCase() || null,
            account_holder_name: formData.account_holder_name.trim() || null,
            bank_name: formData.bank_name.trim() || null,
            branch_name: formData.branch_name.trim() || null,
            biometric_code: formData.biometric_code.trim() || null,
            biometric_device: formData.biometric_device.trim() || null
          }
        },
        headers: getSessionAuthHeaders()
      });

      if (createUserError || !result?.success) {
        const msg = result?.error || createUserError?.message || '';
        const errorCode = result?.code;
        
        // For auto-generated emails, retry with a new email on collision
        const needsRetry = !formData.email && (errorCode === 'email_exists' || /already.*(registered|exists)/i.test(msg));
        
        if (needsRetry) {
          const retryEmail = `${formData.username}.${Date.now()}_${Math.floor(Math.random()*1000)}@hospital.local`;
          const retry = await supabase.functions.invoke('create-user', {
            body: {
              email: retryEmail,
              password: formData.password,
              designation: designation,
              userData: {
                full_name: formData.full_name,
                role: profileRole
              },
              staffData: {
                password: formData.password,
                staff_code: staffCode,
                username: formData.username.trim(),
                role: formData.role,
                department: formData.department.trim() || null,
                phone: formData.phone.trim() || null,
                bank_account_number: formData.bank_account_number.trim() || null,
                ifsc_code: formData.ifsc_code.trim().toUpperCase() || null,
                account_holder_name: formData.account_holder_name.trim() || null,
                bank_name: formData.bank_name.trim() || null,
                branch_name: formData.branch_name.trim() || null,
                biometric_code: formData.biometric_code.trim() || null,
                biometric_device: formData.biometric_device.trim() || null
              }
            },
            headers: getSessionAuthHeaders()
          });
          if (retry.error || !retry.data?.success) {
            throw new Error(await handleCreateUserError(retry.error, retry.data, retryEmail));
          }
          createdUser = retry.data.user;
        } else {
          // For user-provided emails or other errors, show clear message
          const errorMessage = await handleCreateUserError(createUserError, result, formData.email);
          throw new Error(errorMessage);
        }
      } else {
        createdUser = result.user;
      }

      if (!createdUser?.id) throw new Error('Failed to create staff login');

      toast({
        title: "Success",
        description: `Staff member created successfully with code: ${staffCode}`
      });

      setDialogOpen(false);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save staff member"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = (staff: Staff) => {
    const action = staff.is_active ? 'deactivate' : 'activate';
    
    // Check permissions for reactivation
    if (!staff.is_active && userRole !== 'admin') {
      toast({
        variant: "destructive", 
        title: "Access Denied",
        description: "Only administrators can reactivate deactivated staff members"
      });
      return;
    }

    setConfirmDialog({
      open: true,
      staff,
      action
    });
  };

  const confirmStatusChange = async () => {
    if (!confirmDialog.staff || !confirmDialog.action) return;

    try {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: confirmDialog.action === 'activate' })
        .eq('id', confirmDialog.staff.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Staff member ${confirmDialog.action === 'activate' ? 'activated' : 'deactivated'} successfully`
      });

      fetchStaff();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update staff status"
      });
    } finally {
      setConfirmDialog({ open: false, staff: null, action: null });
    }
  };

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: !currentStatus })
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Staff member ${!currentStatus ? 'activated' : 'deactivated'}`
      });

      fetchStaff();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update staff status"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      staff_code: '',
      username: '',
      password: '',
      full_name: '',
      email: '',
      phone: '',
      role: 'nurse',
      department: '',
      bank_account_number: '',
      ifsc_code: '',
      account_holder_name: '',
      bank_name: '',
      branch_name: '',
      biometric_code: '',
      biometric_device: ''
    });
    setEditingStaff(null);
  };

  const handleEdit = async (staffMember: Staff) => {
    // Always reload from DB so we never prefill stale cached values
    let fresh: Staff = staffMember;
    try {
      const { data } = await supabase.from('staff').select('*').eq('id', staffMember.id).maybeSingle();
      if (data) fresh = { ...staffMember, ...(data as any) } as Staff;
    } catch { /* fall back */ }
    setEditingStaff(fresh);
    setFormData({
      staff_code: fresh.staff_code,
      username: fresh.username,
      password: '', // Don't pre-fill for security
      full_name: fresh.full_name,
      email: fresh.email || '',
      phone: fresh.phone || '',
      role: fresh.role,
      department: fresh.department || '',
      bank_account_number: fresh.bank_account_number || '',
      ifsc_code: fresh.ifsc_code || '',
      account_holder_name: fresh.account_holder_name || '',
      bank_name: fresh.bank_name || '',
      branch_name: fresh.branch_name || '',
      biometric_code: (fresh as any).biometric_code || '',
      biometric_device: (fresh as any).biometric_device || ''
    });
    setDialogOpen(true);
  };

  const handleStaffImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!['admin', 'manager'].includes(userRole || '')) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins and managers can import staff"
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
      
      // Omit the instructional sample row(s) if still present
      const skippedSampleRows = rows.length - stripSampleRows(rows).length;
      const dataRows = stripSampleRows(rows);
      
      const { data: existingStaff } = await supabase.from('staff').select('*');
      const seenBiometric = new Set<string>();

      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2 + skippedSampleRows; // Excel row (1=header)

        
        try {
          if (!row.username || !row.full_name || !row.role) {
            results.errors.push({
              row: rowNumber,
              message: 'Missing required fields (username, full_name, or role)'
            });
            continue;
          }

          // Biometric code is mandatory and must be unique (needed for attendance import)
          const bioCode = String(row.biometric_code ?? '').trim();
          if (!bioCode) {
            results.errors.push({
              row: rowNumber,
              message: 'Missing biometric_code (punch machine Emp Code) — required to match attendance imports'
            });
            continue;
          }
          const bioKey = bioCode.toLowerCase();
          if (seenBiometric.has(bioKey)) {
            results.errors.push({
              row: rowNumber,
              message: `Duplicate biometric_code "${bioCode}" appears more than once in this file`
            });
            continue;
          }
          seenBiometric.add(bioKey);
          const bioOwner = (existingStaff || []).find(
            (s: any) => String(s.biometric_code ?? '').trim().toLowerCase() === bioKey
          );
          const rowStaffCode = String(row.staff_code ?? '').trim();
          if (bioOwner && bioOwner.staff_code !== rowStaffCode) {
            results.errors.push({
              row: rowNumber,
              message: `Biometric code "${bioCode}" is already assigned to ${bioOwner.full_name} (${bioOwner.staff_code})`
            });
            continue;
          }
          row.biometric_code = bioCode;

          
          // Auto-generate email from username if missing
          if (!row.email) {
            const sanitizedUsername = row.username
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');
            row.email = `${sanitizedUsername}@gmail.com`;
          }
          
          // Set default password if missing
          if (!row.password) {
            row.password = 'SecurePass789';
          }
          
          let staffCode = row.staff_code?.trim();
          if (!staffCode) {
            staffCode = generateStaffCodeByRole(row.role);
            while (existingStaff?.some(s => s.staff_code === staffCode)) {
              staffCode = generateStaffCodeByRole(row.role);
            }
          } else if (!validateStaffCode(staffCode)) {
            results.errors.push({
              row: rowNumber,
              message: `Invalid staff code format: ${staffCode}`
            });
            continue;
          }
          
          const decision = analyzeStaffImport(
            { ...row, staff_code: staffCode },
            existingStaff || []
          );
          
          if (decision.action === 'skip') {
            results.skipped++;
            continue;
          }
          
          if (decision.action === 'update') {
            const { error } = await supabase
              .from('staff')
              .update({
                username: row.username,
                full_name: row.full_name,
                email: row.email || null,
                phone: row.phone || null,
                role: row.role,
                department: row.department || null,
                ...(row.biometric_code ? { biometric_code: String(row.biometric_code).trim() } : {}),
                ...(row.biometric_device ? { biometric_device: String(row.biometric_device).trim() } : {})

              })
              .eq('staff_code', staffCode);
            
            if (error) throw error;
            
            if (decision.existingRecord?.user_id) {
              await supabase
                .from('profiles')
                .update({ full_name: row.full_name })
                .eq('user_id', decision.existingRecord.user_id);
                
              if (row.password) {
                await supabase.functions.invoke('update-user-credentials', {
                  body: {
                    userId: decision.existingRecord.user_id,
                    password: row.password
                  },
                  headers: getSessionAuthHeaders()
                });
              }
            }
            
            results.updated++;
          } else {
            // Password is now auto-generated above if missing, so just use it
            const email = row.email; // Already set to sanitized_username@gmail.com or user-provided
            const profileRole = ['admin','manager','doctor'].includes(row.role) 
              ? row.role 
              : 'staff';
            
            const { data: authResult, error: authError } = await supabase.functions.invoke('create-user', {
              body: {
                email,
                password: row.password,
                designation: profileRole,
                userData: {
                  full_name: row.full_name,
                  role: profileRole
                },
                staffData: {
                  password: row.password,
                  staff_code: staffCode,
                  username: row.username,
                  role: row.role,
                  department: row.department || null,
                  phone: row.phone || null,
                  bank_account_number: row.bank_account_number || null,
                  ifsc_code: row.ifsc_code || null,
                  account_holder_name: row.account_holder_name || null,
                  bank_name: row.bank_name || null,
                  branch_name: row.branch_name || null,
                  biometric_code: row.biometric_code ? String(row.biometric_code).trim() : null,
                  biometric_device: row.biometric_device ? String(row.biometric_device).trim() : null

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
      fetchStaff();
      
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

  const exportStaffToExcel = () => {
    // Get filtered staff (same logic as displayed in the table)
    const filteredStaff = staff
      .filter((member) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          member.full_name.toLowerCase().includes(searchLower) ||
          member.staff_code.toLowerCase().includes(searchLower) ||
          member.username.toLowerCase().includes(searchLower) ||
          member.role.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

    if (filteredStaff.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "There are no staff members to export. Please adjust your search filters."
      });
      return;
    }

    // Format data for Excel export
    const exportData = filteredStaff.map(member => ({
      'Staff Code': member.staff_code,
      'Username': member.username,
      'Full Name': member.full_name,
      'Email': member.email || 'Not provided',
      'Phone': member.phone || 'Not provided',
      'Role': member.role,
      'Department': member.department || 'Not provided',
      'Status': member.is_active ? 'Active' : 'Inactive',
      'Last Login': member.last_login ? formatDateIST(member.last_login) : 'Never'
    }));

    try {
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 15 }, // Staff Code
        { wch: 15 }, // Username
        { wch: 25 }, // Full Name
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }, // Role
        { wch: 20 }, // Department
        { wch: 10 }, // Status
        { wch: 20 }  // Last Login
      ];

      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Staff List');

      // Generate filename with timestamp
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const filename = `staff_list_${day}${month}${year}_${hours}${minutes}_westmed.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Successful",
        description: `${filteredStaff.length} staff member(s) exported to Excel successfully.`
      });
    } catch (error) {
      console.error('Excel Export Error:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: `Failed to export staff: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'doctor': return 'secondary';
      default: return 'outline';
    }
  };

  if (!['admin', 'manager', 'super_admin'].includes(userRole || '') && 
      !['admin', 'manager', 'super_admin'].includes(userDesignation || '')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Only admins and managers can manage staff.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
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
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage hospital staff members and their access</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateStaffTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>

          <Button
            variant="outline"
            onClick={() => generateStaffMappingExport(staff as any)}
            disabled={staff.length === 0}
            title="Export existing staff in template format to fill biometric codes and re-import"
          >
            <IdCard className="h-4 w-4 mr-2" />
            Export for Biometric Mapping
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
            onChange={handleStaffImport}
          />
          
          <Button
            variant="outline"
            onClick={exportStaffToExcel}
            disabled={staff.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Staff
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const cols = [
                { label: 'Staff Code', key: 'Staff Code' },
                { label: 'Full Name', key: 'Full Name' },
                { label: 'Role', key: 'Role' },
                { label: 'Department', key: 'Department' },
                { label: 'Status', key: 'Status' },
              ];
              const data = staff.map(m => ({
                'Staff Code': m.staff_code,
                'Full Name': m.full_name,
                'Role': m.role,
                'Department': m.department || '-',
                'Status': m.is_active ? 'Active' : 'Inactive',
              }));
              printReport({ title: 'Staff List', columns: cols, data });
            }}
            disabled={staff.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden" hasUnsavedChanges={Object.values(formData).some(v => typeof v === 'string' && v.trim() !== '')} onConfirmClose={() => { resetForm(); setDialogOpen(false); }}>
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{editingStaff ? 'Update Staff Member' : 'Add New Staff Member'}</DialogTitle>
              <DialogDescription>
                {editingStaff ? 'Update staff member information and credentials.' : 'Create a new staff member account with login credentials and role assignment.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-rows-[minmax(0,1fr)_auto] overflow-hidden min-h-0">
              <ScrollArea className="h-full pr-4 -mr-4">
                <div className="space-y-4 pb-4 pr-4">
                  {/* Staff Identity Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                      <IdCard className="h-4 w-4 text-primary" />
                      <span className="uppercase tracking-wide">Staff Identity</span>
                    </div>
                    <div className="space-y-3 pl-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="staff_code">Staff Code (Optional)</Label>
                          <Input
                            id="staff_code"
                            value={formData.staff_code}
                            onChange={(e) => setFormData({ ...formData, staff_code: e.target.value })}
                            placeholder="Auto-generated if empty"
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="username">Username *</Label>
                          <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="anand.kumar"
                            required
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="full_name">Full Name *</Label>
                          <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="Anand Kumar"
                            required
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="password">Password {!editingStaff && '*'}</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder={editingStaff ? "Leave blank to keep current" : "Minimum 6 characters"}
                            required={!editingStaff}
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                          {editingStaff && (
                            <p className="text-xs text-muted-foreground">
                              Leave blank to keep current password
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="biometric_code">Biometric Code *</Label>
                          <Input
                            id="biometric_code"
                            value={formData.biometric_code}
                            onChange={(e) => setFormData({ ...formData, biometric_code: e.target.value })}
                            placeholder="e.g. 2100122"
                            required
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                          <p className="text-xs text-muted-foreground">
                            Employee code from the punch machine (used for attendance import)
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="biometric_device">Biometric Device</Label>
                          <Input
                            id="biometric_device"
                            value={formData.biometric_device}
                            onChange={(e) => setFormData({ ...formData, biometric_device: e.target.value })}
                            placeholder="Optional — device / location"
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="uppercase tracking-wide">Contact Information</span>
                    </div>
                    <div className="space-y-3 pl-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="anand.kumar@hospital.com"
                            className={`hover:border-primary/50 focus-visible:border-primary transition-colors ${emailError ? 'border-destructive' : ''}`}
                          />
                          {emailError && (
                            <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                              <span className="text-xs">⚠️</span>
                              {emailError}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+91 98765 43210"
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                        </div>
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
                            placeholder="As per bank records"
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="bank_account_number">Account Number *</Label>
                          <Input
                            id="bank_account_number"
                            value={formData.bank_account_number}
                            onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value.replace(/\D/g, '') })}
                            placeholder="1234567890123456"
                            maxLength={20}
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="ifsc_code">IFSC Code *</Label>
                          <Input
                            id="ifsc_code"
                            value={formData.ifsc_code}
                            onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                            placeholder="SBIN0001234"
                            maxLength={11}
                            className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                          />
                          <p className="text-xs text-muted-foreground">11-character code (e.g., SBIN0001234)</p>
                        </div>
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
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="branch_name">Branch Name</Label>
                        <Input
                          id="branch_name"
                          value={formData.branch_name}
                          onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                          placeholder="Main Branch"
                          className="hover:border-primary/50 focus-visible:border-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Role Assignment Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="uppercase tracking-wide">Role Assignment</span>
                    </div>
                    <div className="space-y-3 pl-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="department">Department *</Label>
                          <Select 
                            value={formData.department} 
                            onValueChange={(value) => setFormData({ ...formData, department: value, role: '' })}
                            required
                          >
                            <SelectTrigger className="hover:border-primary/50 transition-colors">
                              <SelectValue placeholder="Select department first" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {departmentsMaster.map((dept) => (
                                <SelectItem key={dept.id} value={dept.department_code}>
                                  {dept.department_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="role">Role *</Label>
                          <Select 
                            value={formData.role} 
                            onValueChange={(value) => setFormData({ ...formData, role: value })}
                            required
                            disabled={!formData.department}
                          >
                            <SelectTrigger className="hover:border-primary/50 transition-colors">
                              <SelectValue placeholder={formData.department ? "Select role" : "Select department first"} />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {filteredRoles.map((role) => (
                                <SelectItem key={role.id} value={role.role_code}>
                                  {role.role_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0 bg-background">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting || !!emailError || !formData.department.trim()}
                >
                  {submitting ? (editingStaff ? 'Updating...' : 'Creating...') : (editingStaff ? 'Update Staff Member' : 'Create Staff Member')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{staff.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Staff</p>
                <p className="text-2xl font-bold">{staff.filter(s => s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-destructive" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Inactive Staff</p>
                <p className="text-2xl font-bold">{staff.filter(s => !s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by staff name, code, or username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 hover:border-primary/50 focus-visible:border-primary transition-colors"
        />
      </div>

      {/* Table View */}
      {(() => {
        const handleSort = (field: 'staff_code' | 'full_name' | 'role') => {
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

        const filteredAndSortedStaff = staff
          .filter((member) => {
            const searchLower = searchQuery.toLowerCase();
            return (
              member.full_name.toLowerCase().includes(searchLower) ||
              member.staff_code.toLowerCase().includes(searchLower) ||
              member.username.toLowerCase().includes(searchLower)
            );
          })
          .sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (typeof aVal === 'string' && typeof bVal === 'string') {
              return sortDirection === 'asc' 
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
            }
            return 0;
          });

        return filteredAndSortedStaff.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No staff members found</h3>
              <p className="text-muted-foreground text-center">
                {searchQuery ? "No staff members match your search criteria." : "Get started by adding your first staff member."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('staff_code')}>
                    Staff Code <SortIcon field="staff_code" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('full_name')}>
                    Full Name <SortIcon field="full_name" />
                  </TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Biometric Code</TableHead>

                  <TableHead className="cursor-pointer" onClick={() => handleSort('role')}>
                    Role <SortIcon field="role" />
                  </TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.staff_code}</TableCell>
                    <TableCell>{member.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">{member.username}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.department || <span className="text-muted-foreground text-sm">N/A</span>}</TableCell>
                    <TableCell>
                      {member.email || member.phone ? (
                        <div className="text-sm">
                          {member.email && <div>{member.email}</div>}
                          {member.phone && <div className="text-muted-foreground">{member.phone}</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.is_active ? "default" : "secondary"}>
                        {member.is_active ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(member)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant={member.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleStatusChange(member)}
                          disabled={!member.is_active && userRole !== 'admin'}
                        >
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );
      })()}

       {staff.length === 0 && (
         <Card>
           <CardContent className="p-12 text-center">
             <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
             <h3 className="text-lg font-medium mb-2">No Staff Members</h3>
             <p className="text-muted-foreground mb-4">Get started by adding your first staff member.</p>
             <Button onClick={() => setDialogOpen(true)}>
               <Plus className="h-4 w-4 mr-2" />
               Add Staff Member
             </Button>
           </CardContent>
          </Card>
        )}

       {/* Confirmation Dialog */}  
       <AlertDialog open={confirmDialog.open} onOpenChange={(open) => 
         !open && setConfirmDialog({ open: false, staff: null, action: null })
       }>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>
               {confirmDialog.action === 'deactivate' ? 'Deactivate Staff Member' : 'Activate Staff Member'}
             </AlertDialogTitle>
             <AlertDialogDescription>
               {confirmDialog.action === 'deactivate' 
                 ? `Are you sure you want to deactivate ${confirmDialog.staff?.full_name}? They will no longer be able to access the system.`
                 : `Are you sure you want to activate ${confirmDialog.staff?.full_name}? They will regain access to the system.`
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

export default StaffManagement;