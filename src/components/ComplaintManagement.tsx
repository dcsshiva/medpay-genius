import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStaffId } from '@/lib/staffUtils';
import ReportGeneration from '@/components/ReportGeneration';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  User,
  Filter,
  Calendar,
  ClockIcon,
  FileText,
  Tag,
  Users
} from 'lucide-react';
import { formatDateIST, formatDateTimeIST, toISOStringIST } from '@/lib/dateUtils';

interface Complaint {
  id: string;
  complaint_title: string;
  complaint_description: string;
  category: 'general' | 'equipment' | 'facility' | 'workload' | 'policy' | 'safety' | 'other';
  status: 'open' | 'in_review' | 'taken' | 'in_progress' | 'solved' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  admin_response?: string;
  resolved_at?: string;
  taken_care_by?: string;
  taken_care_at?: string;
  action_notes?: string;
  created_at: string;
  submitted_to?: string;
  raised_by_staff: {
    staff_code: string;
    full_name: string;
    role: string;
  };
  resolved_by_staff?: {
    staff_code: string;
    full_name: string;
  };
  taken_care_by_staff?: {
    staff_code: string;
    full_name: string;
  };
  complaint_against_staff?: {
    staff_code: string;
    full_name: string;
    role: string;
  };
  submitted_to_staff?: {
    staff_code: string;
    full_name: string;
    role: string;
  };
}

interface StaffMember {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
}

const ComplaintManagement = () => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseDialog, setResponseDialog] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [adminResponse, setAdminResponse] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [complaintCategories, setComplaintCategories] = useState<Array<{
    id: string;
    category_code: string;
    category_name: string;
  }>>([]);
  const [formData, setFormData] = useState({
    complaint_title: '',
    complaint_description: '',
    category: '',
    priority: 'medium',
    complaint_against: '',
    incident_date: '',
    incident_time: '',
    submitted_to: ''
  });

  useEffect(() => {
    fetchComplaints();
    fetchActiveStaff();
    fetchComplaintCategories();
  }, [userRole]);

  // Real-time subscription for complaints
  useEffect(() => {
    const channel = supabase
      .channel('complaints-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'complaints'
        },
        (payload) => {
          console.log('Complaint change detected:', payload);
          fetchComplaints(); // Re-fetch to get latest data with all relations
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Real-time subscription for staff list
  useEffect(() => {
    const channel = supabase
      .channel('staff-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'staff'
        },
        (payload) => {
          console.log('Staff change detected:', payload);
          fetchActiveStaff(); // Re-fetch staff list when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Real-time subscription for complaint categories
  useEffect(() => {
    const channel = supabase
      .channel('complaint-categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaint_categories'
        },
        (payload) => {
          console.log('Complaint category change detected:', payload);
          fetchComplaintCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, staff_code, full_name, role')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setStaffList(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchComplaintCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('complaint_categories')
        .select('id, category_code, category_name')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setComplaintCategories(data || []);
    } catch (error) {
      console.error('Error fetching complaint categories:', error);
    }
  };

  const fetchComplaints = async () => {
    try {
      let query = supabase
        .from('complaints')
        .select(`
          id,
          complaint_title,
          complaint_description,
          category,
          status,
          priority,
          admin_response,
          resolved_at,
          taken_care_by,
          taken_care_at,
          action_notes,
          created_at,
          submitted_to,
          raised_by_staff:raised_by (
            staff_code,
            full_name,
            role
          ),
          resolved_by_staff:resolved_by (
            staff_code,
            full_name
          ),
          taken_care_by_staff:taken_care_by (
            staff_code,
            full_name
          ),
          complaint_against_staff:complaint_against (
            staff_code,
            full_name,
            role
          ),
          submitted_to_staff:submitted_to (
            staff_code,
            full_name,
            role
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setComplaints((data as unknown as Complaint[]) || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch complaints. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!formData.complaint_title.trim() || !formData.complaint_description.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Complaint title and description are required"
      });
      return;
    }

    if (!formData.submitted_to) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select an admin/manager to submit this complaint to"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Get current user's staff record
      const staffId = await getStaffId(user);
      if (!staffId) throw new Error('Staff record not found');

      const { error } = await supabase
        .from('complaints')
        .insert({
          complaint_title: formData.complaint_title.trim(),
          complaint_description: formData.complaint_description.trim(),
          category: formData.category as any,
          priority: formData.priority as any,
          raised_by: staffId,
          complaint_against: formData.complaint_against || null,
          incident_date: formData.incident_date || null,
          incident_time: formData.incident_time || null,
          submitted_to: formData.submitted_to || null,
          status: 'open'
        } as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Complaint submitted successfully"
      });

      setDialogOpen(false);
      resetForm();
      fetchComplaints();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit complaint"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    if (!['admin', 'manager'].includes(userRole || '')) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins and managers can respond to complaints"
      });
      return;
    }

    if (!selectedComplaint || !adminResponse.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Response is required"
      });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      const { data: currentStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('id', profile.id)
        .single();

      const { error } = await supabase
        .from('complaints')
        .update({
          status: 'resolved',
          admin_response: adminResponse.trim(),
          resolved_by: currentStaff?.id || null,
          resolved_at: toISOStringIST()
        })
        .eq('id', selectedComplaint.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Complaint resolved successfully"
      });

      setResponseDialog(false);
      setSelectedComplaint(null);
      setAdminResponse('');
      fetchComplaints();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to respond to complaint"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateComplaintStatus = async (complaintId: string, newStatus: string, actionNotes?: string) => {
    if (!['admin', 'manager'].includes(userRole || '')) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins and managers can update complaint status"
      });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!profile) throw new Error('Profile not found');

      const { data: currentStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('id', profile.id)
        .single();

      const updateData: any = { status: newStatus as any };
      
      // If marking as taken, in_progress, or solved, record who took action
      if (['taken', 'in_progress', 'solved'].includes(newStatus)) {
        updateData.taken_care_by = currentStaff?.id;
        updateData.taken_care_at = toISOStringIST();
        if (actionNotes) {
          updateData.action_notes = actionNotes;
        }
      }

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Complaint status updated to ${newStatus.replace('_', ' ')}`
      });

      fetchComplaints();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update complaint status"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      complaint_title: '',
      complaint_description: '',
      category: '',
      priority: 'medium',
      complaint_against: '',
      incident_date: '',
      incident_time: '',
      submitted_to: ''
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'default';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'solved': return 'default';
      case 'resolved': return 'default';
      case 'in_progress': return 'secondary';
      case 'taken': return 'secondary';
      case 'in_review': return 'secondary';
      case 'open': return 'outline';
      case 'closed': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'solved': return <CheckCircle className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'taken': return <User className="h-4 w-4" />;
      case 'in_review': return <Clock className="h-4 w-4" />;
      case 'open': return <AlertTriangle className="h-4 w-4" />;
      case 'closed': return <CheckCircle className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const filteredComplaints = complaints.filter(complaint => {
    const statusMatch = statusFilter === 'all' || complaint.status === statusFilter;
    const categoryMatch = categoryFilter === 'all' || complaint.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Complaint Management</h1>
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
          <h1 className="text-3xl font-bold text-foreground">Complaint Management</h1>
          <p className="text-muted-foreground">
            {userRole === 'admin' 
              ? 'Manage and respond to staff complaints'
              : 'Submit and track your complaints'
            }
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Submit Complaint
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit New Complaint</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Section: What Happened */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">What Happened</h3>
                <div className="space-y-2">
                  <Label htmlFor="complaint_title">Complaint Title *</Label>
                  <Input
                    id="complaint_title"
                    value={formData.complaint_title}
                    onChange={(e) => setFormData({ ...formData, complaint_title: e.target.value })}
                    placeholder="Brief description of the issue"
                    className="min-h-[44px]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complaint_description">Detailed Description *</Label>
                  <Textarea
                    id="complaint_description"
                    value={formData.complaint_description}
                    onChange={(e) => setFormData({ ...formData, complaint_description: e.target.value })}
                    placeholder="Provide detailed information about your complaint..."
                    rows={3}
                    required
                  />
                </div>
              </div>

              {/* Section: Who and When */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Who & When</h3>
                <div className="space-y-2">
                  <Label htmlFor="submitted_to">Submit To <span className="text-destructive">*</span></Label>
                  <Select 
                    value={formData.submitted_to || undefined} 
                    onValueChange={(value) => setFormData({ ...formData, submitted_to: value || '' })}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select admin/manager to submit to" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList
                        .filter(s => ['admin', 'manager'].includes(s.role))
                        .map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name} ({staff.staff_code}) - {staff.role}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complaint_against">Complaint Against (Optional)</Label>
                  <Select 
                    value={formData.complaint_against || undefined} 
                    onValueChange={(value) => setFormData({ ...formData, complaint_against: value || '' })}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select staff member (if applicable)" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.full_name} ({staff.staff_code}) - {staff.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="incident_date" className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Incident Date (Optional)
                    </Label>
                    <Input
                      id="incident_date"
                      type="date"
                      value={formData.incident_date}
                      onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incident_time" className="flex items-center gap-1.5">
                      <ClockIcon className="h-3.5 w-3.5" />
                      Incident Time (Optional)
                    </Label>
                    <Input
                      id="incident_time"
                      type="time"
                      value={formData.incident_time}
                      onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })}
                      className="min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Classification */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Classification</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="min-h-[44px]">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {complaintCategories.map((category) => (
                          <SelectItem key={category.id} value={category.category_code}>
                            {category.category_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger className="min-h-[44px]">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 sticky bottom-0 bg-background pb-1">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="min-w-[140px]" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Complaint'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards - Action Status Segregation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className={`border-orange-200 bg-orange-50 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'open' ? 'ring-2 ring-orange-400' : ''}`} onClick={() => setStatusFilter(prev => prev === 'open' ? 'all' : 'open')}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-700">Open</p>
                <p className="text-2xl font-bold text-orange-800">{complaints.filter(c => c.status === 'open').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`border-blue-200 bg-blue-50 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'taken' ? 'ring-2 ring-blue-400' : ''}`} onClick={() => setStatusFilter(prev => prev === 'taken' ? 'all' : 'taken')}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-700">Action Taken</p>
                <p className="text-2xl font-bold text-blue-800">{complaints.filter(c => c.status === 'taken').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`border-yellow-200 bg-yellow-50 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'in_progress' ? 'ring-2 ring-yellow-400' : ''}`} onClick={() => setStatusFilter(prev => prev === 'in_progress' ? 'all' : 'in_progress')}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-700">In Progress</p>
                <p className="text-2xl font-bold text-yellow-800">{complaints.filter(c => c.status === 'in_progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`border-green-200 bg-green-50 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'solved' ? 'ring-2 ring-green-400' : ''}`} onClick={() => setStatusFilter(prev => prev === 'solved' ? 'all' : 'solved')}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-700">Solved</p>
                <p className="text-2xl font-bold text-green-800">{complaints.filter(c => c.status === 'solved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`border-emerald-200 bg-emerald-50 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'resolved' ? 'ring-2 ring-emerald-400' : ''}`} onClick={() => setStatusFilter(prev => prev === 'resolved' ? 'all' : 'resolved')}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-emerald-700">Resolved</p>
                <p className="text-2xl font-bold text-emerald-800">{complaints.filter(c => c.status === 'resolved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`border-gray-200 bg-gray-50 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'in_review' ? 'ring-2 ring-gray-400' : ''}`} onClick={() => setStatusFilter(prev => prev === 'in_review' ? 'all' : 'in_review')}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-700">Under Review</p>
                <p className="text-2xl font-bold text-gray-800">{complaints.filter(c => c.status === 'in_review').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <ReportGeneration
          title="Complaint Management"
          data={filteredComplaints}
          columns={[
            { key: 'complaint_title', label: 'Complaint Title' },
            { key: 'raised_by_staff.full_name', label: 'Raised By' },
            { key: 'raised_by_staff.staff_code', label: 'Staff Code' },
            { key: 'raised_by_staff.role', label: 'Role' },
            { key: 'complaint_against_staff.full_name', label: 'Complaint Against' },
            { key: 'complaint_against_staff.staff_code', label: 'Against Staff Code' },
            { key: 'category', label: 'Category', format: (value: string) => value.charAt(0).toUpperCase() + value.slice(1) },
            { key: 'priority', label: 'Priority', format: (value: string) => value.charAt(0).toUpperCase() + value.slice(1) },
            { key: 'status', label: 'Status', format: (value: string) => value.replace('_', ' ').charAt(0).toUpperCase() + value.replace('_', ' ').slice(1) },
            { key: 'created_at', label: 'Created', format: (value: string) => formatDateIST(value) },
            { key: 'taken_care_at', label: 'Action Date', format: (value: string) => value ? formatDateTimeIST(value) : 'No action taken' },
            { key: 'taken_care_by_staff.full_name', label: 'Action By' },
            { key: 'resolved_at', label: 'Resolved', format: (value: string) => value ? formatDateIST(value) : 'Not resolved' },
            { key: 'complaint_description', label: 'Description' },
            { key: 'admin_response', label: 'Admin Response' },
            { key: 'action_notes', label: 'Action Notes' }
          ]}
          filename="complaint_management_report"
        />
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">🟠 Open</SelectItem>
            <SelectItem value="taken">🔵 Action Taken</SelectItem>
            <SelectItem value="in_review">⚫ Under Review</SelectItem>
            <SelectItem value="in_progress">🟡 In Progress</SelectItem>
            <SelectItem value="solved">🟢 Solved</SelectItem>
            <SelectItem value="resolved">🟢 Resolved</SelectItem>
            <SelectItem value="closed">⚪ Closed</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {complaintCategories.map((category) => (
              <SelectItem key={category.id} value={category.category_code}>
                {category.category_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Complaints List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredComplaints.map((complaint) => (
          <Card key={complaint.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2">{complaint.complaint_title}</CardTitle>
                <Badge variant={getPriorityColor(complaint.priority)}>
                  {complaint.priority.charAt(0).toUpperCase() + complaint.priority.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {complaint.complaint_description}
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {complaint.raised_by_staff.full_name} ({complaint.raised_by_staff.staff_code})
                  </span>
                </div>

                {complaint.submitted_to_staff && (
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded-sm">
                    <p className="text-xs text-purple-700 font-medium mb-1">Submitted To:</p>
                    <p className="text-sm">
                      {complaint.submitted_to_staff.full_name} ({complaint.submitted_to_staff.staff_code})
                    </p>
                    <p className="text-xs text-muted-foreground">{complaint.submitted_to_staff.role}</p>
                  </div>
                )}

                {complaint.complaint_against_staff && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-sm">
                    <p className="text-xs text-amber-700 font-medium mb-1">Complaint Against:</p>
                    <p className="text-sm">
                      {complaint.complaint_against_staff.full_name} ({complaint.complaint_against_staff.staff_code})
                    </p>
                    <p className="text-xs text-muted-foreground">{complaint.complaint_against_staff.role}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {complaint.category.charAt(0).toUpperCase() + complaint.category.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateIST(complaint.created_at)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <Badge variant={getStatusColor(complaint.status)} className="flex items-center gap-1">
                    {getStatusIcon(complaint.status)}
                    {complaint.status.replace('_', ' ').charAt(0).toUpperCase() + complaint.status.replace('_', ' ').slice(1)}
                  </Badge>
                </div>
              </div>

              {complaint.admin_response && (
                <div className="mt-2 p-3 bg-muted rounded-sm">
                  <p className="text-xs text-muted-foreground mb-1">Admin Response:</p>
                  <p className="text-sm">{complaint.admin_response}</p>
                  {complaint.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Resolved on {formatDateIST(complaint.resolved_at)}
                    </p>
                  )}
                </div>
              )}

              {complaint.taken_care_by_staff && (
                <div className="mt-2 p-3 bg-blue-50 rounded-sm border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">Action Taken By:</p>
                  <p className="text-sm font-medium">{complaint.taken_care_by_staff.full_name}</p>
                  {complaint.taken_care_at && (
                    <p className="text-xs text-muted-foreground">
                      on {formatDateTimeIST(complaint.taken_care_at)}
                    </p>
                  )}
                  {complaint.action_notes && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Action Notes:</p>
                      <p className="text-sm">{complaint.action_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {(userRole === 'admin' || userRole === 'manager') && (
                <div className="flex flex-wrap gap-2">
                  {complaint.status === 'open' && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => updateComplaintStatus(complaint.id, 'taken')}
                      >
                        Take Action
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateComplaintStatus(complaint.id, 'in_review')}
                      >
                        Review
                      </Button>
                    </>
                  )}
                  
                  {complaint.status === 'taken' && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => updateComplaintStatus(complaint.id, 'in_progress')}
                      >
                        Start Progress
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateComplaintStatus(complaint.id, 'solved')}
                      >
                        Mark Solved
                      </Button>
                    </>
                  )}
                  
                  {complaint.status === 'in_progress' && (
                    <Button 
                      size="sm" 
                      onClick={() => updateComplaintStatus(complaint.id, 'solved')}
                    >
                      Mark Solved
                    </Button>
                  )}
                  
                  {(complaint.status === 'open' || complaint.status === 'in_review') && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setResponseDialog(true);
                      }}
                    >
                      Respond & Resolve
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredComplaints.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Complaints Found</h3>
            <p className="text-muted-foreground mb-4">
              {complaints.length === 0 
                ? "No complaints have been submitted yet." 
                : "No complaints match your current filters."
              }
            </p>
            {complaints.length === 0 && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Submit First Complaint
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin Response Dialog */}
      <Dialog open={responseDialog} onOpenChange={setResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Complaint</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdminResponse} className="space-y-4">
            {selectedComplaint && (
              <div className="space-y-2">
                <Label>Complaint</Label>
                <div className="p-3 bg-muted rounded-sm">
                  <h4 className="font-medium">{selectedComplaint.complaint_title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedComplaint.complaint_description}
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="admin_response">Response *</Label>
              <Textarea
                id="admin_response"
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Provide your response to resolve this complaint..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setResponseDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Resolving...' : 'Resolve Complaint'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComplaintManagement;