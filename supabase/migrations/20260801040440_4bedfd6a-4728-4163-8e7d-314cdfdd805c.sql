-- Add a default role to the profiles table for users creating their own profile
-- and prevent non-admins/managers from setting an elevated role.

-- 1. Update INSERT policy to restrict role on self-created profiles
DROP POLICY IF EXISTS "Allow profile creation for new users and by admins" ON public.profiles;

CREATE POLICY "Allow profile creation for new users and by admins"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (
  -- Users can create their own profile, but only with a non-elevated role
  (
    auth.uid() = user_id
    AND (role IS NULL OR role = 'doctor' OR role = 'staff')
  )
  OR
  -- Admins and managers can create any profile with any role
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
);

-- 2. Update UPDATE policy to prevent users from changing their own role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 3. Add a trigger as a defense-in-depth measure to block role changes by non-admins
CREATE OR REPLACE FUNCTION public.block_profile_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Only admins or managers can change the role column
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF get_user_role(auth.uid()) NOT IN ('admin', 'manager') THEN
      RAISE EXCEPTION 'Only admins or managers can change the role column on profiles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_profile_role_self_escalation() TO authenticated;

DROP TRIGGER IF EXISTS block_profile_role_self_escalation ON public.profiles;
CREATE TRIGGER block_profile_role_self_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.block_profile_role_self_escalation();