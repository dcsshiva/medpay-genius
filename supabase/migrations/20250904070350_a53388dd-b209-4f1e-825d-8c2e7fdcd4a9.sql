-- Fix infinite recursion in staff table RLS policies
DROP POLICY IF EXISTS "Admins can manage all staff" ON public.staff;

-- Create a new policy that uses get_user_role function to avoid recursion
CREATE POLICY "Admins can manage all staff" 
ON public.staff 
FOR ALL 
TO authenticated 
USING (get_user_role(auth.uid()) = 'admin'::user_role);