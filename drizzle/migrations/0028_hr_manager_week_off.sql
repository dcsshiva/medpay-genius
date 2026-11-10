-- WestMed Payroll System — the reporting manager turns an absence into a week off.
--  • Same flow as approved leave (migration 0027): a request of type 'WO', created already Approved,
--    for a day in the running or previous pay cycle, up to today, never in a finalized cycle.
--  • The effect is a planned weekly off on that day in the Shift Planner (hr_roster 'WO'), which the
--    attendance rules already read as a weekly off (normalizePunches, plan rule 6). Withdrawing the
--    request removes it again.
--  • Managers could only plan from today onward (migration 0021). They may now also set — and remove —
--    a 'WO' on a past day in that window for their own staff; other past shifts stay admin-only.
-- Safe to run more than once.

ALTER TABLE public.hr_leaves DROP CONSTRAINT IF EXISTS hr_leaves_type_check;
ALTER TABLE public.hr_leaves ADD CONSTRAINT hr_leaves_type_check
  CHECK (type IN ('CL', 'Permission', 'AL', 'WO'));

CREATE OR REPLACE FUNCTION public.hr_leaves_al_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF NEW.type IN ('AL', 'WO') AND (TG_OP = 'INSERT' OR OLD.type IS DISTINCT FROM NEW.type OR OLD.date IS DISTINCT FROM NEW.date) THEN
    IF TG_OP = 'INSERT' AND NEW.status <> 'Approved' THEN
      RAISE EXCEPTION 'Approved leave / week off is created already approved (request %).', NEW.id;
    END IF;
    IF NEW.date > today OR NEW.date < public.hr_cycle_start(public.hr_cycle_start(today) - 1) THEN
      RAISE EXCEPTION 'Approved leave / week off can only be set for a day in the running or previous pay cycle, up to today (%).', NEW.date;
    END IF;
    IF public.hr_cycle_locked(NEW.date) THEN
      RAISE EXCEPTION 'Salary for the pay cycle containing % is finalized — reopen it first.', NEW.date;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- past days in the window: managers may only put a WO there, or take their WO away
DROP POLICY IF EXISTS "hr roster manager past wo insert" ON public.hr_roster;
CREATE POLICY "hr roster manager past wo insert" ON public.hr_roster FOR INSERT TO authenticated
  WITH CHECK (public.hr_manages(auth.uid(), emp_no) AND shift_code = 'WO'
         AND date < (now() AT TIME ZONE 'Asia/Kolkata')::date
         AND date >= public.hr_cycle_start(public.hr_cycle_start((now() AT TIME ZONE 'Asia/Kolkata')::date) - 1)
         AND NOT public.hr_cycle_locked(date));
DROP POLICY IF EXISTS "hr roster manager past wo update" ON public.hr_roster;
CREATE POLICY "hr roster manager past wo update" ON public.hr_roster FOR UPDATE TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no)
         AND date < (now() AT TIME ZONE 'Asia/Kolkata')::date
         AND date >= public.hr_cycle_start(public.hr_cycle_start((now() AT TIME ZONE 'Asia/Kolkata')::date) - 1)
         AND NOT public.hr_cycle_locked(date))
  WITH CHECK (public.hr_manages(auth.uid(), emp_no) AND shift_code = 'WO'
         AND date < (now() AT TIME ZONE 'Asia/Kolkata')::date
         AND date >= public.hr_cycle_start(public.hr_cycle_start((now() AT TIME ZONE 'Asia/Kolkata')::date) - 1)
         AND NOT public.hr_cycle_locked(date));
DROP POLICY IF EXISTS "hr roster manager past wo delete" ON public.hr_roster;
CREATE POLICY "hr roster manager past wo delete" ON public.hr_roster FOR DELETE TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no) AND shift_code = 'WO'
         AND date < (now() AT TIME ZONE 'Asia/Kolkata')::date
         AND date >= public.hr_cycle_start(public.hr_cycle_start((now() AT TIME ZONE 'Asia/Kolkata')::date) - 1)
         AND NOT public.hr_cycle_locked(date));
