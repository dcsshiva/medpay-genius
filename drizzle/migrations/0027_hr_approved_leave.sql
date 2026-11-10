-- WestMed Payroll System — approved leave set by the reporting manager (src/hrms/leaveRevoke.js).
--  • A reporting manager (or an administrator) can turn an absence into approved leave: a request
--    of type 'AL', created already Approved, and the attendance day marked 'AL' — a paid leave day
--    that does not use the staff member's CL. It can be withdrawn like any approval (migration 0022).
--  • Only for days in the running pay cycle or the previous one, up to today, never in a finalized
--    pay cycle (the same window as withdrawing). Who may write it is the existing RLS: managers for
--    their own reports, administrators for everyone.
-- Safe to run more than once.

ALTER TABLE public.hr_attendance DROP CONSTRAINT IF EXISTS hr_attendance_status_check;
ALTER TABLE public.hr_attendance ADD CONSTRAINT hr_attendance_status_check
  CHECK (status IN ('P', 'A', 'WO', 'CL', 'H', 'AL'));

ALTER TABLE public.hr_leaves DROP CONSTRAINT IF EXISTS hr_leaves_type_check;
ALTER TABLE public.hr_leaves ADD CONSTRAINT hr_leaves_type_check
  CHECK (type IN ('CL', 'Permission', 'AL'));

CREATE OR REPLACE FUNCTION public.hr_leaves_al_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF NEW.type = 'AL' AND (TG_OP = 'INSERT' OR OLD.type IS DISTINCT FROM 'AL' OR OLD.date IS DISTINCT FROM NEW.date) THEN
    IF NEW.status <> 'Approved' THEN
      RAISE EXCEPTION 'Approved leave is created already approved (request %).', NEW.id;
    END IF;
    IF NEW.date > today OR NEW.date < public.hr_cycle_start(public.hr_cycle_start(today) - 1) THEN
      RAISE EXCEPTION 'Approved leave can only be set for a day in the running or previous pay cycle, up to today (%).', NEW.date;
    END IF;
    IF public.hr_cycle_locked(NEW.date) THEN
      RAISE EXCEPTION 'Salary for the pay cycle containing % is finalized — reopen it first.', NEW.date;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hr_leaves_al_guard ON public.hr_leaves;
CREATE TRIGGER hr_leaves_al_guard BEFORE INSERT OR UPDATE ON public.hr_leaves
  FOR EACH ROW EXECUTE FUNCTION public.hr_leaves_al_guard();
