-- WestMed Payroll System — security, stage 2. Apply AFTER the app version with the
-- "choose a new password" screen is published (it reads hr_whoami().must_change).
--   1. An account that must change its password (default password = staff code, or one set by an
--      administrator) sees no HR data until it does: hr_my_emp / hr_is_manager ignore it.
--   2. Managers see and act on their own reports only (plus their own records), instead of everyone:
--      staff records (salary, bank, personal details), attendance, roster, payslips, tasks and leave.
--      A manager can no longer approve their own leave or edit their own attendance.
--   3. Month-on-month attendance statistics are for administrators only.
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.hr_my_emp(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT emp_no FROM public.hr_staff WHERE user_id = _uid AND active AND NOT must_change_password LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.hr_is_manager(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.hr_staff WHERE user_id = _uid AND active AND role = 'Manager' AND NOT must_change_password)
$$;

-- admin, or the caller is the (active, password-changed) reporting manager of _emp
CREATE OR REPLACE FUNCTION public.hr_manages(_uid uuid, _emp text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.hr_is_admin(_uid)
      OR EXISTS (SELECT 1 FROM public.hr_staff m JOIN public.hr_staff r ON r.reporting_manager = m.emp_no
                 WHERE m.user_id = _uid AND m.active AND m.role = 'Manager' AND NOT m.must_change_password
                   AND r.emp_no = _emp AND r.emp_no <> m.emp_no)
$$;
REVOKE EXECUTE ON FUNCTION public.hr_manages(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_manages(uuid, text) TO authenticated, service_role;

-- staff records
DROP POLICY IF EXISTS "hr staff read" ON public.hr_staff;
CREATE POLICY "hr staff read" ON public.hr_staff FOR SELECT TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no) OR emp_no = public.hr_my_emp(auth.uid()));

-- attendance
DROP POLICY IF EXISTS "hr att read" ON public.hr_attendance;
CREATE POLICY "hr att read" ON public.hr_attendance FOR SELECT TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no) OR emp_no = public.hr_my_emp(auth.uid()));
DROP POLICY IF EXISTS "hr att manage" ON public.hr_attendance;
CREATE POLICY "hr att manage" ON public.hr_attendance FOR ALL TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no)) WITH CHECK (public.hr_manages(auth.uid(), emp_no));

-- roster (writes stay admin-only)
DROP POLICY IF EXISTS "hr roster read" ON public.hr_roster;
CREATE POLICY "hr roster read" ON public.hr_roster FOR SELECT TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no) OR emp_no = public.hr_my_emp(auth.uid()));

-- payslips (writes stay admin-only)
DROP POLICY IF EXISTS "hr payslips read" ON public.hr_payslips;
CREATE POLICY "hr payslips read" ON public.hr_payslips FOR SELECT TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no) OR emp_no = public.hr_my_emp(auth.uid()));

-- tasks: a manager handles tasks of their reports and tasks they assigned
DROP POLICY IF EXISTS "hr tasks read" ON public.hr_tasks;
CREATE POLICY "hr tasks read" ON public.hr_tasks FOR SELECT TO authenticated
  USING (public.hr_manages(auth.uid(), assigned_to)
         OR assigned_to = public.hr_my_emp(auth.uid())
         OR (public.hr_is_manager(auth.uid()) AND assigned_by = public.hr_my_emp(auth.uid())));
DROP POLICY IF EXISTS "hr tasks manage" ON public.hr_tasks;
CREATE POLICY "hr tasks manage" ON public.hr_tasks FOR ALL TO authenticated
  USING (public.hr_manages(auth.uid(), assigned_to)
         OR (public.hr_is_manager(auth.uid()) AND assigned_by = public.hr_my_emp(auth.uid())))
  WITH CHECK (public.hr_manages(auth.uid(), assigned_to)
         OR (public.hr_is_manager(auth.uid()) AND assigned_by = public.hr_my_emp(auth.uid())));

-- leave: a manager decides requests routed to them or from their reports, never their own
DROP POLICY IF EXISTS "hr leaves read" ON public.hr_leaves;
CREATE POLICY "hr leaves read" ON public.hr_leaves FOR SELECT TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no)
         OR emp_no = public.hr_my_emp(auth.uid())
         OR alt_emp_no = public.hr_my_emp(auth.uid())
         OR (public.hr_is_manager(auth.uid()) AND reporting_manager = public.hr_my_emp(auth.uid())));
DROP POLICY IF EXISTS "hr leaves manage" ON public.hr_leaves;
CREATE POLICY "hr leaves manage" ON public.hr_leaves FOR ALL TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no)
         OR (public.hr_is_manager(auth.uid()) AND reporting_manager = public.hr_my_emp(auth.uid()) AND emp_no <> public.hr_my_emp(auth.uid())))
  WITH CHECK (public.hr_manages(auth.uid(), emp_no)
         OR (public.hr_is_manager(auth.uid()) AND reporting_manager = public.hr_my_emp(auth.uid()) AND emp_no <> public.hr_my_emp(auth.uid())));

-- trends: administrators only
CREATE OR REPLACE FUNCTION public.hr_attendance_stats(_start date, _end date)
RETURNS TABLE (present bigint, working bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FILTER (WHERE a.status = 'P'),
         count(*) FILTER (WHERE a.status NOT IN ('WO', 'H') AND NOT EXISTS (SELECT 1 FROM public.hr_holidays h WHERE h.date = a.date))
  FROM public.hr_attendance a
  WHERE a.date BETWEEN _start AND _end
    AND public.hr_is_admin(auth.uid())
$$;
