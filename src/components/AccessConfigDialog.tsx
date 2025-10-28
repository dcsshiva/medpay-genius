import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Eye, Edit, Shield, MonitorPlay, Save } from 'lucide-react';

interface StaffMember {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
  department: string;
}

interface ScreenAccess {
  screen_module: string;
  can_view: boolean;
  can_edit: boolean;
}

interface ApprovalPermission {
  approval_type: string;
  can_approve: boolean;
}

interface AccessConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staffMember: StaffMember;
}

const SCREEN_MODULES = [
  // Main
  { value: 'dashboard', label: 'Dashboard', category: 'Main' },
  { value: 'user_guide', label: 'User Guide', category: 'Help' },
  
  // Management
  { value: 'visit_management', label: 'Visit Management', category: 'Management' },
  { value: 'payment_management', label: 'Payment Management', category: 'Management' },
  { value: 'doctor_management', label: 'Doctor Management', category: 'Management' },
  { value: 'staff_management', label: 'Staff Management', category: 'Management', superAdminOnly: true },
  { value: 'task_management', label: 'Task Management', category: 'Management' },
  { value: 'staff_appraisal', label: 'Staff Appraisal', category: 'Management' },
  { value: 'appraisals', label: 'Staff Appraisals Management', category: 'Management' },
  { value: 'complaint_management', label: 'Complaint Management', category: 'Management' },
  { value: 'leave_permission', label: 'Leave & Permission', category: 'Management' },
  { value: 'leave_approvals', label: 'Leave Approvals', category: 'Management' },
  
  // Payments
  { value: 'payment_hub', label: 'Payment Hub', category: 'Payments' },
  { value: 'cash_payments', label: 'Cash Payments', category: 'Payments' },
  { value: 'insurance_payments', label: 'Insurance Payments', category: 'Payments' },
  { value: 'quick_payment', label: 'Quick Payment', category: 'Payments' },
  
  // Bank Advice
  { value: 'bank_advice_generation', label: 'Bank Advice (Legacy)', category: 'Bank Advice' },
  { value: 'bank_advice_generation_beta', label: 'Bank Advice (Beta)', category: 'Bank Advice' },
  { value: 'bank_advice_history', label: 'Bank Advice History', category: 'Bank Advice' },
  { value: 'bank_advice_records', label: 'Bank Advice Records', category: 'Bank Advice' },
  { value: 'bank_advice_payment_report', label: 'BA Payment Report', category: 'Bank Advice' },
  { value: 'quick_payment_bank_advice_report', label: 'Quick Payment BA Report', category: 'Bank Advice' },
  
  // Reports
  { value: 'report_generation', label: 'Report Generation', category: 'Reports' },
  { value: 'bank_advice_reports', label: 'Bank Advice Reports', category: 'Reports' },
  { value: 'tds_reports', label: 'TDS Reports', category: 'Reports' },
  { value: 'user_login_reports', label: 'User Login Reports', category: 'Reports' },
  { value: 'login_reports', label: 'Login Reports', category: 'Reports' },
  
  // Settings
  { value: 'master_data', label: 'Master Data', category: 'Settings' },
  { value: 'settings', label: 'Settings', category: 'Settings', superAdminOnly: true },
  { value: 'version', label: 'Version Management', category: 'Settings', superAdminOnly: true },
  { value: 'website_settings', label: 'Website Settings', category: 'Settings' },
  
  // Communication
  { value: 'team_chat', label: 'Team Chat', category: 'Communication' },
];

const APPROVAL_TYPES = [
  { value: 'cash_payment_manager', label: 'Cash Payment (Manager Level)', level: 'manager' },
  { value: 'cash_payment_admin', label: 'Cash Payment (Admin Level)', level: 'admin' },
  { value: 'insurance_payment_manager', label: 'Insurance Payment (Manager Level)', level: 'manager' },
  { value: 'insurance_payment_admin', label: 'Insurance Payment (Admin Level)', level: 'admin' },
  { value: 'quick_payment_approval', label: 'Quick Payment Approval', level: 'manager' },
  { value: 'payment_rejection', label: 'Payment Rejection', level: 'manager' },
  { value: 'bank_advice_generation', label: 'Bank Advice Generation', level: 'admin' },
  { value: 'staff_appraisal_approval', label: 'Staff Appraisal Approval', level: 'manager' },
  { value: 'leave_permission_approval', label: 'Leave/Permission Approval', level: 'manager' },
  { value: 'complaint_resolution', label: 'Complaint Resolution', level: 'manager' },
  { value: 'master_data_changes', label: 'Master Data Changes', level: 'admin' },
];

export const AccessConfigDialog = ({ isOpen, onClose, staffMember }: AccessConfigDialogProps) => {
  const { user, userRole, userDesignation } = useAuth();
  const [screenAccess, setScreenAccess] = useState<Record<string, ScreenAccess>>({});
  const [approvalPermissions, setApprovalPermissions] = useState<Record<string, ApprovalPermission>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && staffMember) {
      fetchCurrentPermissions();
    }
  }, [isOpen, staffMember]);

  const fetchCurrentPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_permissions', {
        _staff_id: staffMember.id
      });

      if (error) throw error;

      const permissions = data as { screen_access: any[]; approval_permissions: any[] };

      // Convert to record format
      const screenAccessMap: Record<string, ScreenAccess> = {};
      permissions.screen_access?.forEach((access: any) => {
        screenAccessMap[access.screen_module] = {
          screen_module: access.screen_module,
          can_view: access.can_view,
          can_edit: access.can_edit
        };
      });

      const approvalPermissionsMap: Record<string, ApprovalPermission> = {};
      permissions.approval_permissions?.forEach((perm: any) => {
        approvalPermissionsMap[perm.approval_type] = {
          approval_type: perm.approval_type,
          can_approve: perm.can_approve
        };
      });

      setScreenAccess(screenAccessMap);
      setApprovalPermissions(approvalPermissionsMap);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load current permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleScreenAccessChange = (screenModule: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setScreenAccess((prev) => ({
      ...prev,
      [screenModule]: {
        screen_module: screenModule,
        can_view: field === 'can_view' ? value : (prev[screenModule]?.can_view || false),
        can_edit: field === 'can_edit' ? value : (prev[screenModule]?.can_edit || false)
      }
    }));

    // If unchecking view, also uncheck edit
    if (field === 'can_view' && !value) {
      setScreenAccess((prev) => ({
        ...prev,
        [screenModule]: {
          screen_module: screenModule,
          can_view: false,
          can_edit: false
        }
      }));
    }
  };

  const handleApprovalPermissionChange = (approvalType: string, value: boolean) => {
    setApprovalPermissions((prev) => ({
      ...prev,
      [approvalType]: {
        approval_type: approvalType,
        can_approve: value
      }
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Save screen access
      for (const [screenModule, access] of Object.entries(screenAccess)) {
        if (access.can_view || access.can_edit) {
          const { error } = await supabase.rpc('grant_screen_access', {
            _staff_id: staffMember.id,
            _screen_module: screenModule as any,
            _can_view: access.can_view,
            _can_edit: access.can_edit,
            _granted_by_user_id: user.id,
            _notes: notes
          });

          if (error) throw error;
        }
      }

      // Save approval permissions
      for (const [approvalType, permission] of Object.entries(approvalPermissions)) {
        if (permission.can_approve) {
          const { error } = await supabase.rpc('grant_approval_permission', {
            _staff_id: staffMember.id,
            _approval_type: approvalType as any,
            _can_approve: permission.can_approve,
            _granted_by_user_id: user.id,
            _notes: notes
          });

          if (error) throw error;
        }
      }

      toast.success(`Access permissions updated for ${staffMember.full_name}`);
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdminOnly = (screenModule: string) => {
    const screen = SCREEN_MODULES.find(s => s.value === screenModule);
    return screen?.superAdminOnly && userDesignation !== 'super_admin';
  };

  const isAdminLevelApproval = (approvalType: string) => {
    const approval = APPROVAL_TYPES.find(a => a.value === approvalType);
    return approval?.level === 'admin' && userDesignation !== 'super_admin' && userDesignation !== 'admin';
  };

  const groupedScreens = SCREEN_MODULES.reduce((acc, screen) => {
    if (!acc[screen.category]) {
      acc[screen.category] = [];
    }
    acc[screen.category].push(screen);
    return acc;
  }, {} as Record<string, typeof SCREEN_MODULES>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Configure Access for {staffMember.full_name}
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{staffMember.staff_code}</Badge>
              <Badge variant="outline">{staffMember.role}</Badge>
              {staffMember.department && <Badge variant="secondary">{staffMember.department}</Badge>}
            </div>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading permissions...</div>
        ) : (
          <Tabs defaultValue="screens" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="screens" className="flex items-center gap-2">
                <MonitorPlay className="h-4 w-4" />
                Screen Access
              </TabsTrigger>
              <TabsTrigger value="approvals" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Approval Permissions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="screens" className="space-y-4">
              <ScrollArea className="h-[300px] pr-4">
                {Object.entries(groupedScreens).map(([category, screens]) => (
                  <div key={category} className="mb-6">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                      {category}
                    </h3>
                    <div className="space-y-3 ml-2">
                      {screens.map((screen) => {
                        const disabled = isSuperAdminOnly(screen.value);
                        return (
                          <div
                            key={screen.value}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              disabled ? 'opacity-50 bg-muted/50' : 'bg-card'
                            }`}
                          >
                            <Label className="font-medium flex-1">{screen.label}</Label>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`${screen.value}-view`}
                                  checked={screenAccess[screen.value]?.can_view || false}
                                  onCheckedChange={(checked) =>
                                    handleScreenAccessChange(screen.value, 'can_view', checked as boolean)
                                  }
                                  disabled={disabled}
                                />
                                <Label htmlFor={`${screen.value}-view`} className="flex items-center gap-1 cursor-pointer">
                                  <Eye className="h-3 w-3" />
                                  View
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`${screen.value}-edit`}
                                  checked={screenAccess[screen.value]?.can_edit || false}
                                  onCheckedChange={(checked) =>
                                    handleScreenAccessChange(screen.value, 'can_edit', checked as boolean)
                                  }
                                  disabled={disabled || !screenAccess[screen.value]?.can_view}
                                />
                                <Label htmlFor={`${screen.value}-edit`} className="flex items-center gap-1 cursor-pointer">
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </Label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="approvals" className="space-y-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {APPROVAL_TYPES.map((approval) => {
                    const disabled = isAdminLevelApproval(approval.value);
                    return (
                      <div
                        key={approval.value}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          disabled ? 'opacity-50 bg-muted/50' : 'bg-card'
                        }`}
                      >
                        <div className="flex-1">
                          <Label className="font-medium">{approval.label}</Label>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {approval.level}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`approval-${approval.value}`}
                            checked={approvalPermissions[approval.value]?.can_approve || false}
                            onCheckedChange={(checked) =>
                              handleApprovalPermissionChange(approval.value, checked as boolean)
                            }
                            disabled={disabled}
                          />
                          <Label htmlFor={`approval-${approval.value}`} className="cursor-pointer">
                            Can Approve
                          </Label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about these permission changes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
