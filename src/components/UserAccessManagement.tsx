import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Search, Settings2, Eye, History, UserCheck } from 'lucide-react';
import { AccessConfigDialog } from './AccessConfigDialog';
import { AdminAccessManagement } from './AdminAccessManagement';
import { ScrollArea } from '@/components/ui/scroll-area';
import { hasFullAccess } from '@/lib/accessLevels';

interface StaffMember {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
  department: string;
  is_active: boolean;
  screen_access_count: number;
  approval_permission_count: number;
}

interface AccessHistory {
  id: string;
  staff_id: string;
  changed_by: string;
  action_type: string;
  permission_type: string;
  old_value: any;
  new_value: any;
  notes: string;
  created_at: string;
  staff_name: string;
  changed_by_name: string;
}

export const UserAccessManagement = () => {
  const { user, userDesignation } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [accessHistory, setAccessHistory] = useState<AccessHistory[]>([]);

  useEffect(() => {
    fetchStaffList();
    fetchAccessHistory();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = staffList.filter(
        (staff) =>
          staff.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          staff.staff_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          staff.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStaff(filtered);
    } else {
      setFilteredStaff(staffList);
    }
  }, [searchTerm, staffList]);

  const fetchStaffList = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_manageable_staff', {
        _requesting_user_id: user.id
      });

      if (error) throw error;

      setStaffList(data || []);
      setFilteredStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff list:', error);
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('user_access_history')
        .select(`
          *,
          staff:staff_id(full_name),
          changed_by_staff:changed_by(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedHistory = data?.map((item: any) => ({
        ...item,
        staff_name: item.staff?.full_name || 'Unknown',
        changed_by_name: item.changed_by_staff?.full_name || 'System'
      })) || [];

      setAccessHistory(formattedHistory);
    } catch (error) {
      console.error('Error fetching access history:', error);
    }
  };

  const handleConfigureAccess = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedStaff(null);
    fetchStaffList();
    fetchAccessHistory();
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-destructive',
      manager: 'bg-primary',
      nurse: 'bg-blue-500',
      doctor: 'bg-green-500',
      technician: 'bg-orange-500',
      receptionist: 'bg-purple-500',
      pharmacist: 'bg-pink-500',
      cleaner: 'bg-gray-500',
      security: 'bg-yellow-500'
    };
    return colors[role.toLowerCase()] || 'bg-secondary';
  };

  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      grant_screen: 'Screen Access Granted',
      revoke_screen: 'Screen Access Revoked',
      grant_approval: 'Approval Permission Granted',
      revoke_approval: 'Approval Permission Revoked'
    };
    return labels[actionType] || actionType;
  };

  const formatPermissionType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Access Management</h2>
          <p className="text-muted-foreground">
            Configure screen access and approval permissions for staff members
          </p>
        </div>
        <Shield className="h-8 w-8 text-primary" />
      </div>

      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList className={`grid w-full ${userDesignation === 'super_admin' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Staff Access
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Access History
          </TabsTrigger>
          {userDesignation === 'super_admin' && (
            <TabsTrigger value="admin-access" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Access Control
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Staff List
              </CardTitle>
              <CardDescription>
                Select a staff member to configure their access permissions
              </CardDescription>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading staff...</div>
              ) : filteredStaff.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No staff found matching your search' : 'No staff members available'}
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-center">Screen Access</TableHead>
                        <TableHead className="text-center">Approvals</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="font-mono font-medium">{staff.staff_code}</TableCell>
                          <TableCell className="font-medium">{staff.full_name}</TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(staff.role)}>
                              {staff.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{staff.department || '-'}</TableCell>
                          {hasFullAccess(staff.role) ? (
                            <TableCell colSpan={2} className="text-center">
                              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                                Full access — no configuration needed
                              </Badge>
                            </TableCell>
                          ) : (
                            <>
                              <TableCell className="text-center">
                                <Badge variant="outline">
                                  <Eye className="h-3 w-3 mr-1" />
                                  {staff.screen_access_count}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">
                                  <Shield className="h-3 w-3 mr-1" />
                                  {staff.approval_permission_count}
                                </Badge>
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleConfigureAccess(staff)}
                              className="gap-2"
                            >
                              <Settings2 className="h-4 w-4" />
                              Configure
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Access Change History
              </CardTitle>
              <CardDescription>
                Recent changes to user access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accessHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No access history available
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Permission</TableHead>
                        <TableHead>Changed By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">
                            {new Date(item.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">{item.staff_name}</TableCell>
                          <TableCell>
                            <Badge variant={item.action_type.includes('grant') ? 'default' : 'destructive'}>
                              {getActionTypeLabel(item.action_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatPermissionType(item.permission_type)}</TableCell>
                          <TableCell>{item.changed_by_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {userDesignation === 'super_admin' && (
          <TabsContent value="admin-access" className="space-y-4">
            <AdminAccessManagement />
          </TabsContent>
        )}
      </Tabs>

      {selectedStaff && (
        <AccessConfigDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          staffMember={selectedStaff}
        />
      )}
    </div>
  );
};
