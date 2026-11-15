-- WestMed Payroll System — the previous screens' (/classic) settings tables are readable only by
-- organisation members (is_org_member), like every other shared list. Before this:
--  • quick_access_config: readable by anyone, even signed out (policy for "public", USING (true))
--  • shift_definitions, sidebar_menu_config: readable by any signed-in account (USING (true))
-- Signed-out (anon) access is removed. Who may change them (administrators / managers) is unchanged.
-- Safe to run more than once.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
      ('quick_access_config', 'Anyone authenticated can read quick access config'),
      ('shift_definitions',   'Authenticated can read shifts'),
      ('sidebar_menu_config', 'Authenticated users can read menu config')) AS v(tbl, pol) LOOP
    IF to_regclass('public.' || r.tbl) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_org_member(auth.uid()))', r.pol, r.tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.tbl);
  END LOOP;
END $$;
