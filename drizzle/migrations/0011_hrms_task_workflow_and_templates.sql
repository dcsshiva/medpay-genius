-- HRMS Phase 1 · Step 5 — Task workflow + templates
-- Flow:  pending (Open) ──staff──▶ accepted ──staff──▶ review ──manager──▶ completed (Closed)
--                      └─staff──▶ rejected ──manager──▶ re-assigned (pending)
--        review ──manager "Reopen"──▶ accepted
-- Legacy 'in_progress' is treated like 'accepted' in the app.

ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'review';

CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  default_priority text NOT NULL DEFAULT 'medium',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_templates TO authenticated;
GRANT ALL ON public.task_templates TO service_role;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read task templates"
ON public.task_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR admins manage task templates"
ON public.task_templates FOR ALL TO authenticated
USING (public.is_hr_admin(auth.uid()))
WITH CHECK (public.is_hr_admin(auth.uid()));

CREATE TRIGGER update_task_templates_updated_at
BEFORE UPDATE ON public.task_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.task_templates (title, description, default_priority, display_order)
SELECT * FROM (VALUES
  ('Sanitize OT / ward equipment', 'Sanitize and log all operation theatre / ward equipment per the standard checklist.', 'high', 1),
  ('Inventory count', 'Physically count stock and reconcile against the system quantity; report discrepancies.', 'medium', 2),
  ('CCTV maintenance check', 'Verify every CCTV camera is powered, aligned and recording; report any faults.', 'medium', 3),
  ('Monthly stock audit', 'Audit pharmacy / stores stock levels and flag any shortages or expiring items.', 'high', 4)
) AS v(title, description, default_priority, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.task_templates);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.task_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS employee_response_note text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_note text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- Staff-side list (includes the new workflow fields)
CREATE OR REPLACE FUNCTION public.get_staff_tasks_hrms(_staff_id uuid)
RETURNS TABLE (
  id uuid, task_title text, task_description text, priority text, status text,
  due_date timestamptz, completed_at timestamptz, actual_completed_at timestamptz,
  updated_at timestamptz, notes text, created_at timestamptz,
  employee_response_note text, completion_note text, review_note text,
  assigned_to_staff_code text, assigned_to_full_name text, assigned_to_role text,
  assigned_by_staff_code text, assigned_by_full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.task_title, t.task_description, t.priority::text, t.status::text,
         t.due_date::timestamptz, t.completed_at::timestamptz, t.actual_completed_at::timestamptz,
         t.updated_at, t.notes, t.created_at,
         t.employee_response_note, t.completion_note, t.review_note,
         a.staff_code, a.full_name, a.role::text,
         b.staff_code, b.full_name
  FROM public.tasks t
  JOIN public.staff a ON a.id = t.assigned_to
  LEFT JOIN public.staff b ON b.id = t.assigned_by
  WHERE t.assigned_to = _staff_id
    AND (a.user_id = auth.uid() OR public.is_hr_admin(auth.uid()))
  ORDER BY t.created_at DESC
$$;
GRANT EXECUTE ON FUNCTION public.get_staff_tasks_hrms(uuid) TO authenticated;

-- Staff actions on their own task: accept / reject / submit (for review)
CREATE OR REPLACE FUNCTION public.staff_task_action(_task_id uuid, _action text, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.tasks%ROWTYPE;
  me uuid;
BEGIN
  SELECT s.id INTO me FROM public.staff s WHERE s.user_id = auth.uid() LIMIT 1;
  SELECT * INTO t FROM public.tasks WHERE id = _task_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF me IS NULL OR t.assigned_to <> me THEN RAISE EXCEPTION 'This task is not assigned to you'; END IF;

  IF _action = 'accept' THEN
    IF t.status::text <> 'pending' THEN RAISE EXCEPTION 'Only open tasks can be accepted'; END IF;
    UPDATE public.tasks SET status = 'accepted', employee_response_note = NULLIF(trim(_note), ''),
      responded_at = now(), updated_at = now() WHERE id = _task_id;

  ELSIF _action = 'reject' THEN
    IF t.status::text <> 'pending' THEN RAISE EXCEPTION 'Only open tasks can be rejected'; END IF;
    IF COALESCE(trim(_note), '') = '' THEN RAISE EXCEPTION 'Please give a reason for rejecting'; END IF;
    UPDATE public.tasks SET status = 'rejected', employee_response_note = trim(_note),
      responded_at = now(), updated_at = now() WHERE id = _task_id;

  ELSIF _action = 'submit' THEN
    IF t.status::text NOT IN ('accepted', 'in_progress') THEN RAISE EXCEPTION 'Accept the task before submitting it'; END IF;
    UPDATE public.tasks SET status = 'review', completion_note = NULLIF(trim(_note), ''),
      submitted_at = now(), completed_at = now(), updated_at = now() WHERE id = _task_id;
  ELSE
    RAISE EXCEPTION 'Unknown action %', _action;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.staff_task_action(uuid, text, text) TO authenticated;
