-- Create payment_visits junction table to track which visits belong to which payment
CREATE TABLE public.payment_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payment_id, visit_id)
);

-- Enable RLS
ALTER TABLE public.payment_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_visits
CREATE POLICY "Admins and managers can manage payment visits"
ON public.payment_visits
FOR ALL
USING (
  has_designation(auth.uid(), 'admin'::app_designation) OR 
  has_designation(auth.uid(), 'manager'::app_designation)
);

CREATE POLICY "Doctors can view their own payment visits"
ON public.payment_visits
FOR SELECT
USING (
  payment_id IN (
    SELECT p.id 
    FROM public.payments p
    JOIN public.doctors d ON p.doctor_id = d.id
    WHERE d.user_id = auth.uid()
  )
);

-- Update the trigger function to only mark visits that are explicitly linked
CREATE OR REPLACE FUNCTION public.mark_visits_as_processed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark only visits that are explicitly linked in payment_visits table
  UPDATE public.visits
  SET 
    is_processed = true,
    processed_in_payment_id = NEW.id,
    processed_at = now()
  WHERE id IN (
    SELECT visit_id 
    FROM public.payment_visits 
    WHERE payment_id = NEW.id
  );
  
  RETURN NEW;
END;
$$;

-- Update the unmark trigger to use the junction table
CREATE OR REPLACE FUNCTION public.unmark_visits_on_payment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If payment is being deleted or status changed to rejected
  IF TG_OP = 'DELETE' OR (NEW.status = 'rejected' AND OLD.status != 'rejected') THEN
    -- Unmark visits that were linked to this payment
    UPDATE public.visits
    SET 
      is_processed = false,
      processed_in_payment_id = NULL,
      processed_at = NULL
    WHERE id IN (
      SELECT visit_id 
      FROM public.payment_visits 
      WHERE payment_id = COALESCE(OLD.id, NEW.id)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;