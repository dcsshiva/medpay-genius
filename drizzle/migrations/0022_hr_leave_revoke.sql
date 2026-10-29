-- WestMed Payroll System — withdrawing an approved Casual Leave / Permission request.
--  • New status 'Revoked' ("Approval withdrawn"), with who / when / why.
--  • prev_attendance: the attendance day as it was when a CL was approved (approval marks the
--    day CL and clears its punches), so withdrawing puts it back (src/hrms/leaveRevoke.js).
--  • Guard for everyone (managers and administrators): an approved request can only become
--    'Revoked', only when dated in the running pay cycle or the one before (or later), and not in
--    a finalized pay cycle; a withdrawn request stays withdrawn.
-- Safe to run more than once.

ALTER TABLE public.hr_leaves DROP CONSTRAINT IF EXISTS hr_leaves_status_check;
ALTER TABLE public.hr_leaves ADD CONSTRAINT hr_leaves_status_check
  CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Revoked'));
ALTER TABLE public.hr_leaves ADD COLUMN IF NOT EXISTS revoked_by text;
ALTER TABLE public.hr_leaves ADD COLUMN IF NOT EXISTS revoked_on date;
ALTER TABLE public.hr_leaves ADD COLUMN IF NOT EXISTS revoke_reason text;
ALTER TABLE public.hr_leaves ADD COLUMN IF NOT EXISTS prev_attendance jsonb;

-- first day of the pay cycle containing _d (Payroll Settings → cycle start day, capped 1..28)
CREATE OR REPLACE FUNCTION public.hr_cycle_start(_d date) RETURNS date
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE sd int;
BEGIN
  SELECT LEAST(GREATEST(COALESCE(NULLIF(payroll->>'cycleStartDay', '')::int, 25), 1), 28) INTO sd FROM public.hr_settings WHERE id = 1;
  sd := COALESCE(sd, 25);
  IF sd <= 1 THEN RETURN date_trunc('month', _d)::date; END IF;
  IF extract(day FROM _d) >= sd THEN RETURN make_date(extract(year FROM _d)::int, extract(month FROM _d)::int, sd); END IF;
  RETURN (make_date(extract(year FROM _d)::int, extract(month FROM _d)::int, sd) - interval '1 month')::date;
END $$;

CREATE OR REPLACE FUNCTION public.hr_leaves_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF OLD.status = 'Revoked' AND NEW.status IS DISTINCT FROM 'Revoked' THEN
    RAISE EXCEPTION 'A withdrawn approval cannot be changed again (request %).', OLD.id;
  END IF;
  IF OLD.status = 'Approved' AND NEW.status IS DISTINCT FROM 'Approved' THEN
    IF NEW.status IS DISTINCT FROM 'Revoked' THEN
      RAISE EXCEPTION 'An approved request can only be withdrawn (request %).', OLD.id;
    END IF;
    IF NEW.date < public.hr_cycle_start(public.hr_cycle_start(today) - 1) THEN
      RAISE EXCEPTION 'Only requests in the running or previous pay cycle can be withdrawn (request %).', OLD.id;
    END IF;
    IF public.hr_cycle_locked(NEW.date) THEN
      RAISE EXCEPTION 'Salary for the pay cycle containing % is finalized — reopen it first (request %).', NEW.date, OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hr_leaves_guard ON public.hr_leaves;
CREATE TRIGGER hr_leaves_guard BEFORE UPDATE ON public.hr_leaves
  FOR EACH ROW EXECUTE FUNCTION public.hr_leaves_guard();

-- the app asks "is this pay cycle finalized?" before withdrawing (hr_cycle_locked: migration 0021)
GRANT EXECUTE ON FUNCTION public.hr_cycle_locked(date) TO authenticated;
