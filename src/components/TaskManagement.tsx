import React, { useState, useEffect, useRef } from 'react';
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
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { getStaffId, isStaffRole, getStaffTasks } from '@/lib/staffUtils';
import ReportGeneration from '@/components/ReportGeneration';
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User,
  Calendar,
  Filter,
  Timer,
  RefreshCw
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

  useEffect(() => {
    fetchTasks();
    if (userRole === 'admin' || userRole === 'manager') {
      fetchStaff();
    }
  }, [userRole]);

  const fetchTasks = async () => {
    try {
      let data: Task[] = [];

      // For staff users, use RPC function to bypass RLS issues
      if (isStaffRole(userRole)) {
        console.log('TaskManagement - Staff user:', user);
        
        const staffId = await getStaffId(user);

        if (staffId) {
          console.log('TaskManagement - About to query tasks for staff ID:', staffId);
          data = await getStaffTasks(staffId);
          console.log('TaskManagement - Converted tasks:', data);
        } else {
          console.log('TaskManagement - No staff ID found, cannot fetch tasks');
        }
      } else {
        // For admin/manager users, use regular query
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

    try {
      // Get current user's staff record directly via user_id
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
    }
  };

  const isRegisteringCompletionRef = useRef(false);
  const [registeringTaskId, setRegisteringTaskId] = useState<string | null>(null);

  const registerCompletion = async (taskId: string) => {
    if (isRegisteringCompletionRef.current) return;
    isRegisteringCompletionRef.current = true;
    setRegisteringTaskId(taskId);

    try {
      // Fresh DB check to prevent race conditions
      const { data: freshTask } = await supabase
        .from('tasks')
        .select('actual_completed_at')
        .eq('id', taskId)
        .maybeSingle();

      if (freshTask?.actual_completed_at) {
        toast({ title: "Already Registered", description: "Completion was already registered." });
        fetchTasks();
        return;
      }

      const { error } = await supabase
        .from('tasks')
        .update({ 
          actual_completed_at: toISOStringIST(), 
          updated_at: toISOStringIST() 
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Actual completion time registered successfully"
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to register completion time"
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
        notes: notes || null,
        updated_at: toISOStringIST()
      };

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
    if (!selectedTask) return;

    await updateTaskStatus(selectedTask.id, updateFormData.status, updateFormData.notes);
    setUpdateDialogOpen(false);
    setSelectedTask(null);
    setUpdateFormData({ status: '', notes: '' });
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
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredTasks = tasks.filter(task => {
    const statusMatch = statusFilter === 'all' || task.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
    return statusMatch && priorityMatch;
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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="task_title">Task Title *</Label>
                  <Input
                    id="task_title"
                    value={formData.task_title}
                    onChange={(e) => setFormData({ ...formData, task_title: e.target.value })}
                    placeholder="Enter task title"
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
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assign To *</Label>
                  <Select 
                    value={formData.assigned_to} 
                    onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                    required
                  >
                    <SelectTrigger>
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

                <div className="grid grid-cols-2 gap-4">
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Task
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
            <div className="space-y-2">
              <Label>Assign To *</Label>
              <Select value={reassignStaffId} onValueChange={setReassignStaffId}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Task: {selectedTask?.task_title}</Label>
              <p className="text-sm text-muted-foreground">{selectedTask?.task_description}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={updateFormData.status} 
                onValueChange={(value) => setUpdateFormData({ ...updateFormData, status: value })}
                required
              >
                <SelectTrigger>
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
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'overdue').length}</p>
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
        {filteredTasks.map((task) => (
          <Card key={task.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2">{task.task_title}</CardTitle>
                <Badge variant={getPriorityColor(task.priority)}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
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
                  <div className="flex items-center gap-2">
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
                    <CheckCircle className="h-3 w-3 text-success" />
                    <span className="text-xs text-success font-medium">
                      Finished at: {formatDateTimeIST(task.actual_completed_at)}
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
                            onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          >
                            Start Task
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                          >
                            Complete
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

                {!task.actual_completed_at && task.status === 'completed' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => registerCompletion(task.id)}
                    disabled={registeringTaskId === task.id}
                    className="gap-1"
                  >
                    <Timer className="h-4 w-4" />
                    {registeringTaskId === task.id ? 'Registering...' : 'Register Completion'}
                  </Button>
                )}
              </div>

              {task.notes && (
                <div className="mt-2 p-2 bg-muted rounded-sm">
                  <p className="text-xs text-muted-foreground">Notes:</p>
                  <p className="text-sm">{task.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
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