-- WestMed Payroll System — the holiday lists are readable only by organisation members, like every
-- other shared list (is_org_member: administrators, active staff, old-app staff and designated users).
-- Before this any signed-in account could read them (USING (true)).
--  • hr_holidays: the current app (Holiday Calendar)
--  • holidays:    the previous screens (/classic)
-- Writing is unchanged (administrators only). Safe to run more than once.

DROP POLICY IF EXISTS "hr read" ON public.hr_holidays;
CREATE POLICY "hr read" ON public.hr_holidays FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid()));
REVOKE ALL ON public.hr_holidays FROM anon;

DO $$
BEGIN
  IF to_regclass('public.holidays') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated read holidays" ON public.holidays';
    EXECUTE 'CREATE POLICY "Authenticated read holidays" ON public.holidays FOR SELECT TO authenticated USING (public.is_org_member(auth.uid()))';
    EXECUTE 'REVOKE ALL ON public.holidays FROM anon';
  END IF;
END $$;
