import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { Settings as SettingsIcon, Shield, Eye, Users, Lock, Trash2, AlertTriangle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserAccessManagement } from './UserAccessManagement';
import { AuthEmailSync } from './AuthEmailSync';

const Settings = () => {
  const { userRole, userDesignation, signOut } = useAuth();
  const [isEraseDialogOpen, setIsEraseDialogOpen] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [password, setPassword] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Security constants
  const ERASE_PASSWORD = '9629945305';
  const MAX_FAILED_ATTEMPTS = 3;

  const handleEraseTransactions = async () => {
    // First check password
    if (password !== ERASE_PASSWORD) {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
      toast.error(`Incorrect password. Attempt ${newFailedAttempts} of ${MAX_FAILED_ATTEMPTS}`);
      
      // Logout after 3 failed attempts
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        toast.error('Maximum attempts exceeded. Logging out for security.');
        setTimeout(async () => {
          await signOut();
        }, 1500);
        return;
      }
      
      return;
    }

    // Then check confirmation text
    if (confirmationText !== 'DELETE ALL') {
      toast.error('Please type "DELETE ALL" to confirm');
      return;
    }

    setIsErasing(true);
    try {
      const { data, error } = await supabase.rpc('erase_all_transactions');
      
      if (error) throw error;

      const result = data as { visits_deleted: number; payments_deleted: number; payment_visits_deleted: number; payment_transactions_deleted: number };

      toast.success(
        `Successfully deleted: ${result.visits_deleted} visits, ${result.payments_deleted} payments, ${result.payment_visits_deleted} payment links, ${result.payment_transactions_deleted} transactions`
      );
      
      // Reset all fields on success
      setIsEraseDialogOpen(false);
      setConfirmationText('');
      setPassword('');
      setFailedAttempts(0);
    } catch (error) {
      console.error('Error erasing transactions:', error);
      toast.error('Failed to erase transactions. Please try again.');
    } finally {
      setIsErasing(false);
    }
  };

  // Only super admins and admins can access settings (fallback to userRole when designation unavailable)
  if (!((userDesignation === 'super_admin' || userDesignation === 'admin') || (userRole === 'super_admin' || userRole === 'admin'))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              Only Super Admins and Admins can access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage system configurations and permissions</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Access Management
          </TabsTrigger>
          {userDesignation === 'super_admin' && (
            <TabsTrigger value="auth-sync" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Auth Synchronization
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="space-y-6">

      {/* Task Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Task Visibility & Access Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-medium">Admin Access</h4>
                  <p className="text-sm text-muted-foreground">Can view, create, edit, and manage all tasks</p>
                </div>
              </div>
              <Badge variant="default">Full Access</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-secondary" />
                <div>
                  <h4 className="font-medium">Manager Access</h4>
                  <p className="text-sm text-muted-foreground">Can view, create, edit, and manage all tasks</p>
                </div>
              </div>
              <Badge variant="secondary">Full Access</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <SettingsIcon className="h-5 w-5 text-accent" />
                <div>
                  <h4 className="font-medium">Staff Access (Restricted)</h4>
                  <p className="text-sm text-muted-foreground">Can only view and update tasks assigned to them</p>
                </div>
              </div>
              <Badge variant="outline">Limited Access</Badge>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Current Task Visibility Rules:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Tasks are only visible to admins, managers, and the assigned staff member</li>
              <li>• Staff members cannot see tasks assigned to other staff members</li>
              <li>• Only admins and managers can create and assign tasks</li>
              <li>• Staff members can only update the status of their assigned tasks</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* System Access Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            System Access Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-medium">Settings Page Access</h4>
                  <p className="text-sm text-muted-foreground">Only administrators can access system settings</p>
                </div>
              </div>
              <Badge variant="destructive">Admin Only</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-secondary" />
                <div>
                  <h4 className="font-medium">User Management</h4>
                  <p className="text-sm text-muted-foreground">Admin-only access to manage staff and doctors</p>
                </div>
              </div>
              <Badge variant="destructive">Admin Only</Badge>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Security Features:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Row-Level Security (RLS) enabled on all database tables</li>
              <li>• Role-based access control throughout the system</li>
              <li>• Settings page visible only to administrators</li>
              <li>• Secure authentication and session management</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Testing & Development Tools */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Testing & Development Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-medium text-destructive mb-1">Danger Zone</h4>
                <p className="text-sm text-muted-foreground">
                  These tools are for testing purposes only. Use with extreme caution.
                </p>
              </div>
            </div>

            <AlertDialog open={isEraseDialogOpen} onOpenChange={setIsEraseDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Erase All Transactions
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <div className="font-semibold text-foreground">
                      This action cannot be undone. This will permanently delete:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>All visit records</li>
                      <li>All payment records</li>
                      <li>All payment-visit links</li>
                      <li>All payment transactions</li>
                    </ul>
                    <div className="text-destructive font-medium">
                      All doctors and staff records will remain intact.
                    </div>
                    <div className="space-y-2 pt-4">
                      <Label htmlFor="password-input" className="text-foreground">
                        Enter the password:
                      </Label>
                      <Input
                        id="password-input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="font-mono"
                        autoComplete="off"
                      />
                      {failedAttempts > 0 && (
                        <p className="text-sm text-destructive">
                          Failed attempts: {failedAttempts}/{MAX_FAILED_ATTEMPTS}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="confirm-text" className="text-foreground">
                        Type <span className="font-mono font-bold">DELETE ALL</span> to confirm:
                      </Label>
                      <Input
                        id="confirm-text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder="DELETE ALL"
                        className="font-mono"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => {
                    setConfirmationText('');
                    setPassword('');
                  }}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleEraseTransactions}
                    disabled={!password || confirmationText !== 'DELETE ALL' || isErasing}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isErasing ? 'Erasing...' : 'Erase All Transactions'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="access">
          <UserAccessManagement />
        </TabsContent>

        {userRole === 'admin' && (
          <TabsContent value="auth-sync">
            <AuthEmailSync />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;