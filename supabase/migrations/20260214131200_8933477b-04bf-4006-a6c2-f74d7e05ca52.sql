
-- Notify admin/manager when complaint is submitted
CREATE OR REPLACE FUNCTION public.notify_complaint_submitted()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  raiser_name TEXT;
BEGIN
  IF NEW.submitted_to IS NOT NULL THEN
    SELECT user_id INTO target_user_id FROM public.staff WHERE id = NEW.submitted_to;
    SELECT full_name INTO raiser_name FROM public.staff WHERE id = NEW.raised_by;
    IF target_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, staff_id, title, message, type, related_entity_id, related_entity_type)
      VALUES (
        target_user_id, NEW.submitted_to,
        'New Complaint Received',
        COALESCE(raiser_name, 'A staff member') || ' raised a complaint: ' || NEW.complaint_title,
        'complaint_submitted', NEW.id, 'complaint'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_complaint_submitted
AFTER INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.notify_complaint_submitted();

-- Notify approver when leave/permission is submitted
CREATE OR REPLACE FUNCTION public.notify_leave_permission_submitted()
RETURNS TRIGGER AS $$
DECLARE
  approver_user_id UUID;
  applicant_name TEXT;
  app_type TEXT;
BEGIN
  SELECT user_id INTO approver_user_id FROM public.staff WHERE id = NEW.approver_id;
  SELECT full_name INTO applicant_name FROM public.staff WHERE id = NEW.applicant_id;
  app_type := CASE WHEN NEW.application_type::text = 'leave' THEN 'leave_submitted' ELSE 'permission_submitted' END;

  IF approver_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, staff_id, title, message, type, related_entity_id, related_entity_type)
    VALUES (
      approver_user_id, NEW.approver_id,
      'New ' || initcap(NEW.application_type::text) || ' Request',
      COALESCE(applicant_name, 'A staff member') || ' submitted a ' || NEW.application_type::text || ' request',
      app_type, NEW.id, 'leave_application'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_leave_permission_submitted
AFTER INSERT ON public.leave_permission_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_leave_permission_submitted();
