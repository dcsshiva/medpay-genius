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
import { 
  Plus, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  User,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

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
}

const ComplaintManagement = () => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseDialog, setResponseDialog] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [adminResponse, setAdminResponse] = useState('');
  const [formData, setFormData] = useState({
    complaint_title: '',
    complaint_description: '',
    category: 'general',
    priority: 'medium'
  });

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'facility', label: 'Facility' },
    { value: 'workload', label: 'Workload' },
    { value: 'policy', label: 'Policy' },
    { value: 'safety', label: 'Safety' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchComplaints();
  }, [userRole]);

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

    if (!formData.complaint_title.trim() || !formData.complaint_description.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Complaint title and description are required"
      });
      return;
    }

    try {
      // Get current user's staff record
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

      if (!currentStaff) throw new Error('Staff record not found');

      const { error } = await supabase
        .from('complaints')
        .insert({
          complaint_title: formData.complaint_title.trim(),
          complaint_description: formData.complaint_description.trim(),
          category: formData.category as any,
          priority: formData.priority as any,
          raised_by: currentStaff.id,
          status: 'open'
        });

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
    }
  };

  const handleAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();

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
          resolved_at: new Date().toISOString()
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
        updateData.taken_care_at = new Date().toISOString();
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
      category: 'general',
      priority: 'medium'
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit New Complaint</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="complaint_title">Complaint Title *</Label>
                <Input
                  id="complaint_title"
                  value={formData.complaint_title}
                  onChange={(e) => setFormData({ ...formData, complaint_title: e.target.value })}
                  placeholder="Brief description of the issue"
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
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
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
                    <SelectTrigger>
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

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Submit Complaint
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-warning" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">{complaints.filter(c => c.status === 'open').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Taken</p>
                <p className="text-2xl font-bold">{complaints.filter(c => c.status === 'taken').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-westmed-teal" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{complaints.filter(c => c.status === 'in_progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Solved</p>
                <p className="text-2xl font-bold">{complaints.filter(c => c.status === 'solved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{complaints.filter(c => c.status === 'resolved').length}</p>
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
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="taken">Taken</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="solved">Solved</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
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
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {complaint.category.charAt(0).toUpperCase() + complaint.category.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(complaint.created_at), 'MMM d, yyyy')}
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
                      Resolved on {format(new Date(complaint.resolved_at), 'MMM d, yyyy')}
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
                      on {format(new Date(complaint.taken_care_at), 'MMM d, yyyy HH:mm')}
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
              <Button type="submit">
                Resolve Complaint
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComplaintManagement;