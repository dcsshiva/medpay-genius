-- WestMed Payroll System — PF and ESI are off unless an administrator turns them on per staff member.
-- New staff records default to PF/ESI not applicable. Safe to run more than once.
-- (On 2026-10-12 every existing hr_staff row was also set to pf_applicable = false, esi_applicable = false
--  directly on the live database; that one-off update is deliberately not repeated here so re-running this
--  file can never undo PF/ESI that an administrator has since switched back on.)
ALTER TABLE public.hr_staff
  ALTER COLUMN pf_applicable SET DEFAULT false,
  ALTER COLUMN esi_applicable SET DEFAULT false;
