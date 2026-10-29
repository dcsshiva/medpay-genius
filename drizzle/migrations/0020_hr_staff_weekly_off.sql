-- WestMed Payroll System — each staff member's weekly-off day(s), set in Staff Master.
-- '' = not set (the biometric device's weekly offs are used as they are);
-- otherwise day names, e.g. 'Wed' or 'Sat,Sun'. Read by src/hrms/punches.js.
-- Safe to run more than once.
ALTER TABLE public.hr_staff ADD COLUMN IF NOT EXISTS weekly_off text NOT NULL DEFAULT '';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_staff_weekly_off_days') THEN
    ALTER TABLE public.hr_staff ADD CONSTRAINT hr_staff_weekly_off_days
      CHECK (weekly_off ~ '^((Mon|Tue|Wed|Thu|Fri|Sat|Sun)(,(Mon|Tue|Wed|Thu|Fri|Sat|Sun))*)?$');
  END IF;
END $$;
