
-- Trigger: notify on task status change
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _staff_name text;
  _old_status text;
  _new_status text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    _old_status := OLD.status::text;
    _new_status := NEW.status::text;

    -- Get the user_id of the assigned staff
    SELECT user_id INTO _user_id FROM staff WHERE id = NEW.assigned_to;

    IF _user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, staff_id, type, title, message, related_entity_id, related_entity_type)
      VALUES (
        _user_id,
        NEW.assigned_to,
        'task_status_changed',
        'Task Status Updated',
        'Task "' || NEW.task_title || '" changed from ' || replace(_old_status, '_', ' ') || ' to ' || replace(_new_status, '_', ' '),
        NEW.id,
        'task'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_status_change ON public.tasks;
CREATE TRIGGER trg_notify_task_status_change
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_status_change();

-- Trigger: notify on complaint status change
CREATE OR REPLACE FUNCTION public.notify_complaint_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _old_status text;
  _new_status text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    _old_status := OLD.status::text;
    _new_status := NEW.status::text;

    -- Get the user_id of the staff who raised the complaint
    SELECT user_id INTO _user_id FROM staff WHERE id = NEW.raised_by;

    IF _user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, staff_id, type, title, message, related_entity_id, related_entity_type)
      VALUES (
        _user_id,
        NEW.raised_by,
        'complaint_status_changed',
        'Complaint Status Updated',
        'Complaint "' || NEW.complaint_title || '" changed from ' || replace(_old_status, '_', ' ') || ' to ' || replace(_new_status, '_', ' '),
        NEW.id,
        'complaint'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_complaint_status_change ON public.complaints;
CREATE TRIGGER trg_notify_complaint_status_change
  AFTER UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_complaint_status_change();
