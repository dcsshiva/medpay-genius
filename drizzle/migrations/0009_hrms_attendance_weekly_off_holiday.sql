-- HRMS Phase 1 · Step 3 — extra attendance statuses used by the payroll engine
--   weekly_off : scheduled day off (no pay impact)
--   holiday    : declared holiday (no pay impact)
-- Existing 'leave' is treated as a CL day by the payroll engine.
ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'weekly_off';
ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'holiday';
