-- HRMS Phase 1 · Step 2 — Staff Master HR fields
-- Gross pay stays in staff_salary_structure (basic + HRA + conveyance + medical + other).
-- staff.branch_name remains the BANK branch; the work location is work_branch_id → branches_master.

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS reporting_manager_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_branch_id uuid REFERENCES public.branches_master(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_shift_id uuid REFERENCES public.shift_definitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS monthly_cl numeric(4,1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS monthly_permission_hours numeric(4,1) NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS pf_applicable boolean NOT NULL DEFAULT true,
  -- NULL = automatic (ESI applies when gross <= ESI ceiling in Payroll Settings)
  ADD COLUMN IF NOT EXISTS esi_applicable boolean,
  ADD COLUMN IF NOT EXISTS ot_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_deduction numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS date_of_joining date,
  ADD COLUMN IF NOT EXISTS address text;

CREATE INDEX IF NOT EXISTS staff_reporting_manager_idx ON public.staff (reporting_manager_id);
CREATE INDEX IF NOT EXISTS staff_work_branch_idx ON public.staff (work_branch_id);

-- Branch / unit transfer history
CREATE TABLE IF NOT EXISTS public.staff_branch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches_master(id) ON DELETE SET NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_branch_history_staff_idx ON public.staff_branch_history (staff_id, effective_from DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_branch_history TO authenticated;
GRANT ALL ON public.staff_branch_history TO service_role;
ALTER TABLE public.staff_branch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR admins manage branch history"
ON public.staff_branch_history FOR ALL TO authenticated
USING (public.is_hr_admin(auth.uid()))
WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE POLICY "Staff read own branch history"
ON public.staff_branch_history FOR SELECT TO authenticated
USING (staff_id IN (SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid()));

-- Staff managers must be able to maintain the new HR columns on staff
DROP POLICY IF EXISTS "HR admins update staff HR fields" ON public.staff;
CREATE POLICY "HR admins update staff HR fields"
ON public.staff FOR UPDATE TO authenticated
USING (public.is_hr_admin(auth.uid()))
WITH CHECK (public.is_hr_admin(auth.uid()));
