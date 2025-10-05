-- Fix security issue: Staff Passwords and Personal Data Protection
-- This migration ensures that staff data is properly secured with RLS policies

-- First, let's create a helper function to get staff information without sensitive data
-- This is useful for UI elements like dropdowns where we don't need passwords/emails
CREATE OR REPLACE FUNCTION public.get_staff_list_for_management()
RETURNS TABLE (
  id uuid,
  staff_code text,
  full_name text,
  role staff_role,
  department text,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    staff_code,
    full_name,
    role,
    department,
    is_active
  FROM public.staff
  WHERE (
    -- Only admins and managers can see the list
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  );
$$;

-- Drop existing policies to recreate them with better security
DROP POLICY IF EXISTS "Staff can view their own record" ON public.staff;
DROP POLICY IF EXISTS "Staff can update their own record" ON public.staff;
DROP POLICY IF EXISTS "Admins can manage all staff" ON public.staff;

-- Create new, more secure policies

-- 1. Admins can do everything with staff records
CREATE POLICY "Admins can manage all staff"
ON public.staff
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- 2. Managers can view and update staff (but not insert or delete)
-- This allows them to assign tasks and manage staff
CREATE POLICY "Managers can view all staff"
ON public.staff
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'manager'::user_role);

CREATE POLICY "Managers can update staff records"
ON public.staff
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'manager'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'manager'::user_role);

-- 3. Staff can view their own record only
CREATE POLICY "Staff can view their own record"
ON public.staff
FOR SELECT
TO authenticated
USING (
  profile_id IN (
    SELECT profiles.id
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
  )
);

-- 4. Staff can update their own record (excluding sensitive fields via trigger)
CREATE POLICY "Staff can update their own record"
ON public.staff
FOR UPDATE
TO authenticated
USING (
  profile_id IN (
    SELECT profiles.id
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  profile_id IN (
    SELECT profiles.id
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
  )
);

-- Create a trigger to prevent staff from modifying their own password_hash or role
CREATE OR REPLACE FUNCTION public.prevent_staff_self_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user is not an admin and is trying to update their own record
  IF get_user_role(auth.uid()) != 'admin'::user_role THEN
    -- Prevent changing password_hash unless it's being set by admin
    IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
      RAISE EXCEPTION 'Staff members cannot change their own password through this method. Please use the password reset feature.';
    END IF;
    
    -- Prevent changing role
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Staff members cannot change their own role.';
    END IF;
    
    -- Prevent changing is_active status
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      RAISE EXCEPTION 'Staff members cannot change their own active status.';
    END IF;
    
    -- Prevent changing staff_code
    IF OLD.staff_code IS DISTINCT FROM NEW.staff_code THEN
      RAISE EXCEPTION 'Staff members cannot change their own staff code.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS prevent_staff_privilege_escalation ON public.staff;
CREATE TRIGGER prevent_staff_privilege_escalation
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_staff_self_privilege_escalation();

-- Add comment to document the security measures
COMMENT ON TABLE public.staff IS 'Staff table with RLS protection. Only admins can fully manage staff. Managers can view and update (but not create/delete). Staff can only view and partially update their own records. Sensitive fields (password_hash, role, is_active, staff_code) are protected from self-modification via trigger.';