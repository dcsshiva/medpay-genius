-- Remove the policy that allows doctors to manage their own visits
DROP POLICY IF EXISTS "Doctors can manage their own visits" ON public.visits;

-- Create new policies that separate permissions properly
-- Doctors can only view their own visits
CREATE POLICY "Doctors can view their own visits" 
ON public.visits 
FOR SELECT 
USING (doctor_id IN (
  SELECT d.id
  FROM doctors d
  JOIN profiles p ON d.profile_id = p.id
  WHERE p.user_id = auth.uid()
));

-- Only managers and admins can insert, update, and delete visits
CREATE POLICY "Managers and admins can manage all visits" 
ON public.visits 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['manager'::user_role, 'admin'::user_role]));