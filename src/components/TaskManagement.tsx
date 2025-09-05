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
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User,
  Calendar,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface Task {
  id: string;
  task_title: string;
  task_description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  due_date?: string;
  completed_at?: string;
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    task_title: '',
    task_description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: ''
  });

  useEffect(() => {
    fetchTasks();
    if (userRole === 'admin' || userRole === 'manager') {
      fetchStaff();
    }
  }, [userRole]);

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('tasks')
        .select(`
          id,
          task_title,
          task_description,
          priority,
          status,
          due_date,
          completed_at,
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

      const { data, error } = await query;

      if (error) throw error;
      setTasks((data as unknown as Task[]) || []);
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

  const updateTaskStatus = async (taskId: string, newStatus: string, notes?: string) => {
    try {
      const updateData: any = { 
        status: newStatus,
        notes: notes || null
      };

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
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
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
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
        
        <Card>
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
        
        <Card>
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
        
        <Card>
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
                      Due: {format(new Date(task.due_date), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <Badge variant={getStatusColor(task.status)} className="flex items-center gap-1">
                    {getStatusIcon(task.status)}
                    {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(task.created_at), 'MMM d')}
                  </span>
                </div>
              </div>

              {task.status !== 'completed' && task.status !== 'cancelled' && (
                <div className="flex gap-2">
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
                </div>
              )}

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