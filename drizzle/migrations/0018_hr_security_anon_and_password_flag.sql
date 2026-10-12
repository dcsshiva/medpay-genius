-- WestMed Payroll System — security, stage 1 (no visible change for anyone).
--   1. Anonymous visitors (the public API key) get no access to HR tables, the staff directory or HR functions.
--      The staff directory was readable without signing in, exposing every staff code (= default password).
--   2. The staff directory is only returned to signed-in HR users (admins and active staff).
--   3. hr_staff.must_change_password marks accounts that must choose a new password at next sign-in:
--      new logins (password = staff code) and passwords set by an administrator. Enforced in 0019.
-- Safe to run more than once.

-- ───────────── 1. no anonymous access ─────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hr_units','hr_departments','hr_designations','hr_shifts','hr_holidays','hr_task_templates',
                           'hr_settings','hr_staff','hr_attendance','hr_roster','hr_tasks','hr_leaves','hr_active_sessions',
                           'hr_payroll_runs','hr_payslips','hr_staff_directory']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.hr_is_admin(uuid), public.hr_my_emp(uuid), public.hr_is_manager(uuid), public.hr_can_manage(uuid),
  public.hr_latest_attendance_date(), public.hr_attendance_stats(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_is_admin(uuid), public.hr_my_emp(uuid), public.hr_is_manager(uuid), public.hr_can_manage(uuid),
  public.hr_latest_attendance_date(), public.hr_attendance_stats(date, date) TO authenticated, service_role;

-- ───────────── 2. directory only for HR users ─────────────
CREATE OR REPLACE VIEW public.hr_staff_directory AS
  SELECT emp_no, db_ref, name, role, reporting_manager, designation_code, department_code,
         unit_code, shift_code, active
  FROM public.hr_staff
  WHERE active
    AND (public.hr_is_admin(auth.uid()) OR public.hr_my_emp(auth.uid()) IS NOT NULL);
REVOKE ALL ON public.hr_staff_directory FROM anon;
GRANT SELECT ON public.hr_staff_directory TO authenticated;

-- ───────────── 3. must-change-password flag ─────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'hr_staff' AND column_name = 'must_change_password') THEN
    ALTER TABLE public.hr_staff
      ADD COLUMN must_change_password boolean NOT NULL DEFAULT true,
      ADD COLUMN password_flag_hash text;   -- password hash when the flag was set; a new password must differ from it
    -- first run only: flag every login still on the default password (staff code); clear the rest
    UPDATE public.hr_staff s
    SET must_change_password = (u.encrypted_password IS NULL
                                OR u.encrypted_password = extensions.crypt('wm#' || s.emp_no, u.encrypted_password)),
        password_flag_hash = u.encrypted_password
    FROM auth.users u
    WHERE u.id = s.user_id;
    UPDATE public.hr_staff SET password_flag_hash = NULL WHERE NOT must_change_password;
  END IF;
END $$;

-- Called by the app after a password change: clears the flag only if the password really changed
-- (differs from the default and from the one in force when the flag was set).
CREATE OR REPLACE FUNCTION public.hr_refresh_password_flag()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE s record; h text;
BEGIN
  SELECT emp_no, must_change_password, password_flag_hash INTO s FROM public.hr_staff WHERE user_id = auth.uid();
  IF NOT FOUND OR NOT s.must_change_password THEN RETURN false; END IF;
  SELECT encrypted_password INTO h FROM auth.users WHERE id = auth.uid();
  IF h IS NULL OR h = extensions.crypt('wm#' || s.emp_no, h) OR h = s.password_flag_hash THEN RETURN true; END IF;
  UPDATE public.hr_staff SET must_change_password = false, password_flag_hash = NULL WHERE user_id = auth.uid();
  RETURN false;
END $$;
REVOKE EXECUTE ON FUNCTION public.hr_refresh_password_flag() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_refresh_password_flag() TO authenticated;

-- Called by hr-manage-login (service role) when an administrator sets a staff password.
CREATE OR REPLACE FUNCTION public.hr_flag_password_change(_emp text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.hr_staff s
  SET must_change_password = true,
      password_flag_hash = (SELECT u.encrypted_password FROM auth.users u WHERE u.id = s.user_id)
  WHERE s.emp_no = _emp
$$;
REVOKE EXECUTE ON FUNCTION public.hr_flag_password_change(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hr_flag_password_change(text) TO service_role;

-- Who is signed in — now also says whether they must change their password first.
DROP FUNCTION IF EXISTS public.hr_whoami();
CREATE FUNCTION public.hr_whoami()
RETURNS TABLE (role text, emp_no text, name text, must_change boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    CASE WHEN public.hr_is_admin(auth.uid()) THEN 'admin'
         WHEN s.role = 'Manager' THEN 'manager'
         WHEN s.emp_no IS NOT NULL THEN 'staff'
         ELSE 'none' END,
    s.emp_no,
    COALESCE(s.name, (SELECT p.full_name FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1), 'Administrator'),
    COALESCE(s.must_change_password, false) AND NOT public.hr_is_admin(auth.uid())
  FROM (SELECT 1) one
  LEFT JOIN public.hr_staff s ON s.user_id = auth.uid() AND s.active
$$;
REVOKE EXECUTE ON FUNCTION public.hr_whoami() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_whoami() TO authenticated, service_role;
