-- Default screen access for the "staff_manager" role: manager-like access,
-- excluding all payment-processing related screens.

CREATE OR REPLACE FUNCTION public.staff_manager_default_screens()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'dashboard','staff-dashboard','admin-dashboard',
    'user-guide','user_guide',
    'masters',
    'attendance',
    'staff','staff-management','staff_management',
    'appraisals','staff_appraisal',
    'payroll',
    'tasks','task_management',
    'leave-approvals','leave_approvals','leave-permission','leave_permission',
    'complaints','complaint_management',
    'chat',
    'login-reports','navigation-analytics','audit-trail'
  ]::text[];
$$;

CREATE OR REPLACE FUNCTION public.apply_staff_manager_defaults(_staff_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_screen_permissions (staff_id, screen_key, can_view, can_edit)
  SELECT _staff_id, r.screen_key, true, true
  FROM public.screen_registry r
  WHERE r.is_active
    AND r.super_admin_only = false
    AND r.screen_key = ANY (public.staff_manager_default_screens())
  ON CONFLICT (staff_id, screen_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_staff_manager_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role::text = 'staff_manager'
     AND (TG_OP = 'INSERT' OR OLD.role::text IS DISTINCT FROM NEW.role::text) THEN
    PERFORM public.apply_staff_manager_defaults(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_manager_defaults_trg ON public.staff;
CREATE TRIGGER staff_manager_defaults_trg
AFTER INSERT OR UPDATE OF role ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.tg_staff_manager_defaults();

-- Backfill existing staff_manager staff
DO $$
DECLARE s record;
BEGIN
  FOR s IN SELECT id FROM public.staff WHERE role::text = 'staff_manager' LOOP
    PERFORM public.apply_staff_manager_defaults(s.id);
  END LOOP;
END $$;