-- WestMed Payroll System · Phase 2
--   1. Lock (finalize) a pay cycle: payslips are frozen so later edits can't change paid salaries
--   2. Bank details on staff for the salary bank file
--   3. Helpers for month-on-month trends
-- Safe to run more than once.

-- ───────────────────────── finalized cycles & frozen payslips ─────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_payroll_runs (
  cycle_key text PRIMARY KEY,               -- 'YYYY-MM' of the month the cycle ends in
  cycle_start date NOT NULL,
  cycle_end date NOT NULL,
  label text NOT NULL,
  finalized_at timestamptz NOT NULL DEFAULT now(),
  finalized_by text NOT NULL DEFAULT '',
  staff_count integer NOT NULL DEFAULT 0,
  gross numeric(14,2) NOT NULL DEFAULT 0,
  net numeric(14,2) NOT NULL DEFAULT 0,
  settings jsonb                            -- payroll settings in force when finalized
);

CREATE TABLE IF NOT EXISTS public.hr_payslips (
  cycle_key text NOT NULL REFERENCES public.hr_payroll_runs(cycle_key) ON DELETE CASCADE,
  emp_no text NOT NULL,
  name text NOT NULL DEFAULT '',
  unit_code text,
  gross numeric(12,2) NOT NULL DEFAULT 0,
  lop_deduction numeric(12,2) NOT NULL DEFAULT 0,
  pf numeric(12,2) NOT NULL DEFAULT 0,
  esi numeric(12,2) NOT NULL DEFAULT 0,
  pt numeric(12,2) NOT NULL DEFAULT 0,
  other_deduction numeric(12,2) NOT NULL DEFAULT 0,
  ot_pay numeric(12,2) NOT NULL DEFAULT 0,
  net numeric(12,2) NOT NULL DEFAULT 0,
  present_days integer NOT NULL DEFAULT 0,
  late_days integer NOT NULL DEFAULT 0,
  working_days integer NOT NULL DEFAULT 0,  -- cycle days on record minus weekly offs & holidays
  summary jsonb NOT NULL,                   -- engine summary (exact figures)
  rows jsonb NOT NULL,                      -- day-by-day cycle sheet
  PRIMARY KEY (cycle_key, emp_no)
);
CREATE INDEX IF NOT EXISTS hr_payslips_emp_idx ON public.hr_payslips (emp_no);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_payroll_runs, public.hr_payslips TO authenticated;
GRANT ALL ON public.hr_payroll_runs, public.hr_payslips TO service_role;
ALTER TABLE public.hr_payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr runs read" ON public.hr_payroll_runs;
CREATE POLICY "hr runs read" ON public.hr_payroll_runs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "hr runs admin" ON public.hr_payroll_runs;
CREATE POLICY "hr runs admin" ON public.hr_payroll_runs FOR ALL TO authenticated
  USING (public.hr_is_admin(auth.uid())) WITH CHECK (public.hr_is_admin(auth.uid()));

DROP POLICY IF EXISTS "hr payslips read" ON public.hr_payslips;
CREATE POLICY "hr payslips read" ON public.hr_payslips FOR SELECT TO authenticated
  USING (public.hr_can_manage(auth.uid()) OR emp_no = public.hr_my_emp(auth.uid()));
DROP POLICY IF EXISTS "hr payslips admin" ON public.hr_payslips;
CREATE POLICY "hr payslips admin" ON public.hr_payslips FOR ALL TO authenticated
  USING (public.hr_is_admin(auth.uid())) WITH CHECK (public.hr_is_admin(auth.uid()));

-- ───────────────────────── bank details (salary bank file) ─────────────────────────
ALTER TABLE public.hr_staff
  ADD COLUMN IF NOT EXISTS bank_account_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account_no text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_ifsc text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_name text NOT NULL DEFAULT '';

-- Payroll settings: company bank account used as the debit account in the bank file
UPDATE public.hr_settings
SET payroll = payroll || jsonb_build_object('bank', COALESCE(payroll->'bank', '{"debitAccount":"","format":"generic"}'::jsonb))
WHERE id = 1;

-- ───────────────────────── trends: attendance per cycle ─────────────────────────
-- Present / working-day counts between two dates (working = not weekly off / holiday)
CREATE OR REPLACE FUNCTION public.hr_attendance_stats(_start date, _end date)
RETURNS TABLE (present bigint, working bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FILTER (WHERE a.status = 'P'),
         count(*) FILTER (WHERE a.status NOT IN ('WO', 'H') AND NOT EXISTS (SELECT 1 FROM public.hr_holidays h WHERE h.date = a.date))
  FROM public.hr_attendance a
  WHERE a.date BETWEEN _start AND _end
    AND public.hr_can_manage(auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.hr_attendance_stats(date, date) TO authenticated;
