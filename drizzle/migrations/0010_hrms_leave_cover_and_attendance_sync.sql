-- HRMS Phase 1 · Step 4 — Leave & Permission upgrade
-- 1. Covering (alternative) employee on every leave / permission application
-- 2. Approved leave is written into staff_daily_activities; reverted if the approval is withdrawn

ALTER TABLE public.leave_permission_applications
  ADD COLUMN IF NOT EXISTS covering_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lpa_covering_staff_idx ON public.leave_permission_applications (covering_staff_id);

-- Remember which attendance rows were created from a leave application
ALTER TABLE public.staff_daily_activities
  ADD COLUMN IF NOT EXISTS leave_application_id uuid
    REFERENCES public.leave_permission_applications(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.sync_leave_to_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d date;
  new_status public.attendance_status;
BEGIN
  IF NEW.application_type <> 'leave' OR NEW.leave_start_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Became approved → mark each day as leave (never overwrite a real punch)
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    new_status := CASE WHEN COALESCE(NEW.is_half_day, false) THEN 'half_day' ELSE 'leave' END;
    FOR d IN SELECT generate_series(NEW.leave_start_date, COALESCE(NEW.leave_end_date, NEW.leave_start_date), interval '1 day')::date
    LOOP
      INSERT INTO public.staff_daily_activities
        (staff_id, activity_date, attendance_status, special_notes, leave_application_id)
      VALUES
        (NEW.applicant_id, d, new_status, 'Approved leave', NEW.id)
      ON CONFLICT (staff_id, activity_date) DO UPDATE
        SET attendance_status   = EXCLUDED.attendance_status,
            special_notes       = EXCLUDED.special_notes,
            leave_application_id = EXCLUDED.leave_application_id
        WHERE public.staff_daily_activities.attendance_status IN ('absent', 'leave', 'half_day')
          AND public.staff_daily_activities.shift_start_time IS NULL;
    END LOOP;

  -- Approval withdrawn (cancelled / revoked / rejected after approval) → remove the leave rows it created
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    DELETE FROM public.staff_daily_activities
    WHERE leave_application_id = NEW.id
      AND attendance_status IN ('leave', 'half_day')
      AND shift_start_time IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_leave_to_attendance ON public.leave_permission_applications;
CREATE TRIGGER trg_sync_leave_to_attendance
AFTER INSERT OR UPDATE OF status ON public.leave_permission_applications
FOR EACH ROW EXECUTE FUNCTION public.sync_leave_to_attendance();

-- Colleagues an applicant may pick as cover: active staff in the same work branch
-- (or everyone active when the applicant has no branch). SECURITY DEFINER so ordinary
-- staff can see the list without broad read access on staff.
CREATE OR REPLACE FUNCTION public.get_cover_candidates(_applicant_id uuid)
RETURNS TABLE (id uuid, full_name text, staff_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.full_name, s.staff_code
  FROM public.staff s
  WHERE s.is_active = true
    AND s.id <> _applicant_id
    AND s.role::text NOT IN ('doctor')
    AND (
      (SELECT a.work_branch_id FROM public.staff a WHERE a.id = _applicant_id) IS NULL
      OR s.work_branch_id = (SELECT a.work_branch_id FROM public.staff a WHERE a.id = _applicant_id)
    )
  ORDER BY s.full_name
$$;

GRANT EXECUTE ON FUNCTION public.get_cover_candidates(uuid) TO authenticated;
