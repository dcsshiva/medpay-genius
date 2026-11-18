-- Selvantra HRMS — double shifts. hr_shifts.pay_days: how many days' attendance one planned day on this
-- shift counts as (1 = normal; 2 = a double shift such as MS + AS, AS + NS or NS + MS — the extra day is
-- paid at the cycle's per-day rate; see src/hrms/lateRule.js). Double shifts are used only where the
-- Shift Planner has them, never guessed from punch times.
-- Also adds the three double shifts for the MS / AS / NS departments (Nursing, Laboratory, Radiology,
-- OT Technician). Safe to run more than once.
ALTER TABLE public.hr_shifts ADD COLUMN IF NOT EXISTS pay_days numeric NOT NULL DEFAULT 1;

INSERT INTO public.hr_shifts (code, name, letter, start_time, end_time, allowed_late_min, allowed_extra_late_min,
                              extra_late_max_per_month, sort_order, active, allowed_departments, pay_days)
SELECT v.code, v.name, v.letter, v.st, v.en, 10, 10, 3, v.ord, true, ARRAY['DPT1','DPT3','DPT4','DPT7'], 2
  FROM (VALUES
    ('S14', 'Morning + Afternoon (MS + AS)', 'MA', '08:00', '20:00', 13),
    ('S15', 'Afternoon + Night (AS + NS)',   'AN', '13:00', '08:00', 14),
    ('S16', 'Night + Morning (NS + MS)',     'NM', '20:00', '15:00', 15)) AS v(code, name, letter, st, en, ord)
 WHERE NOT EXISTS (SELECT 1 FROM public.hr_shifts s WHERE s.code = v.code OR s.letter = v.letter);
