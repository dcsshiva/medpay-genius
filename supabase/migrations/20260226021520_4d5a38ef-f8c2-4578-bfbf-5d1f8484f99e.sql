-- Fix: notify_payment_status_change trigger uses invalid enum values 'approved' and 'released'
-- Valid payment_status enum values are: pending, manager_approved, admin_approved, rejected
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

  IF NEW.status IN ('manager_approved', 'admin_approved') THEN
    notif_title := 'Payment Approved';
    notif_message := 'Your payment of ₹' || NEW.total_amount || ' has been approved.';
  ELSIF NEW.status = 'rejected' THEN
    notif_title := 'Payment Rejected';
    notif_message := 'Your payment of ₹' || NEW.total_amount || ' has been rejected.' || COALESCE(' Reason: ' || NEW.rejection_reason, '');
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
  VALUES (doctor_user_id, notif_title, notif_message, 'payment', 'payment', NEW.id);

  RETURN NEW;
END;
$$;