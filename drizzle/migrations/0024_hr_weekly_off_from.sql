-- WestMed Payroll System — weekly-off changes with an effective date (src/hrms/punches.js
-- weeklyOffOn). hr_staff.weekly_off stays the day used from the start (Staff Master, admins);
-- a row here changes it from effective_from onward, so earlier days keep the old weekly off.
--  • Reporting managers add / remove changes for their own staff, effective today (IST) or later,
--    not inside a finalized pay cycle. Administrators: any date.
--  • days: '' (back to the device's weekly offs) or day names, e.g. 'Wed' or 'Sat,Sun'.
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS public.hr_weekly_off (
  emp_no text NOT NULL,
  effective_from date NOT NULL,
  days text NOT NULL DEFAULT '' CHECK (days ~ '^((Mon|Tue|Wed|Thu|Fri|Sat|Sun)(,(Mon|Tue|Wed|Thu|Fri|Sat|Sun))*)?$'),
  set_by uuid DEFAULT auth.uid(),
  set_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (emp_no, effective_from)
);
ALTER TABLE public.hr_weekly_off ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hr_weekly_off FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_weekly_off TO authenticated;

DROP POLICY IF EXISTS "hr weekly off read" ON public.hr_weekly_off;
CREATE POLICY "hr weekly off read" ON public.hr_weekly_off FOR SELECT TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no) OR emp_no = public.hr_my_emp(auth.uid()));
DROP POLICY IF EXISTS "hr weekly off admin" ON public.hr_weekly_off;
CREATE POLICY "hr weekly off admin" ON public.hr_weekly_off FOR ALL TO authenticated
  USING (public.hr_is_admin(auth.uid())) WITH CHECK (public.hr_is_admin(auth.uid()));
DROP POLICY IF EXISTS "hr weekly off manager" ON public.hr_weekly_off;
CREATE POLICY "hr weekly off manager" ON public.hr_weekly_off FOR ALL TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no)
         AND effective_from >= (now() AT TIME ZONE 'Asia/Kolkata')::date
         AND NOT public.hr_cycle_locked(effective_from))
  WITH CHECK (public.hr_manages(auth.uid(), emp_no)
         AND effective_from >= (now() AT TIME ZONE 'Asia/Kolkata')::date
         AND NOT public.hr_cycle_locked(effective_from));
