import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { getStaffId, isStaffRole, getStaffTasks } from '@/lib/staffUtils';
import ReportGeneration from '@/components/ReportGeneration';
import { ScrollArea } from '@/components/ui/scroll-area';
import ActivityTimeline from '@/components/ActivityTimeline';
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User,
  Calendar,
  Filter,
  Timer,
  RefreshCw,
  ClipboardList,
  FileText,
  MessageSquare,
  XCircle,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { formatDateIST, formatDateTimeIST, toISOStringIST } from '@/lib/dateUtils';

interface Task {
  id: string;
  task_title: string;
  task_description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  due_date?: string;
  completed_at?: string;
  actual_completed_at?: string;
  updated_at?: string;
  notes?: string;
  created_at: string;
  assigned_to_staff: {
    staff_code: string;
    full_name: string;
    role: string;
  };
  assigned_by_staff?: {
    staff_code: string;
    full_name: string;
  };
}

interface Staff {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
}

const TaskManagement = () => {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updateFormData, setUpdateFormData] = useState({
    status: '',
    notes: ''
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignTaskId, setReassignTaskId] = useState<string | null>(null);
  const [reassignStaffId, setReassignStaffId] = useState<string>('');
  const [reassigning, setReassigning] = useState(false);
  const [formData, setFormData] = useState({
    task_title: '',
    task_description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: ''
  });

  // Status change confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    taskId: string;
    taskTitle: string;
    targetStatus: string;
    label: string;
  } | null>(null);
  const [confirmNotes, setConfirmNotes] = useState('');

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTaskId, setCancelTaskId] = useState<string | null>(null);
  const [cancelTaskTitle, setCancelTaskTitle] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // Verify completion dialog state
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyTaskId, setVerifyTaskId] = useState<string | null>(null);
  const [verifyTaskTitle, setVerifyTaskTitle] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');

  // Check for unsaved changes
  const hasUnsavedChanges = formData.task_title.trim() !== '' || 
                           formData.task_description.trim() !== '' || 
                           formData.assigned_to !== '' || 
                           formData.due_date !== '';

  // Handle session timeout clearing unsaved data
  useUnsavedChanges({
    hasUnsavedChanges,
    onClear: () => {
      setFormData({
        task_title: '',
        task_description: '',
        assigned_to: '',
        priority: 'medium',
        due_date: ''
      });
      setUpdateFormData({ status: '', notes: '' });
      toast({
        title: "Form Cleared",
        description: "Unsaved task data has been cleared due to session timeout.",
        variant: "destructive"
      });
    }
  });

  // Overdue auto-detection
  const overdueTaskIds = useMemo(() => {
    const now = new Date();
    const ids = new Set<string>();
    tasks.forEach(task => {
      if (
        (task.status === 'pending' || task.status === 'in_progress') &&
        task.due_date &&
        new Date(task.due_date) < now
      ) {
        ids.add(task.id);
      }
    });
    return ids;
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
    if (userRole === 'admin' || userRole === 'manager') {
      fetchStaff();
    }
  }, [userRole]);

  const fetchTasks = async () => {
    try {
      let data: Task[] = [];

      if (isStaffRole(userRole)) {
        const staffId = await getStaffId(user);
        if (staffId) {
          data = await getStaffTasks(staffId);
        }
      } else {
        const { data: queryData, error } = await supabase
          .from('tasks')
          .select(`
            id,
            task_title,
            task_description,
            priority,
            status,
            due_date,
            completed_at,
            actual_completed_at,
            updated_at,
            notes,
            created_at,
            assigned_to_staff:assigned_to (
              staff_code,
              full_name,
              role
            ),
            assigned_by_staff:assigned_by (
              staff_code,
              full_name
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        data = (queryData as unknown as Task[]) || [];
      }

      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch tasks. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, staff_code, full_name, role')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (userRole !== 'admin' && userRole !== 'manager') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only admins and managers can create tasks"
      });
      return;
    }

    if (!formData.task_title.trim() || !formData.assigned_to) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Task title and assigned staff are required"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: currentStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      const { error } = await supabase
        .from('tasks')
        .insert({
          task_title: formData.task_title.trim(),
          task_description: formData.task_description.trim() || null,
          assigned_to: formData.assigned_to,
          assigned_by: currentStaff?.id || null,
          priority: formData.priority as any,
          due_date: formData.due_date || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task created successfully"
      });

      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create task"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isRegisteringCompletionRef = useRef(false);
  const [registeringTaskId, setRegisteringTaskId] = useState<string | null>(null);

  const registerCompletion = async (taskId: string, notes?: string) => {
    if (isRegisteringCompletionRef.current) return;
    isRegisteringCompletionRef.current = true;
    setRegisteringTaskId(taskId);

    try {
      const { data: freshTask } = await supabase
        .from('tasks')
        .select('actual_completed_at')
        .eq('id', taskId)
        .maybeSingle();

      if (freshTask?.actual_completed_at) {
        toast({ title: "Already Verified", description: "Completion was already verified." });
        fetchTasks();
        return;
      }

      const updateData: any = { 
        actual_completed_at: toISOStringIST(), 
        updated_at: toISOStringIST() 
      };
      if (notes?.trim()) {
        updateData.notes = notes.trim();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task completion verified successfully"
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to verify completion"
      });
    } finally {
      isRegisteringCompletionRef.current = false;
      setRegisteringTaskId(null);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string, notes?: string) => {
    try {
      const updateData: any = { 
        status: newStatus,
        updated_at: toISOStringIST()
      };

      if (notes?.trim()) {
        updateData.notes = notes.trim();
      }

      if (newStatus === 'completed') {
        updateData.completed_at = toISOStringIST();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Task marked as ${newStatus.replace('_', ' ')}`
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update task"
      });
    }
  };

  // Confirmation dialog handlers
  const openConfirmDialog = (taskId: string, taskTitle: string, targetStatus: string, label: string) => {
    setConfirmAction({ taskId, taskTitle, targetStatus, label });
    setConfirmNotes('');
    setConfirmDialogOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmAction || submitting) return;
    setSubmitting(true);
    try {
      await updateTaskStatus(confirmAction.taskId, confirmAction.targetStatus, confirmNotes);
      setConfirmDialogOpen(false);
      setConfirmAction(null);
      setConfirmNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel dialog handlers
  const openCancelDialog = (taskId: string, taskTitle: string) => {
    setCancelTaskId(taskId);
    setCancelTaskTitle(taskTitle);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const handleCancelTask = async () => {
    if (!cancelTaskId || !cancelReason.trim() || submitting) return;
    setSubmitting(true);
    try {
      await updateTaskStatus(cancelTaskId, 'cancelled', cancelReason);
      setCancelDialogOpen(false);
      setCancelTaskId(null);
      setCancelReason('');
    } finally {
      setSubmitting(false);
    }
  };

  // Verify completion dialog handlers
  const openVerifyDialog = (taskId: string, taskTitle: string) => {
    setVerifyTaskId(taskId);
    setVerifyTaskTitle(taskTitle);
    setVerifyNotes('');
    setVerifyDialogOpen(true);
  };

  const handleVerifyCompletion = async () => {
    if (!verifyTaskId || submitting) return;
    setSubmitting(true);
    try {
      await registerCompletion(verifyTaskId, verifyNotes);
      setVerifyDialogOpen(false);
      setVerifyTaskId(null);
      setVerifyNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = (task: Task) => {
    setSelectedTask(task);
    setUpdateFormData({
      status: task.status,
      notes: task.notes || ''
    });
    setUpdateDialogOpen(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || submitting) return;
    setSubmitting(true);
    try {
      await updateTaskStatus(selectedTask.id, updateFormData.status, updateFormData.notes);
      setUpdateDialogOpen(false);
      setSelectedTask(null);
      setUpdateFormData({ status: '', notes: '' });
    } finally {
      setSubmitting(false);
    }
  };

  const openReassignDialog = (taskId: string) => {
    setReassignTaskId(taskId);
    setReassignStaffId('');
    setReassignDialogOpen(true);
  };

  const handleReassign = async () => {
    if (!reassignTaskId || !reassignStaffId) return;
    setReassigning(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          assigned_to: reassignStaffId,
          status: 'pending' as any,
          completed_at: null,
          actual_completed_at: null,
          updated_at: toISOStringIST()
        })
        .eq('id', reassignTaskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task re-assigned successfully"
      });
      setReassignDialogOpen(false);
      fetchTasks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to re-assign task"
      });
    } finally {
      setReassigning(false);
    }
  };

  const resetForm = () => {
    setFormData({
      task_title: '',
      task_description: '',
      assigned_to: '',
      priority: 'medium',
      due_date: ''
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
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      case 'overdue': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (statusFilter === 'overdue') {
      return overdueTaskIds.has(task.id);
    }
    const statusMatch = statusFilter === 'all' || task.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const statusOrder: Record<string, number> = {
    in_progress: 0,
    pending: 1,
    completed: 2,
    cancelled: 3
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Overdue tasks first
    const aOverdue = overdueTaskIds.has(a.id) ? -1 : 0;
    const bOverdue = overdueTaskIds.has(b.id) ? -1 : 0;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    return (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Task Management</h1>
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
          <h1 className="text-3xl font-bold text-foreground">Task Management</h1>
          <p className="text-muted-foreground">
            {userRole === 'admin' || userRole === 'manager' 
              ? 'Assign and manage tasks for hospital staff'
              : 'View and update your assigned tasks'
            }
          </p>
        </div>
        
        {(userRole === 'admin' || userRole === 'manager') && (
          <div className="flex gap-2">
            <ReportGeneration
              title="Task Management"
              data={filteredTasks}
              columns={[
                { key: 'task_title', label: 'Task Title' },
                { key: 'assigned_to_staff.full_name', label: 'Assigned To' },
                { key: 'assigned_to_staff.staff_code', label: 'Staff Code' },
                { key: 'assigned_to_staff.role', label: 'Role' },
                { key: 'priority', label: 'Priority', format: (value: string) => value.charAt(0).toUpperCase() + value.slice(1) },
                { key: 'status', label: 'Status', format: (value: string) => value.replace('_', ' ').charAt(0).toUpperCase() + value.replace('_', ' ').slice(1) },
                { key: 'due_date', label: 'Due Date', format: (value: string) => value ? formatDateTimeIST(value) : 'No due date' },
                { key: 'created_at', label: 'Created', format: (value: string) => formatDateIST(value) },
                { key: 'completed_at', label: 'Completed', format: (value: string) => value ? formatDateIST(value) : 'Not completed' },
                { key: 'task_description', label: 'Description' },
                { key: 'notes', label: 'Notes' }
              ]}
              filename="task_management_report"
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </DialogTrigger>
               <DialogContent 
                className="max-w-2xl max-h-[85vh] grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden"
                hasUnsavedChanges={hasUnsavedChanges}
                onConfirmClose={() => { resetForm(); setDialogOpen(false); }}
              >
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>Fill in the details below to create and assign a new task.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid grid-rows-[minmax(0,1fr)_auto] overflow-hidden min-h-0">
                  <ScrollArea className="h-full pr-4 -mr-4">
                    <div className="space-y-5 px-1 py-1">
                      {/* Section: Task Details */}
                      <div className="rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                          <ClipboardList className="h-4 w-4 text-primary" />
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task Details</h3>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="task_title">Task Title *</Label>
                          <Input
                            id="task_title"
                            value={formData.task_title}
                            onChange={(e) => setFormData({ ...formData, task_title: e.target.value })}
                            placeholder="Enter task title"
                            className="hover:border-primary/50 transition-colors"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="task_description">Task Description</Label>
                          <Textarea
                            id="task_description"
                            value={formData.task_description}
                            onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                            placeholder="Describe the task details..."
                            className="hover:border-primary/50 transition-colors"
                            rows={3}
                          />
                        </div>
                      </div>

                      {/* Section: Assignment */}
                      <div className="rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                          <User className="h-4 w-4 text-primary" />
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignment</h3>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="assigned_to">Assign To *</Label>
                          <Select 
                            value={formData.assigned_to} 
                            onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                            required
                          >
                            <SelectTrigger className="hover:border-primary/50 transition-colors">
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent>
                              {staff.length === 0 ? (
                                <SelectItem value="no-staff" disabled>
                                  No active staff available
                                </SelectItem>
                              ) : (
                                staff.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.full_name} ({member.staff_code}) - {member.role}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select 
                              value={formData.priority} 
                              onValueChange={(value) => setFormData({ ...formData, priority: value })}
                            >
                              <SelectTrigger className="hover:border-primary/50 transition-colors">
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
                          <div className="space-y-2">
                            <Label htmlFor="due_date">Due Date</Label>
                            <Input
                              id="due_date"
                              type="datetime-local"
                              value={formData.due_date}
                              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                              className="hover:border-primary/50 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                  <div className="flex justify-end space-x-2 pt-4 border-t border-border flex-shrink-0 bg-background">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create Task'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Re-assign Task Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Re-assign Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <User className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Assignment</h3>
              </div>
              <div className="space-y-2">
                <Label>Assign To *</Label>
                <Select value={reassignStaffId} onValueChange={setReassignStaffId}>
                  <SelectTrigger className="hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name} ({member.staff_code}) - {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleReassign} disabled={!reassignStaffId || reassigning}>
                {reassigning ? 'Re-assigning...' : 'Re-assign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Update Dialog for Staff */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <p className="text-sm font-semibold">{selectedTask?.task_title}</p>
              {selectedTask?.task_description && (
                <p className="text-xs text-muted-foreground">{selectedTask.task_description}</p>
              )}
            </div>

            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update Status</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select 
                  value={updateFormData.status} 
                  onValueChange={(value) => setUpdateFormData({ ...updateFormData, status: value })}
                  required
                >
                  <SelectTrigger className="hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {isStaffRole(userRole) ? (
                      <>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={updateFormData.notes}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, notes: e.target.value })}
                  placeholder="Add any notes about this task..."
                  className="hover:border-primary/50 transition-colors"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Status Change Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Confirm: {confirmAction?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-semibold">{confirmAction?.taskTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Status will change to: <span className="font-medium text-foreground">{confirmAction?.targetStatus?.replace('_', ' ')}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="Add notes for this status change..."
                className="hover:border-primary/50 transition-colors"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmStatusChange} disabled={submitting}>
                {submitting ? 'Processing...' : `Confirm ${confirmAction?.label}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Task Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Cancel Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-semibold">{cancelTaskTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">This action cannot be undone.</p>
            </div>
            <div className="space-y-2">
              <Label>Cancellation Reason *</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Provide a reason for cancelling this task..."
                className="hover:border-primary/50 transition-colors"
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Task</Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelTask} 
                disabled={!cancelReason.trim() || submitting}
              >
                {submitting ? 'Cancelling...' : 'Cancel Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify Completion Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-success" />
              Verify Task Completion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-semibold">{verifyTaskTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Confirming this will stamp the actual completion time and mark the task as verified.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Verification Notes (optional)</Label>
              <Textarea
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Add verification notes..."
                className="hover:border-primary/50 transition-colors"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleVerifyCompletion} disabled={submitting}>
                {submitting ? 'Verifying...' : 'Verify Completion'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending' ? 'ring-2 ring-primary border-primary' : ''}`}
          onClick={() => setStatusFilter(prev => prev === 'pending' ? 'all' : 'pending')}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-westmed-teal" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'in_progress' ? 'ring-2 ring-warning border-warning' : ''}`}
          onClick={() => setStatusFilter(prev => prev === 'in_progress' ? 'all' : 'in_progress')}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-warning" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'in_progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'completed' ? 'ring-2 ring-success border-success' : ''}`}
          onClick={() => setStatusFilter(prev => prev === 'completed' ? 'all' : 'completed')}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'overdue' ? 'ring-2 ring-destructive border-destructive' : ''}`}
          onClick={() => setStatusFilter(prev => prev === 'overdue' ? 'all' : 'overdue')}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{overdueTaskIds.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'cancelled' ? 'ring-2 ring-muted-foreground border-muted-foreground' : ''}`}
          onClick={() => setStatusFilter(prev => prev === 'cancelled' ? 'all' : 'cancelled')}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'cancelled').length}</p>
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTasks.map((task) => {
          const isOverdue = overdueTaskIds.has(task.id);
          const isAwaitingVerification = task.status === 'completed' && !task.actual_completed_at;
          
          return (
            <Card 
              key={task.id} 
              className={`transition-all ${isOverdue ? 'border-destructive/60 bg-destructive/5' : ''} ${isAwaitingVerification ? 'border-warning/60 bg-warning/5' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">{task.task_title}</CardTitle>
                  <div className="flex gap-1 flex-shrink-0">
                    {isOverdue && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        OVERDUE
                      </Badge>
                    )}
                    {isAwaitingVerification && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning text-warning">
                        AWAITING VERIFICATION
                      </Badge>
                    )}
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.task_description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {task.task_description}
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {task.assigned_to_staff.full_name} ({task.assigned_to_staff.staff_code})
                    </span>
                  </div>
                  
                  {task.due_date && (
                    <div className={`flex items-center gap-2 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Due: {formatDateTimeIST(task.due_date)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={getStatusColor(task.status)} className="flex items-center gap-1">
                      {getStatusIcon(task.status)}
                      {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateIST(task.created_at).split(',')[0]}
                    </span>
                  </div>

                  {task.updated_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Last Updated: {formatDateTimeIST(task.updated_at)}
                      </span>
                    </div>
                  )}

                  {task.actual_completed_at && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3 w-3 text-success" />
                      <span className="text-xs text-success font-medium">
                        Verified at: {formatDateTimeIST(task.actual_completed_at)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {task.status !== 'cancelled' && (
                    <>
                      {userRole === 'admin' || userRole === 'manager' ? (
                        <>
                          {task.status === 'pending' && (
                            <Button 
                              size="sm" 
                              onClick={() => openConfirmDialog(task.id, task.task_title, 'in_progress', 'Start Task')}
                            >
                              Start Task
                            </Button>
                          )}
                          {task.status === 'in_progress' && (
                            <Button 
                              size="sm" 
                              onClick={() => openConfirmDialog(task.id, task.task_title, 'completed', 'Complete')}
                            >
                              Complete
                            </Button>
                          )}
                          {(task.status === 'pending' || task.status === 'in_progress') && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openCancelDialog(task.id, task.task_title)}
                              className="gap-1 text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-3 w-3" />
                              Cancel
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openReassignDialog(task.id)}
                            className="gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Re-assign
                          </Button>
                        </>
                      ) : (
                        (() => {
                          const staffAlreadyUpdated = isStaffRole(userRole) && task.status === 'completed' && task.updated_at;
                          return staffAlreadyUpdated ? (
                            <Button size="sm" disabled>
                              Updated
                            </Button>
                          ) : task.status !== 'completed' ? (
                            <Button 
                              size="sm" 
                              onClick={() => handleUpdateTask(task)}
                            >
                              Update Task
                            </Button>
                          ) : null;
                        })()
                      )}
                    </>
                  )}

                  {/* Verify Completion - only for admin/manager on completed tasks without actual_completed_at */}
                  {isAwaitingVerification && (userRole === 'admin' || userRole === 'manager') && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openVerifyDialog(task.id, task.task_title)}
                      disabled={registeringTaskId === task.id}
                      className="gap-1 border-success text-success hover:bg-success/10"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {registeringTaskId === task.id ? 'Verifying...' : 'Verify Completion'}
                    </Button>
                  )}
                </div>

                {task.notes && (
                  <div className="mt-2 p-2 bg-muted rounded-sm">
                    <p className="text-xs text-muted-foreground">Notes:</p>
                    <p className="text-sm">{task.notes}</p>
                  </div>
                )}

                <ActivityTimeline tableName="tasks" recordId={task.id} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Tasks Found</h3>
            <p className="text-muted-foreground mb-4">
              {tasks.length === 0 
                ? "No tasks have been created yet." 
                : "No tasks match your current filters."
              }
            </p>
            {(userRole === 'admin' || userRole === 'manager') && tasks.length === 0 && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskManagement;
