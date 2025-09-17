-- Update task RLS policies to allow all staff roles to view and update their assigned tasks
-- Drop existing staff policies that might be too restrictive
DROP POLICY IF EXISTS "Staff can view their assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff can update their assigned tasks" ON public.tasks;

-- Create new policies that allow all staff roles except admin, manager, doctor
CREATE POLICY "Staff can view their assigned tasks" 
ON public.tasks 
FOR SELECT 
USING (
  assigned_to IN (
    SELECT s.id
    FROM staff s
    JOIN profiles p ON s.profile_id = p.id
    WHERE p.user_id = auth.uid()
    AND s.role NOT IN ('admin', 'manager', 'doctor')
  )
);

CREATE POLICY "Staff can update their assigned tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  assigned_to IN (
    SELECT s.id
    FROM staff s
    JOIN profiles p ON s.profile_id = p.id
    WHERE p.user_id = auth.uid()
    AND s.role NOT IN ('admin', 'manager', 'doctor')
  )
);