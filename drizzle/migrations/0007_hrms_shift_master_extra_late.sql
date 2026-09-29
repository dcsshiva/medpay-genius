-- HRMS Phase 1 · Step 1 — Shift Master upgrade
-- Adds shift code/letter and the "extra-late" allowance used by the HRMS payroll engine:
--   grace_minutes             = always forgiven
--   extra_late_minutes        = an additional band forgiven up to extra_late_max_per_month times per pay cycle
--   beyond that               = the FULL late duration is charged (permission pool first, then pay)

-- Shared helper: anyone who may manage HR data (admin / manager / super_admin / staff_manager)
CREATE OR REPLACE FUNCTION public.is_hr_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_designation(_user_id, 'admin')
      OR public.has_designation(_user_id, 'manager')
      OR public.has_designation(_user_id, 'super_admin')
      OR public.is_staff_manager(_user_id)
$$;

ALTER TABLE public.shift_definitions
  ADD COLUMN IF NOT EXISTS shift_code text,
  ADD COLUMN IF NOT EXISTS shift_letter text,
  ADD COLUMN IF NOT EXISTS extra_late_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS extra_late_max_per_month integer NOT NULL DEFAULT 3;

CREATE UNIQUE INDEX IF NOT EXISTS shift_definitions_shift_code_key
  ON public.shift_definitions (shift_code) WHERE shift_code IS NOT NULL;

-- Seed the three standard shifts on a fresh database (no-op if shifts already exist)
INSERT INTO public.shift_definitions
  (shift_code, shift_letter, shift_name, start_time, end_time, window_from, window_to,
   grace_minutes, extra_late_minutes, extra_late_max_per_month, sort_order)
SELECT * FROM (VALUES
  ('S1', 'G', 'General Shift', '09:00'::time, '18:00'::time, '07:00'::time, '12:59'::time, 15, 15, 3, 1),
  ('S2', 'S', 'Second Shift',  '14:00'::time, '23:00'::time, '13:00'::time, '18:59'::time, 15, 15, 3, 2),
  ('S3', 'N', 'Night Shift',   '20:00'::time, '05:00'::time, '19:00'::time, '02:00'::time, 15, 15, 3, 3)
) AS v(shift_code, shift_letter, shift_name, start_time, end_time, window_from, window_to,
       grace_minutes, extra_late_minutes, extra_late_max_per_month, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.shift_definitions);

-- Back-fill codes for any pre-existing rows
UPDATE public.shift_definitions sd
SET shift_code = 'S' || sub.rn
FROM (SELECT id, row_number() OVER (ORDER BY sort_order, created_at) AS rn
      FROM public.shift_definitions WHERE shift_code IS NULL) sub
WHERE sd.id = sub.id
  AND NOT EXISTS (SELECT 1 FROM public.shift_definitions x WHERE x.shift_code = 'S' || sub.rn);
