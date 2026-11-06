-- WestMed Payroll System — staff who punch at more than one unit (src/hrms/multiUnit.js).
--  • hr_staff.multi_unit: set in Staff Master; the attendance import then checks these staff for
--    days that still need another unit's file.
--  • hr_import_log: one row per attendance import — which unit's file (worked out from its staff;
--    null when the file mixes units) and which dates it covered.
-- Safe to run more than once.
ALTER TABLE public.hr_staff ADD COLUMN IF NOT EXISTS multi_unit boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.hr_import_log (
  id bigserial PRIMARY KEY,
  unit_code text,
  date_from date NOT NULL,
  date_to date NOT NULL,
  staff_count integer NOT NULL DEFAULT 0,
  record_count integer NOT NULL DEFAULT 0,
  imported_by text,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_import_log_dates ON public.hr_import_log (date_from, date_to);
ALTER TABLE public.hr_import_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hr_import_log FROM anon;
GRANT SELECT, INSERT ON public.hr_import_log TO authenticated;
GRANT USAGE ON SEQUENCE public.hr_import_log_id_seq TO authenticated;
DROP POLICY IF EXISTS "hr import log admin" ON public.hr_import_log;
CREATE POLICY "hr import log admin" ON public.hr_import_log FOR ALL TO authenticated
  USING (public.hr_is_admin(auth.uid())) WITH CHECK (public.hr_is_admin(auth.uid()));
