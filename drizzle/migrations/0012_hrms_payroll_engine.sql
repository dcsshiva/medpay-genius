-- HRMS Phase 1 · Step 6 — Payroll engine
-- payroll_settings (single row) + holidays + shift_roster, and extra columns on staff_payroll.
-- The Holiday Calendar, Payroll Settings and Shift Planner SCREENS come in Phase 2;
-- the tables are created now because the payroll engine reads them.

-- 1) Payroll settings — indicative defaults, confirm statutory rates with your accountant
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_start_day integer NOT NULL DEFAULT 25 CHECK (cycle_start_day BETWEEN 1 AND 28),
  pf_enabled boolean NOT NULL DEFAULT true,
  pf_rate numeric(5,2) NOT NULL DEFAULT 12,
  pf_on_basic boolean NOT NULL DEFAULT true,        -- PF on basic salary (true) or on gross (false)
  esi_enabled boolean NOT NULL DEFAULT true,
  esi_rate numeric(5,2) NOT NULL DEFAULT 0.75,
  esi_ceiling numeric(12,2) NOT NULL DEFAULT 21000,
  pt_enabled boolean NOT NULL DEFAULT true,
  pt_slabs jsonb NOT NULL DEFAULT '[
    {"upto":21000,"amount":0},{"upto":30000,"amount":135},{"upto":45000,"amount":315},
    {"upto":60000,"amount":690},{"upto":75000,"amount":1025},{"upto":99999999,"amount":1250}
  ]'::jsonb,
  ot_enabled boolean NOT NULL DEFAULT true,
  ot_multiplier numeric(4,2) NOT NULL DEFAULT 1.5,
  ot_grace_minutes integer NOT NULL DEFAULT 15,
  consolidated_late_minutes integer NOT NULL DEFAULT 480,
  weekly_off_day integer DEFAULT 0 CHECK (weekly_off_day IS NULL OR weekly_off_day BETWEEN 0 AND 6),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.payroll_settings (cycle_start_day)
SELECT 25 WHERE NOT EXISTS (SELECT 1 FROM public.payroll_settings);

GRANT SELECT, INSERT, UPDATE ON public.payroll_settings TO authenticated;
GRANT ALL ON public.payroll_settings TO service_role;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read payroll settings"
ON public.payroll_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR admins manage payroll settings"
ON public.payroll_settings FOR ALL TO authenticated
USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

-- 2) Holiday calendar
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL,
  holiday_name text NOT NULL,
  branch_id uuid REFERENCES public.branches_master(id) ON DELETE CASCADE,  -- NULL = all branches
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS holidays_date_branch_key
  ON public.holidays (holiday_date, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO authenticated;
GRANT ALL ON public.holidays TO service_role;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read holidays"
ON public.holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR admins manage holidays"
ON public.holidays FOR ALL TO authenticated
USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));

-- 3) Shift roster: per-staff, per-date shift override (written by the Shift Planner)
CREATE TABLE IF NOT EXISTS public.shift_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  roster_date date NOT NULL,
  shift_id uuid NOT NULL REFERENCES public.shift_definitions(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, roster_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_roster TO authenticated;
GRANT ALL ON public.shift_roster TO service_role;
ALTER TABLE public.shift_roster ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR admins manage roster"
ON public.shift_roster FOR ALL TO authenticated
USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));
CREATE POLICY "Staff read own roster"
ON public.shift_roster FOR SELECT TO authenticated
USING (staff_id IN (SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid()));

-- 4) Payroll result columns
ALTER TABLE public.staff_payroll
  ADD COLUMN IF NOT EXISTS cycle_start date,
  ADD COLUMN IF NOT EXISTS cycle_end date,
  ADD COLUMN IF NOT EXISTS lop_days numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cl_used numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS permission_used_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pf_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS esi_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pt_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS statutory_deductions numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ledger jsonb;          -- day-by-day rows used by the Shift Ledger / payslip

-- Upsert key used by the app (safe if it already exists)
CREATE UNIQUE INDEX IF NOT EXISTS staff_payroll_staff_month_key
  ON public.staff_payroll (staff_id, payroll_month);

-- Staff may read their own payslips
DROP POLICY IF EXISTS "Staff read own payroll" ON public.staff_payroll;
CREATE POLICY "Staff read own payroll"
ON public.staff_payroll FOR SELECT TO authenticated
USING (staff_id IN (SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "HR admins manage payroll" ON public.staff_payroll;
CREATE POLICY "HR admins manage payroll"
ON public.staff_payroll FOR ALL TO authenticated
USING (public.is_hr_admin(auth.uid())) WITH CHECK (public.is_hr_admin(auth.uid()));
