
-- Add notification_preferences column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"payment_status": true, "attendance": true, "leave_status": true, "task_deadline": true, "complaint_update": true}'::jsonb;

-- Trigger: Notify doctor when payment status changes (approved/rejected/released)
CREATE OR REPLACE FUNCTION public.notify_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doctor_user_id uuid;
  doctor_name text;
  notif_title text;
  notif_message text;
BEGIN
  -- Only on status change
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT user_id, full_name INTO doctor_user_id, doctor_name
  FROM doctors WHERE id = NEW.doctor_id;

  IF doctor_user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'approved' THEN
    notif_title := 'Payment Approved';
    notif_message := 'Your payment of ₹' || NEW.total_amount || ' has been approved.';
  ELSIF NEW.status = 'rejected' THEN
    notif_title := 'Payment Rejected';
    notif_message := 'Your payment of ₹' || NEW.total_amount || ' has been rejected.' || COALESCE(' Reason: ' || NEW.rejection_reason, '');
  ELSIF NEW.status = 'released' THEN
    notif_title := 'Payment Released';
    notif_message := 'Your payment of ₹' || NEW.total_amount || ' has been released.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
  VALUES (doctor_user_id, notif_title, notif_message, 'payment', 'payment', NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_payment_status
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_status_change();

-- Trigger: Notify staff when attendance marked as absent or late
CREATE OR REPLACE FUNCTION public.notify_attendance_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_user_id uuid;
  staff_name text;
BEGIN
  IF NEW.attendance_status NOT IN ('absent', 'late') THEN RETURN NEW; END IF;

  SELECT user_id, full_name INTO staff_user_id, staff_name
  FROM staff WHERE id = NEW.staff_id;

  IF staff_user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
  VALUES (
    staff_user_id,
    CASE WHEN NEW.attendance_status = 'absent' THEN 'Marked Absent' ELSE 'Marked Late' END,
    'You have been marked as ' || NEW.attendance_status || ' on ' || NEW.activity_date || '.',
    'attendance',
    'staff_daily_activities',
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_attendance
AFTER INSERT ON public.staff_daily_activities
FOR EACH ROW
EXECUTE FUNCTION public.notify_attendance_status();

-- Trigger: Notify staff when their leave/permission application status changes
CREATE OR REPLACE FUNCTION public.notify_leave_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  applicant_user_id uuid;
  app_type text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved', 'rejected') THEN RETURN NEW; END IF;

  SELECT user_id INTO applicant_user_id FROM staff WHERE id = NEW.applicant_id;
  IF applicant_user_id IS NULL THEN RETURN NEW; END IF;

  app_type := CASE WHEN NEW.application_type = 'leave' THEN 'Leave' ELSE 'Permission' END;

  INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
  VALUES (
    applicant_user_id,
    app_type || ' ' || initcap(NEW.status::text),
    'Your ' || lower(app_type) || ' application has been ' || NEW.status::text || '.' || COALESCE(' Note: ' || NEW.rejection_reason, ''),
    'leave',
    'leave_permission_applications',
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_leave_status
AFTER UPDATE ON public.leave_permission_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_leave_status_change();
