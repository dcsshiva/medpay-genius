-- WestMed Payroll System — shift plan export / import (Shift Planner).
--  • Reporting managers may plan shifts for their own staff, from today onward, while the
--    pay cycle is not finalized. Administrators keep full access ("hr roster admin").
--  • Every planned cell remembers when and by whom it last changed (conflict check on import),
--    and every change is written to hr_roster_log (administrators can read it).
--  • shift_code 'WO' = planned weekly off for that date (read by src/hrms/punches.js).
-- Safe to run more than once.

ALTER TABLE public.hr_roster ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.hr_roster ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE TABLE IF NOT EXISTS public.hr_roster_log (
  id bigserial PRIMARY KEY,
  emp_no text NOT NULL,
  date date NOT NULL,
  old_code text,
  new_code text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_roster_log_emp_date ON public.hr_roster_log (emp_no, date);
ALTER TABLE public.hr_roster_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hr_roster_log FROM anon;
DROP POLICY IF EXISTS "hr roster log admin read" ON public.hr_roster_log;
CREATE POLICY "hr roster log admin read" ON public.hr_roster_log FOR SELECT TO authenticated
  USING (public.hr_is_admin(auth.uid()));

-- stamp who/when on a real change (re-saving the same shift keeps the old stamp)
CREATE OR REPLACE FUNCTION public.hr_roster_stamp() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.shift_code IS NOT DISTINCT FROM OLD.shift_code THEN
    NEW.updated_at := OLD.updated_at;
    NEW.updated_by := OLD.updated_by;
  ELSE
    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hr_roster_stamp ON public.hr_roster;
CREATE TRIGGER hr_roster_stamp BEFORE INSERT OR UPDATE ON public.hr_roster
  FOR EACH ROW EXECUTE FUNCTION public.hr_roster_stamp();

CREATE OR REPLACE FUNCTION public.hr_roster_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.hr_roster_log (emp_no, date, old_code, new_code, changed_by)
      VALUES (OLD.emp_no, OLD.date, OLD.shift_code, NULL, auth.uid());
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.shift_code IS DISTINCT FROM OLD.shift_code THEN
    INSERT INTO public.hr_roster_log (emp_no, date, old_code, new_code, changed_by)
      VALUES (NEW.emp_no, NEW.date, CASE WHEN TG_OP = 'UPDATE' THEN OLD.shift_code END, NEW.shift_code, auth.uid());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hr_roster_audit ON public.hr_roster;
CREATE TRIGGER hr_roster_audit AFTER INSERT OR UPDATE OR DELETE ON public.hr_roster
  FOR EACH ROW EXECUTE FUNCTION public.hr_roster_audit();

-- a finalized pay cycle is locked for planning
CREATE OR REPLACE FUNCTION public.hr_cycle_locked(_date date) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.hr_payroll_runs r WHERE _date BETWEEN r.cycle_start AND r.cycle_end)
$$;

DROP POLICY IF EXISTS "hr roster manager write" ON public.hr_roster;
CREATE POLICY "hr roster manager write" ON public.hr_roster FOR ALL TO authenticated
  USING (public.hr_manages(auth.uid(), emp_no)
         AND date >= (now() AT TIME ZONE 'Asia/Kolkata')::date
         AND NOT public.hr_cycle_locked(date))
  WITH CHECK (public.hr_manages(auth.uid(), emp_no)
         AND date >= (now() AT TIME ZONE 'Asia/Kolkata')::date
         AND NOT public.hr_cycle_locked(date));
