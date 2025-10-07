-- Fix visit processing and session user_id issues

-- 1. Add foreign keys to payment_visits only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_visits_payment_id_fkey'
  ) THEN
    ALTER TABLE public.payment_visits 
    ADD CONSTRAINT payment_visits_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_visits_visit_id_fkey'
  ) THEN
    ALTER TABLE public.payment_visits 
    ADD CONSTRAINT payment_visits_visit_id_fkey 
    FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Create function to mark visit as processed when linked to payment
CREATE OR REPLACE FUNCTION public.mark_visit_processed_on_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark the visit as processed and link it to the payment
  UPDATE public.visits
  SET 
    is_processed = true,
    processed_in_payment_id = NEW.payment_id,
    processed_at = now()
  WHERE id = NEW.visit_id;
  
  RETURN NEW;
END;
$$;

-- 3. Create trigger to mark visits as processed on insert into payment_visits
DROP TRIGGER IF EXISTS mark_visit_processed_trigger ON public.payment_visits;
CREATE TRIGGER mark_visit_processed_trigger
AFTER INSERT ON public.payment_visits
FOR EACH ROW
EXECUTE FUNCTION public.mark_visit_processed_on_link();

-- 4. Create function to unmark visit when unlinked from payment
CREATE OR REPLACE FUNCTION public.unmark_visit_on_unlink()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the visit is still linked to any non-rejected payments
  IF NOT EXISTS (
    SELECT 1 
    FROM public.payment_visits pv
    JOIN public.payments p ON p.id = pv.payment_id
    WHERE pv.visit_id = OLD.visit_id 
      AND p.status != 'rejected'
  ) THEN
    -- No active payment links, unmark as processed
    UPDATE public.visits
    SET 
      is_processed = false,
      processed_in_payment_id = NULL,
      processed_at = NULL
    WHERE id = OLD.visit_id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- 5. Create trigger to unmark visits when unlinked
DROP TRIGGER IF EXISTS unmark_visit_on_delete_trigger ON public.payment_visits;
CREATE TRIGGER unmark_visit_on_delete_trigger
AFTER DELETE ON public.payment_visits
FOR EACH ROW
EXECUTE FUNCTION public.unmark_visit_on_unlink();

-- 6. Update existing unmark_visits_on_payment_change function to handle payment status changes
CREATE OR REPLACE FUNCTION public.unmark_visits_on_payment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If payment is being deleted or status changed to rejected
  IF TG_OP = 'DELETE' OR (NEW.status = 'rejected' AND OLD.status != 'rejected') THEN
    -- Unmark visits that were linked to this payment (only if not linked to other active payments)
    UPDATE public.visits v
    SET 
      is_processed = false,
      processed_in_payment_id = NULL,
      processed_at = NULL
    WHERE v.id IN (
      SELECT pv.visit_id 
      FROM public.payment_visits pv
      WHERE pv.payment_id = COALESCE(OLD.id, NEW.id)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.payment_visits pv2
      JOIN public.payments p2 ON p2.id = pv2.payment_id
      WHERE pv2.visit_id = v.id
        AND p2.id != COALESCE(OLD.id, NEW.id)
        AND p2.status != 'rejected'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. Add trigger on payments for status updates
DROP TRIGGER IF EXISTS unmark_visits_on_payment_change_trigger ON public.payments;
CREATE TRIGGER unmark_visits_on_payment_change_trigger
AFTER UPDATE OF status ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.unmark_visits_on_payment_change();

-- 8. Add trigger on payments for deletion
DROP TRIGGER IF EXISTS unmark_visits_on_payment_delete_trigger ON public.payments;
CREATE TRIGGER unmark_visits_on_payment_delete_trigger
AFTER DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.unmark_visits_on_payment_change();

-- 9. Backfill user_sessions.user_id to use auth user_id instead of original_id for doctors
UPDATE public.user_sessions us
SET user_id = d.user_id
FROM public.doctors d
WHERE us.user_type = 'doctor'
  AND us.original_id = d.id
  AND d.user_id IS NOT NULL
  AND us.user_id IS DISTINCT FROM d.user_id;

-- 10. Also backfill for staff
UPDATE public.user_sessions us
SET user_id = s.user_id
FROM public.staff s
WHERE us.user_type = 'staff'
  AND us.original_id = s.id
  AND s.user_id IS NOT NULL
  AND us.user_id IS DISTINCT FROM s.user_id;