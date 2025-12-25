-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_entity_id UUID,
  related_entity_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- RLS: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS: Allow system inserts (via service role or triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add messages RLS policy for staff users
CREATE POLICY "Staff users can read messages"
ON public.messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Create function to create notification on task assignment
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
  staff_user_id UUID;
  assigned_by_name TEXT;
BEGIN
  -- Get the user_id from staff table
  SELECT user_id INTO staff_user_id FROM public.staff WHERE id = NEW.assigned_to;
  
  -- Get assigned_by name if available
  IF NEW.assigned_by IS NOT NULL THEN
    SELECT full_name INTO assigned_by_name FROM public.staff WHERE id = NEW.assigned_by;
  END IF;
  
  -- Only create notification if staff has a user_id
  IF staff_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, staff_id, title, message, type, related_entity_id, related_entity_type)
    VALUES (
      staff_user_id,
      NEW.assigned_to,
      'New Task Assigned',
      COALESCE('Task: ' || NEW.task_title || ' assigned by ' || COALESCE(assigned_by_name, 'System'), 'A new task has been assigned to you'),
      'task_assigned',
      NEW.id,
      'task'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for task assignment notifications
CREATE TRIGGER on_task_assigned
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment();

-- Create function to notify leave status changes
CREATE OR REPLACE FUNCTION public.notify_leave_status_change()
RETURNS TRIGGER AS $$
DECLARE
  applicant_user_id UUID;
  status_message TEXT;
  notification_type TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get applicant's user_id
  SELECT user_id INTO applicant_user_id FROM public.staff WHERE id = NEW.applicant_id;
  
  -- Determine notification type and message
  IF NEW.status = 'approved' THEN
    notification_type := 'leave_approved';
    status_message := 'Your ' || NEW.application_type || ' request has been approved';
  ELSIF NEW.status = 'rejected' THEN
    notification_type := 'leave_rejected';
    status_message := 'Your ' || NEW.application_type || ' request has been rejected';
    IF NEW.rejection_reason IS NOT NULL THEN
      status_message := status_message || '. Reason: ' || NEW.rejection_reason;
    END IF;
  ELSE
    RETURN NEW;
  END IF;
  
  -- Create notification if user_id exists
  IF applicant_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, staff_id, title, message, type, related_entity_id, related_entity_type)
    VALUES (
      applicant_user_id,
      NEW.applicant_id,
      CASE WHEN NEW.status = 'approved' THEN 'Request Approved' ELSE 'Request Rejected' END,
      status_message,
      notification_type,
      NEW.id,
      'leave_application'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for leave status notifications
CREATE TRIGGER on_leave_status_change
AFTER UPDATE ON public.leave_permission_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_leave_status_change();

-- Create index for faster notification queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);