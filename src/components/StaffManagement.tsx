import React, { useState, useEffect, useRef } from 'react';
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
import { Plus, Edit, Users, UserCheck, UserX, Search, Download, Upload, Loader2, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { formatDateIST } from '@/lib/dateUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  generateStaffTemplate, 
  parseExcelFile, 
  generateStaffCodeByRole, 
  validateStaffCode,
  analyzeStaffImport,
  type ImportResults
} from '@/lib/excelImportUtils';
import { getSessionAuthHeaders } from '@/lib/sessionAuth';
import { handleCreateUserError } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination-controls';

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
}

const StaffManagement = () => {
  const { userRole } = useAuth();
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
    role: 'nurse',
    department: ''
  });
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [showImportResults, setShowImportResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rolesMaster, setRolesMaster] = useState<Array<{ id: string; role_code: string; role_name: string }>>([]);
  const [departmentsMaster, setDepartmentsMaster] = useState<Array<{ id: string; department_code: string; department_name: string }>>([]);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchStaff();
      fetchRolesMaster();
      fetchDepartmentsMaster();
    }
  }, [userRole]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });

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

    if (!['admin', 'manager'].includes(userRole || '')) {
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
            department: formData.department.trim() || null
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

          // Update auth user password if provided
          if (formData.password.trim()) {
            const { error: credUpdateError } = await supabase.functions.invoke('update-user-credentials', {
              body: {
                userId: editingStaff.user_id,
                password: formData.password.trim()
              },
              headers: getSessionAuthHeaders()
            });

            if (credUpdateError) {
              console.error('Failed to update password:', credUpdateError);
              // Don't throw error - continue with other updates
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

      // Validate uniqueness for new staff (only username, email can be duplicate)
      const [usernameCheck, staffCodeCheck] = await Promise.all([
        supabase.from('staff').select('id').eq('username', formData.username).maybeSingle(),
        supabase.from('staff').select('id').eq('staff_code', staffCode).maybeSingle()
      ]);

      if (usernameCheck.data) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: `Username "${formData.username}" is already in use`
        });
        return;
      }

      if (staffCodeCheck.data) {
        // Generate a new code if collision
        const newStaffCode = generateStaffCode();
        console.log(`Staff code collision, using ${newStaffCode} instead of ${staffCode}`);
      }

      // Generate unique email if none provided
      const baseGenerated = `${formData.username}.${Date.now()}@hospital.local`;
      const uniqueEmail = formData.email || baseGenerated;
      // Map staff role to profiles.user_role enum
      const profileRole = (['admin','manager','doctor'] as const).includes(formData.role as any)
        ? (formData.role as 'admin'|'manager'|'doctor')
        : 'staff';

      // Attempt to create auth user via edge function (with one retry on email collision)
      let createdUser: any = null;
      let { data: result, error: createUserError } = await supabase.functions.invoke('create-user', {
        body: {
          email: uniqueEmail,
          password: formData.password,
          userData: {
            full_name: formData.full_name,
            role: profileRole
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
              userData: {
                full_name: formData.full_name,
                role: profileRole
              }
            },
            headers: getSessionAuthHeaders()
          });
          if (retry.error || !retry.data?.success) {
            throw new Error(handleCreateUserError(retry.error, retry.data, retryEmail));
          }
          createdUser = retry.data.user;
        } else {
          // For user-provided emails or other errors, show clear message
          const errorMessage = handleCreateUserError(createUserError, result, formData.email);
          throw new Error(errorMessage);
        }
      } else {
        createdUser = result.user;
      }

      // Get or create profile record (profile should exist due to trigger)
      let profileData;
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', createdUser.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingProfile) {
        // Use existing profile created by trigger; admins/managers cannot UPDATE due to RLS
        profileData = existingProfile;
      } else {
        // Fallback: create profile if it doesn't exist (shouldn't happen due to trigger)
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: createdUser.id,
            full_name: formData.full_name,
            role: profileRole as any
          })
          .select()
          .single();

        if (insertError) throw insertError;
        profileData = newProfile;
      }

      // Create staff record with user_id link
      const { error } = await supabase
        .from('staff')
        .insert({
          user_id: createdUser.id, // Link directly to auth user
          staff_code: staffCode,
          username: formData.username.trim(),
          password_hash: 'managed_by_supabase_auth', // Placeholder since auth is handled by Supabase
          full_name: formData.full_name.trim(),
          email: createdUser.email, // Store the actual email used for auth
          phone: formData.phone.trim() || null,
          role: formData.role as any,
          department: formData.department.trim() || null
        });

      if (error) throw error;

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
      department: ''
    });
    setEditingStaff(null);
  };

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      staff_code: staffMember.staff_code,
      username: staffMember.username,
      password: '', // Don't pre-fill for security
      full_name: staffMember.full_name,
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      role: staffMember.role,
      department: staffMember.department || ''
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
      
      // Skip the first row (sample data)
      const dataRows = rows.slice(1);
      
      const { data: existingStaff } = await supabase.from('staff').select('*');
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 3; // Excel row (1=header, 2=sample, 3+=data)
        
        try {
          if (!row.username || !row.full_name || !row.role) {
            results.errors.push({
              row: rowNumber,
              message: 'Missing required fields (username, full_name, or role)'
            });
            continue;
          }
          
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
                department: row.department || null
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
                userData: {
                  full_name: row.full_name,
                  role: profileRole
                }
              },
              headers: getSessionAuthHeaders()
            });
            
            if (authError || !authResult?.success) {
              throw new Error(authResult?.error || 'Failed to create user');
            }
            
            const { error: staffError } = await supabase
              .from('staff')
              .insert({
                user_id: authResult.user.id, // Link directly to auth user
                staff_code: staffCode,
                username: row.username,
                password_hash: 'managed_by_supabase_auth',
                full_name: row.full_name,
                email: authResult.user.email,
                phone: row.phone || null,
                role: row.role,
                department: row.department || null
              });
            
            if (staffError) throw staffError;
            
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

  if (!['admin', 'manager'].includes(userRole || '')) {
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
        
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Create a new staff member account with login credentials and role assignment.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staff_code">Staff Code (Optional)</Label>
                  <Input
                    id="staff_code"
                    value={formData.staff_code}
                    onChange={(e) => setFormData({ ...formData, staff_code: e.target.value })}
                    placeholder="Auto-generated if empty"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="anand.kumar"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password {!editingStaff && '*'}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingStaff ? "Leave blank to keep current password" : "Minimum 6 characters"}
                    required={!editingStaff}
                  />
                  {editingStaff && (
                    <p className="text-xs text-muted-foreground">
                      Leave blank to keep current password
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Anand Kumar"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="anand.kumar@hospital.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesMaster.map((role) => (
                        <SelectItem key={role.id} value={role.role_code}>
                          {role.role_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={formData.department} 
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentsMaster.map((dept) => (
                        <SelectItem key={dept.id} value={dept.department_code}>
                          {dept.department_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
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
          className="pl-10"
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