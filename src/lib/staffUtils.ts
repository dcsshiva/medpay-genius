import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Get staff ID for the current user - handles both custom auth and Supabase auth users
 * @param user - The authenticated user object
 * @returns staff ID or null if not found
 */
export const getStaffId = async (user: User | null): Promise<string | null> => {
  if (!user) return null;

  let staffId: string | null = null;

  // Custom auth: we already have the staff id in user metadata
  if (user?.user_metadata?.user_type === 'staff' && user?.user_metadata?.original_id) {
    staffId = user.user_metadata.original_id as string;
    console.log('Using custom auth staff ID:', staffId);
  } else {
    // Supabase-auth fallback: resolve via user_id -> staff
    console.log('Falling back to Supabase auth lookup for staff');
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    staffId = staffData?.id ?? null;
    console.log('Found staff ID via user_id lookup:', staffId);
  }

  console.log('Final staff ID:', staffId);
  return staffId;
};

/**
 * Check if a user role is a staff role (non-admin, non-manager, non-doctor)
 * @param userRole - The user's role
 * @returns true if the role is a staff role
 */
export const isStaffRole = (userRole: string | null): boolean => {
  return userRole !== null && !['admin', 'manager', 'doctor'].includes(userRole);
};

/**
 * Get task counts for a staff member
 * @param staffId - The staff member's ID
 * @returns object with pending and completed task counts
 */
export const getStaffTaskCounts = async (staffId: string) => {
  const { data: taskCounts, error } = await supabase
    .rpc('get_staff_task_counts', { _staff_id: staffId });

  if (error || !taskCounts || taskCounts.length === 0) {
    console.log('No task counts found or error:', error);
    return { pendingTasks: 0, completedTasks: 0 };
  }

  const counts = taskCounts[0];
  return {
    pendingTasks: (counts.pending_count || 0) + (counts.in_progress_count || 0),
    completedTasks: counts.completed_count || 0,
  };
};

/**
 * Get tasks for a staff member
 * @param staffId - The staff member's ID
 * @returns array of tasks assigned to the staff member  
 */
export const getStaffTasks = async (staffId: string) => {
  const { data: staffTasks, error } = await supabase
    .rpc('get_staff_tasks', { _staff_id: staffId });

  if (error) {
    console.error('Error fetching staff tasks:', error);
    throw error;
  }

  // Convert RPC result to Task format
  return (staffTasks || []).map((task: any) => ({
    id: task.id,
    task_title: task.task_title,
    task_description: task.task_description,
    priority: task.priority,
    status: task.status,
    due_date: task.due_date,
    completed_at: task.completed_at,
    notes: task.notes,
    created_at: task.created_at,
    assigned_to_staff: {
      staff_code: task.assigned_to_staff_code,
      full_name: task.assigned_to_full_name,
      role: task.assigned_to_role,
    },
    assigned_by_staff: task.assigned_by_staff_code ? {
      staff_code: task.assigned_by_staff_code,
      full_name: task.assigned_by_full_name,
    } : undefined,
  }));
};