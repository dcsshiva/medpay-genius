-- WestMed Payroll System — administrators can be made to choose a new password at first sign-in
-- (until now only staff logins could). A row in hr_admin_password_flags keeps the password hash
-- the administrator was given; while their password still matches it, hr_whoami reports
-- must_change and the app asks for a new password before showing anything. Changing the password
-- clears the flag (hr_refresh_password_flag).
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS public.hr_admin_password_flags (
  user_id uuid PRIMARY KEY,
  password_flag_hash text NOT NULL,
  flagged_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_admin_password_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hr_admin_password_flags FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.hr_admin_must_change(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.hr_admin_password_flags f JOIN auth.users u ON u.id = f.user_id
                 WHERE f.user_id = _uid AND u.encrypted_password = f.password_flag_hash)
$$;

CREATE OR REPLACE FUNCTION public.hr_whoami()
 RETURNS TABLE(role text, emp_no text, name text, must_change boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    CASE WHEN public.hr_is_admin(auth.uid()) THEN 'admin'
         WHEN s.role = 'Manager' THEN 'manager'
         WHEN s.emp_no IS NOT NULL THEN 'staff'
         ELSE 'none' END,
    s.emp_no,
    COALESCE(s.name, (SELECT p.full_name FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1), 'Administrator'),
    CASE WHEN public.hr_is_admin(auth.uid()) THEN public.hr_admin_must_change(auth.uid())
         ELSE COALESCE(s.must_change_password, false) END
  FROM (SELECT 1) one
  LEFT JOIN public.hr_staff s ON s.user_id = auth.uid() AND s.active
$function$;

CREATE OR REPLACE FUNCTION public.hr_refresh_password_flag()
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE s record; h text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.hr_admin_password_flags WHERE user_id = auth.uid()) THEN
    IF public.hr_admin_must_change(auth.uid()) THEN RETURN true; END IF;
    DELETE FROM public.hr_admin_password_flags WHERE user_id = auth.uid();
    RETURN false;
  END IF;
  SELECT emp_no, must_change_password, password_flag_hash INTO s FROM public.hr_staff WHERE user_id = auth.uid();
  IF NOT FOUND OR NOT s.must_change_password THEN RETURN false; END IF;
  SELECT encrypted_password INTO h FROM auth.users WHERE id = auth.uid();
  IF h IS NULL OR h = extensions.crypt('wm#' || s.emp_no, h) OR h = s.password_flag_hash THEN RETURN true; END IF;
  UPDATE public.hr_staff SET must_change_password = false, password_flag_hash = NULL WHERE user_id = auth.uid();
  RETURN false;
END $function$;
