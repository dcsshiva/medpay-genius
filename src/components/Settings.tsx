import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { Settings as SettingsIcon, Shield, Eye, Users, Lock } from 'lucide-react';

const Settings = () => {
  const { userRole } = useAuth();

  // Only admins can access settings
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
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
    </div>
  );
};

export default Settings;