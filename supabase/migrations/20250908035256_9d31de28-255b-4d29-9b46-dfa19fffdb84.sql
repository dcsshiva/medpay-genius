-- Update profile creation policy to allow managers as well
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;

CREATE POLICY "Admins and managers can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'manager'::user_role]));