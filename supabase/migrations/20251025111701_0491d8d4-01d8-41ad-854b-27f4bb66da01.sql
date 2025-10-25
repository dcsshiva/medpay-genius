-- Drop the existing INSERT policy that was blocking trigger execution
DROP POLICY IF EXISTS "Admins and managers can create profiles" ON public.profiles;

-- Create an improved INSERT policy that allows both:
-- 1. Admins/managers to create profiles for others
-- 2. Profile creation during user registration (for the trigger)
CREATE POLICY "Allow profile creation for new users and by admins"
ON public.profiles
FOR INSERT
WITH CHECK (
  -- Allow if the inserting user is admin/manager
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  OR
  -- Allow if creating a profile for the authenticated user themselves (during registration)
  auth.uid() = user_id
);