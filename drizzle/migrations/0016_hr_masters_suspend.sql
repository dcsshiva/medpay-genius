-- WestMed Payroll System — masters are suspended instead of removed
-- A suspended master stays on existing staff / records but is not offered for new choices.
-- Safe to run more than once.
ALTER TABLE public.hr_units          ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.hr_departments    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.hr_designations   ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.hr_shifts         ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.hr_holidays       ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.hr_task_templates ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Staff directory (used by staff-side screens) only lists active staff — unchanged; admins read hr_staff directly.
