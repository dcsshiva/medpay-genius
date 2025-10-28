import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AdminAccessConfigDialog } from './AdminAccessConfigDialog';
import { Search, Shield, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
  screen_access_count: number;
}

export const AdminAccessManagement = () => {
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchAdminList();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAdmins(adminList);
    } else {
      const lowercased = searchTerm.toLowerCase();
      setFilteredAdmins(
        adminList.filter(
          (admin) =>
            admin.full_name.toLowerCase().includes(lowercased) ||
            admin.email.toLowerCase().includes(lowercased)
        )
      );
    }
  }, [searchTerm, adminList]);

  const fetchAdminList = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_admin_users' as any);

      if (error) throw error;

      setAdminList((data as any) || []);
      setFilteredAdmins((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching admin list:', error);
      toast.error('Failed to load admin list');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureAccess = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedAdmin(null);
    fetchAdminList(); // Refresh the list
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Access Control
          </CardTitle>
          <CardDescription>
            Configure screen access permissions for admin users. Only super admins can manage admin access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading admin users...</div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No admins found matching your search.' : 'No admin users found.'}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Screen Access Count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin) => (
                    <TableRow key={admin.user_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {admin.full_name}
                          <Badge variant="outline" className="ml-2">Admin</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {admin.screen_access_count} screens
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConfigureAccess(admin)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAdmin && (
        <AdminAccessConfigDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          adminUser={selectedAdmin}
        />
      )}
    </div>
  );
};
