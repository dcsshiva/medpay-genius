-- Add policy to allow admins to create profiles for doctors
CREATE POLICY "Admins can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);