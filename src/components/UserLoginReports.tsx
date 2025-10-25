import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReportGeneration from '@/components/ReportGeneration';
import { 
  Users, 
  Clock, 
  Shield, 
  Activity,
  Calendar,
  Filter,
  LogIn,
  LogOut,
  UserCheck
} from 'lucide-react';
import { formatDateTimeIST } from '@/lib/dateUtils';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface LoginSession {
  id: string;
  user_id: string;
  user_type: string;
  original_id: string;
  session_token: string;
  username: string;
  full_name: string;
  role: string; 
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  is_active: boolean;
  idle_timeout_seconds: number;
  timeout_warnings_count: number;
  warning_shown_at?: string;
}

const UserLoginReports = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'all'>(20);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    userType: 'all',
    role: 'all',
    status: 'all',
    search: ''
  });

  // Redirect if not admin
  useEffect(() => {
    if (userRole && userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only administrators can view login reports"
      });
      return;
    }
  }, [userRole, toast]);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchLoginSessions();
    }
  }, [userRole, filters]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const fetchLoginSessions = async () => {
    if (userRole !== 'admin') return;

    try {
      let query = supabase
        .from('user_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filters
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      // Apply user type filter
      if (filters.userType !== 'all') {
        query = query.eq('user_type', filters.userType);
      }

      // Apply role filter
      if (filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }

      // Apply status filter
      if (filters.status !== 'all') {
        if (filters.status === 'active') {
          query = query.eq('is_active', true);
        } else if (filters.status === 'expired') {
          query = query.eq('is_active', false);
        }
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;
      setSessions((data as LoginSession[]) || []);
    } catch (error) {
      console.error('Error fetching login sessions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch login sessions"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (session: LoginSession) => {
    if (!session.is_active) return 'secondary';
    
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    const lastActivity = new Date(session.last_activity_at);
    const timeSinceActivity = (now.getTime() - lastActivity.getTime()) / 1000;
    
    if (expiresAt < now) return 'destructive';
    if (timeSinceActivity > session.idle_timeout_seconds) return 'destructive';
    return 'default';
  };

  const getStatusText = (session: LoginSession) => {
    if (!session.is_active) return 'Logged Out';
    
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    const lastActivity = new Date(session.last_activity_at);
    const timeSinceActivity = (now.getTime() - lastActivity.getTime()) / 1000;
    
    if (expiresAt < now) return 'Expired';
    if (timeSinceActivity > session.idle_timeout_seconds) return 'Idle Timeout';
    return 'Active';
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'staff': return <Users className="h-4 w-4" />;
      case 'doctor': return <UserCheck className="h-4 w-4" />;
      case 'supabase_auth': return <Shield className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'secondary';
      case 'doctor': return 'default';
      default: return 'outline';
    }
  };

  const filteredSessions = sessions.filter(session => {
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesName = session.full_name?.toLowerCase().includes(searchTerm);
      const matchesUsername = session.username?.toLowerCase().includes(searchTerm);
      if (!matchesName && !matchesUsername) {
        return false;
      }
    }
    return true;
  });

  // Calculate pagination
  const indexOfLastRecord = recordsPerPage === 'all' 
    ? filteredSessions.length 
    : currentPage * recordsPerPage;
  const indexOfFirstRecord = recordsPerPage === 'all' 
    ? 0 
    : indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredSessions.slice(indexOfFirstRecord, indexOfLastRecord);

  if (userRole !== 'admin') {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              Only administrators can view login reports.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">User Login Reports</h1>
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
          <h1 className="text-3xl font-bold text-foreground">User Login Reports</h1>
          <p className="text-muted-foreground">
            Monitor user login activity and session management
          </p>
        </div>
        
        <ReportGeneration
          title="User Login Reports"
          data={filteredSessions}
          columns={[
            { key: 'username', label: 'Username' },
            { key: 'full_name', label: 'Full Name' },
            { key: 'role', label: 'Role', format: (value: string) => value.charAt(0).toUpperCase() + value.slice(1) },
            { key: 'user_type', label: 'User Type', format: (value: string) => value.replace('_', ' ').charAt(0).toUpperCase() + value.replace('_', ' ').slice(1) },
            { key: 'created_at', label: 'Login Time', format: (value: string) => formatDateTimeIST(value) + ':' + new Date(value).getSeconds().toString().padStart(2, '0') },
            { key: 'last_activity_at', label: 'Last Activity', format: (value: string) => formatDateTimeIST(value) + ':' + new Date(value).getSeconds().toString().padStart(2, '0') },
            { key: 'expires_at', label: 'Session Expires', format: (value: string) => formatDateTimeIST(value) + ':' + new Date(value).getSeconds().toString().padStart(2, '0') },
            { key: 'idle_timeout_seconds', label: 'Timeout (sec)' },
            { key: 'timeout_warnings_count', label: 'Warnings' },
            { key: 'is_active', label: 'Status', format: (value: boolean) => value ? 'Active' : 'Inactive' },
            { key: 'session_token', label: 'Session ID', format: (value: string) => value.substring(0, 16) + '...' }
          ]}
          filename="user_login_reports"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <LogIn className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold">{sessions.filter(s => s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <LogOut className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Logged Out</p>
                <p className="text-2xl font-bold">{sessions.filter(s => !s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">With Timeouts</p>
                <p className="text-2xl font-bold">{sessions.filter(s => s.timeout_warnings_count > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Name</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search by name or username..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>User Type</Label>
              <Select value={filters.userType} onValueChange={(value) => setFilters({ ...filters, userType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="supabase_auth">Supabase Auth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={filters.role} onValueChange={(value) => setFilters({ ...filters, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired/Logged Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getUserTypeIcon(session.user_type)}
                    <div>
                      <p className="font-medium">{session.full_name}</p>
                      <p className="text-sm text-muted-foreground">@{session.username}</p>
                    </div>
                  </div>
                  
                  <Badge variant={getRoleColor(session.role)}>
                    {session.role.charAt(0).toUpperCase() + session.role.slice(1)}
                  </Badge>
                  
                  <Badge variant={getStatusColor(session)}>
                    {getStatusText(session)}
                  </Badge>
                </div>
                
                <div className="text-right text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">Login Time</p>
                      <p>{formatDateTimeIST(session.created_at).replace(',', '')}</p>
                    </div>
                    <div>
                      <p className="font-medium">Last Activity</p>
                      <p>{formatDateTimeIST(session.last_activity_at).replace(',', '')}</p>
                    </div>
                    <div>
                      <p className="font-medium">Timeout</p>
                      <p>{Math.floor(session.idle_timeout_seconds / 60)}m {session.idle_timeout_seconds % 60}s</p>
                    </div>
                    {session.timeout_warnings_count > 0 && (
                      <div>
                        <p className="font-medium">Warnings</p>
                        <p className="text-yellow-600">{session.timeout_warnings_count}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Controls Bottom */}
      {filteredSessions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <PaginationControls
              totalRecords={filteredSessions.length}
              recordsPerPage={recordsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onRecordsPerPageChange={setRecordsPerPage}
            />
          </CardContent>
        </Card>
      )}

      {filteredSessions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Login Sessions Found</h3>
            <p className="text-muted-foreground">
              No login sessions match your current filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserLoginReports;