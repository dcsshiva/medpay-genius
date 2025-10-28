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
import { Eye, Edit, Shield, Save } from 'lucide-react';

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
}

interface ScreenAccess {
  screen_module: string;
  can_view: boolean;
  can_edit: boolean;
}

interface AdminAccessConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  adminUser: AdminUser;
}

const SCREEN_MODULES = [
  // Main
  { value: 'dashboard', label: 'Dashboard', category: 'Main' },
  { value: 'user_guide', label: 'User Guide', category: 'Help' },
  
  // Management
  { value: 'visit_management', label: 'Visit Management', category: 'Management' },
  { value: 'payment_management', label: 'Payment Management', category: 'Management' },
  { value: 'doctor_management', label: 'Doctor Management', category: 'Management' },
  { value: 'staff_management', label: 'Staff Management', category: 'Management' },
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
  { value: 'settings', label: 'Settings', category: 'Settings' },
  { value: 'version', label: 'Version Management', category: 'Settings' },
  { value: 'website_settings', label: 'Website Settings', category: 'Settings' },
  
  // Communication
  { value: 'team_chat', label: 'Team Chat', category: 'Communication' },
];

export const AdminAccessConfigDialog = ({ isOpen, onClose, adminUser }: AdminAccessConfigDialogProps) => {
  const { user } = useAuth();
  const [screenAccess, setScreenAccess] = useState<Record<string, ScreenAccess>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && adminUser) {
      fetchCurrentPermissions();
    }
  }, [isOpen, adminUser]);

  const fetchCurrentPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_admin_permissions' as any, {
        _admin_user_id: adminUser.user_id
      });

      if (error) throw error;

      if (data && typeof data === 'object' && 'screen_access' in data) {
        const accessMap: Record<string, ScreenAccess> = {};
        (data.screen_access as any[]).forEach((access: any) => {
          accessMap[access.screen_module] = {
            screen_module: access.screen_module,
            can_view: access.can_view,
            can_edit: access.can_edit
          };
        });
        setScreenAccess(accessMap);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load current permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleScreenAccessChange = (screenModule: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setScreenAccess((prev) => {
      const current = prev[screenModule] || { screen_module: screenModule, can_view: false, can_edit: false };
      
      // If unchecking view, also uncheck edit
      if (field === 'can_view' && !value) {
        return {
          ...prev,
          [screenModule]: { ...current, can_view: false, can_edit: false }
        };
      }
      
      // If checking edit, also check view
      if (field === 'can_edit' && value) {
        return {
          ...prev,
          [screenModule]: { ...current, can_view: true, can_edit: true }
        };
      }
      
      return {
        ...prev,
        [screenModule]: { ...current, [field]: value }
      };
    });
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Save screen access
      for (const [screenModule, access] of Object.entries(screenAccess)) {
        if (access.can_view || access.can_edit) {
          const { error } = await supabase.rpc('grant_admin_screen_access' as any, {
            _admin_user_id: adminUser.user_id,
            _screen_module: screenModule as any,
            _can_view: access.can_view,
            _can_edit: access.can_edit,
            _granted_by_user_id: user.id,
            _notes: notes
          });

          if (error) throw error;
        }
      }

      toast.success('Admin permissions updated successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error(error.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Configure Admin Access
          </DialogTitle>
          <DialogDescription>
            Configure screen access permissions for {adminUser.full_name} ({adminUser.email})
            <Badge variant="outline" className="ml-2">Admin</Badge>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading permissions...</div>
        ) : (
          <>
            <Tabs defaultValue="screens" className="w-full">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="screens" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Screen Access
                </TabsTrigger>
              </TabsList>

              <TabsContent value="screens" className="space-y-4">
                <ScrollArea className="h-[400px] pr-4">
                  {Object.entries(groupedScreens).map(([category, screens]) => (
                    <div key={category} className="mb-6">
                      <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        {category}
                      </h3>
                      <div className="space-y-3 ml-2">
                        {screens.map((screen) => (
                          <div
                            key={screen.value}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card"
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
                                  disabled={!screenAccess[screen.value]?.can_view}
                                />
                                <Label htmlFor={`${screen.value}-edit`} className="flex items-center gap-1 cursor-pointer">
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </Label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about these access changes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </>
        )}

        <DialogFooter>
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
