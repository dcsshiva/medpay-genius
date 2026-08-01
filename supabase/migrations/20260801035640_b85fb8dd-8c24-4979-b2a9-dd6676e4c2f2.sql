-- Prevent privilege escalation via staff self-update
CREATE OR REPLACE FUNCTION public.enforce_staff_update_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Only admins, managers, or super admins may change privileged columns
  IF (
    OLD.role IS DISTINCT FROM NEW.role
    OR OLD.is_active IS DISTINCT FROM NEW.is_active
    OR OLD.staff_category_id IS DISTINCT FROM NEW.staff_category_id
  ) THEN
    IF NOT (
      has_designation(auth.uid(), 'admin')
      OR has_designation(auth.uid(), 'manager')
      OR has_designation(auth.uid(), 'super_admin')
    ) THEN
      RAISE EXCEPTION 'Only admins or managers may change role, active status, or staff category.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_update_restrictions ON public.staff;
CREATE TRIGGER staff_update_restrictions
BEFORE UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.enforce_staff_update_restrictions();

-- Prevent privilege escalation via profiles role changes
CREATE OR REPLACE FUNCTION public.enforce_profile_role_restriction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean;
BEGIN
  is_privileged := has_designation(auth.uid(), 'admin')
    OR has_designation(auth.uid(), 'manager')
    OR has_designation(auth.uid(), 'super_admin');

  IF TG_OP = 'INSERT' THEN
    -- Self-registered users must default to staff; privileged users can set role explicitly
    IF NOT is_privileged THEN
      NEW.role := 'staff'::user_role;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Self-updates cannot change role; privileged users can change role
    IF NOT is_privileged AND OLD.role IS DISTINCT FROM NEW.role THEN
      NEW.role := OLD.role;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_role_restriction ON public.profiles;
CREATE TRIGGER profile_role_restriction
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_role_restriction();

-- Ensure the functions can be invoked by the auth policies
GRANT EXECUTE ON FUNCTION public.enforce_staff_update_restrictions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_profile_role_restriction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_designation(uuid, app_designation) TO authenticated;