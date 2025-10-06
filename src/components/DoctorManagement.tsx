import React, { useState, useEffect, useRef } from 'react';
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
import { Plus, Edit, Users, Stethoscope, Search, Download, Upload, Loader2 } from 'lucide-react';
import { 
  generateDoctorTemplate, 
  parseExcelFile, 
  validateDoctorCode,
  analyzeDoctorImport,
  type ImportResults
} from '@/lib/excelImportUtils';

interface Doctor {
  id: string;
  doctor_code: string;
  specialization: string;
  is_active: boolean;
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
  const [formData, setFormData] = useState({
    full_name: '',
    doctor_code: '',
    specialization: '',
    is_active: true,
    email: '',
    password: '',
    bank_account_number: '',
    account_holder_name: '',
    bank_name: '',
    branch_name: '',
    ifsc_code: ''
  });
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [showImportResults, setShowImportResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

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
            doctor_code,
            specialization,
            is_active,
            bank_account_number,
            account_holder_name,
            bank_name,
            branch_name,
            ifsc_code,
            profiles:profile_id (
              id,
              full_name
            )
          `)
          .order('created_at', { ascending: false });

      if (error) throw error;
      setDoctors(data || []);
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

        // Update existing doctor and profile
        const { error: updateDoctorError } = await supabase
          .from('doctors')
          .update({
            doctor_code: formData.doctor_code,
            specialization: formData.specialization,
            is_active: formData.is_active,
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

        // Update profile name if changed
        if (editingDoctor.profiles?.id) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: formData.full_name
            })
            .eq('id', editingDoctor.profiles.id);

          if (profileError) {
            console.error('Profile update error:', profileError);
            throw profileError;
          }
        }

        // Update auth user email/password if provided
        if (formData.email.trim() || formData.password.trim()) {
          // Get the auth user ID from the profile
          const { data: authProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('id', editingDoctor.profiles?.id)
            .single();

          if (authProfile?.user_id) {
            const { error: credUpdateError } = await supabase.functions.invoke('update-user-credentials', {
              body: {
                userId: authProfile.user_id,
                email: formData.email.trim(),
                password: formData.password.trim()
              }
            });

            if (credUpdateError) {
              console.error('Failed to update credentials:', credUpdateError);
              // Don't throw error - continue with other updates
            }
          }
        }

        toast({
          title: "Success",
          description: "Doctor updated successfully"
        });
      } else {
        // Create new doctor
        if (!formData.email.trim()) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Email is required for new doctors"
          });
          return;
        }

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

        // Create auth user via edge function
        const { data: result, error: createUserError } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: formData.password,
            userData: {
              full_name: formData.full_name,
              role: 'doctor'
            }
          }
        });

        if (createUserError || !result?.success) {
          throw new Error(result?.error || createUserError?.message || 'Failed to create user');
        }

        // The edge function already creates the profile, so get it instead of creating
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', result.user.id)
          .single();

        if (profileError) throw profileError;

        // Create doctor record
        const { error: createDoctorError } = await supabase
          .from('doctors')
          .insert({
            profile_id: profileData.id,
            doctor_code: formData.doctor_code,
            specialization: formData.specialization,
            is_active: formData.is_active,
            bank_account_number: formData.bank_account_number,
            account_holder_name: formData.account_holder_name,
            bank_name: formData.bank_name,
            branch_name: formData.branch_name,
            ifsc_code: formData.ifsc_code
          });

        if (createDoctorError) throw createDoctorError;

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
      bank_account_number: '',
      account_holder_name: '',
      bank_name: '',
      branch_name: '',
      ifsc_code: ''
    });
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      full_name: doctor.profiles?.full_name || '',
      doctor_code: doctor.doctor_code,
      specialization: doctor.specialization,
      is_active: doctor.is_active,
      email: '', // Don't pre-fill for security
      password: '', // Don't pre-fill for security
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
      const { data: existingDoctors } = await supabase
        .from('doctors')
        .select(`
          id,
          doctor_code,
          specialization,
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
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;
        
        try {
          if (!row.doctor_code || !row.full_name || !row.specialization) {
            results.errors.push({
              row: rowNumber,
              message: 'Missing required fields (doctor_code, full_name, or specialization)'
            });
            continue;
          }
          
          if (!validateDoctorCode(row.doctor_code)) {
            results.errors.push({
              row: rowNumber,
              message: `Invalid doctor code format: ${row.doctor_code}`
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
                specialization: row.specialization,
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
                  }
                });
              }
            }
            
            results.updated++;
          } else {
            if (!row.email || !row.password) {
              results.errors.push({
                row: rowNumber,
                message: 'Email and password required for new doctors'
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
                }
              }
            });
            
            if (authError || !authResult?.success) {
              throw new Error(authResult?.error || 'Failed to create user');
            }
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', authResult.user.id)
              .single();
            
            const { error: doctorError } = await supabase
              .from('doctors')
              .insert({
                profile_id: profile.id,
                doctor_code: row.doctor_code,
                specialization: row.specialization,
                is_active: true,
                bank_account_number: row.bank_account_number || null,
                account_holder_name: row.account_holder_name || null,
                bank_name: row.bank_name || null,
                branch_name: row.branch_name || null,
                ifsc_code: row.ifsc_code || null
              });
            
            if (doctorError) throw doctorError;
            
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
                </DialogTitle>
                <DialogDescription>
                  {editingDoctor ? 'Update doctor information and settings.' : 'Create a new doctor account with login credentials.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Doctor Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Dr. John Doe"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="doctor_code">Doctor Code</Label>
                  <Input
                    id="doctor_code"
                    value={formData.doctor_code}
                    onChange={(e) => setFormData({ ...formData, doctor_code: e.target.value })}
                    placeholder="DOC001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="Cardiology"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email {!editingDoctor && '*'}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                    required={!editingDoctor}
                  />
                  {editingDoctor && (
                    <p className="text-xs text-muted-foreground">
                      Update email address if needed
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password {!editingDoctor && '*'}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingDoctor ? "Leave blank to keep current password" : "Minimum 6 characters"}
                    required={!editingDoctor}
                  />
                  {editingDoctor && (
                    <p className="text-xs text-muted-foreground">
                      Leave blank to keep current password
                    </p>
                  )}
                </div>
                
                {/* Bank Details Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-medium text-foreground">Bank Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="account_holder_name">Account Holder Name</Label>
                    <Input
                      id="account_holder_name"
                      value={formData.account_holder_name}
                      onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                      placeholder="Dr. John Doe"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bank_account_number">Bank Account Number</Label>
                    <Input
                      id="bank_account_number"
                      value={formData.bank_account_number}
                      onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                      placeholder="1234567890"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="State Bank of India"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="branch_name">Branch Name</Label>
                    <Input
                      id="branch_name"
                      value={formData.branch_name}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      placeholder="Main Branch"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ifsc_code">IFSC Code</Label>
                    <Input
                      id="ifsc_code"
                      value={formData.ifsc_code}
                      onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                      placeholder="SBIN0000123"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="is_active">Status</Label>
                  <Select 
                    value={formData.is_active.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, is_active: value === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (editingDoctor ? 'Updating...' : 'Creating...') : (editingDoctor ? 'Update' : 'Create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>

    {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by doctor name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors
          .filter((doctor) =>
            doctor.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((doctor) => (
          <Card key={doctor.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Stethoscope className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{doctor.profiles?.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{doctor.doctor_code}</p>
                  </div>
                </div>
                <Badge variant={doctor.is_active ? "default" : "secondary"}>
                  {doctor.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Specialization:</span>
                  <span className="text-sm font-medium">{doctor.specialization}</span>
                </div>
              </div>
              
              {(userRole === 'admin' || userRole === 'manager') && (
                <div className="flex space-x-2 mt-4">
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
              )}
            </CardContent>
          </Card>
        ))}
       </div>

       {doctors.length === 0 && (
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-12">
             <Users className="h-12 w-12 text-muted-foreground mb-4" />
             <h3 className="text-lg font-medium mb-2">No doctors found</h3>
             <p className="text-muted-foreground text-center mb-4">
               {(userRole === 'admin' || userRole === 'manager')
                 ? "Get started by adding your first doctor to the system."
                 : "No doctors are currently registered in the system."
               }
             </p>
           </CardContent>
          </Card>
        )}

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