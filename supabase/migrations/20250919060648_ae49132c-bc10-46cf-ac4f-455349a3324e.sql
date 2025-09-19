-- Add fields to track visit processing status
ALTER TABLE public.visits 
ADD COLUMN is_processed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN processed_in_payment_id UUID REFERENCES public.payments(id),
ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX idx_visits_is_processed ON public.visits(is_processed);
CREATE INDEX idx_visits_processed_payment ON public.visits(processed_in_payment_id);

-- Drop the existing function first
DROP FUNCTION public.get_user_visits(text, uuid, text);

-- Recreate the get_user_visits function with new fields
CREATE OR REPLACE FUNCTION public.get_user_visits(_user_type text, _user_id uuid, _user_role text)
RETURNS TABLE(
  id uuid, 
  visit_date date, 
  patient_count integer, 
  patient_id text, 
  patient_name text, 
  visit_payment numeric, 
  payment_type text, 
  visit_reason text, 
  notes text, 
  doctor_id uuid, 
  doctor_code text, 
  doctor_name text,
  is_processed boolean,
  processed_in_payment_id uuid,
  processed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  -- Doctors can only see their own visits
  if _user_type = 'doctor' then
    return query
    select 
      v.id, v.visit_date, v.patient_count, v.patient_id, v.patient_name,
      v.visit_payment, v.payment_type, v.visit_reason, v.notes, v.doctor_id,
      d.doctor_code, coalesce(p.full_name, 'Doctor') as doctor_name,
      v.is_processed, v.processed_in_payment_id, v.processed_at
    from visits v
    join doctors d on v.doctor_id = d.id
    left join profiles p on d.profile_id = p.id
    where d.id = _user_id
    order by v.visit_date desc;
  -- Admins and managers can see all visits  
  elsif _user_role in ('admin', 'manager') then
    return query
    select 
      v.id, v.visit_date, v.patient_count, v.patient_id, v.patient_name,
      v.visit_payment, v.payment_type, v.visit_reason, v.notes, v.doctor_id,
      d.doctor_code, coalesce(p.full_name, 'Doctor') as doctor_name,
      v.is_processed, v.processed_in_payment_id, v.processed_at
    from visits v
    join doctors d on v.doctor_id = d.id
    left join profiles p on d.profile_id = p.id
    order by v.visit_date desc;
  end if;
end;
$$;

-- Create function to mark visits as processed when payment advice is created
CREATE OR REPLACE FUNCTION public.mark_visits_as_processed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark all visits in the date range as processed when payment is created
  UPDATE public.visits
  SET 
    is_processed = true,
    processed_in_payment_id = NEW.id,
    processed_at = now()
  WHERE 
    doctor_id = NEW.doctor_id 
    AND visit_date >= NEW.period_start 
    AND visit_date <= NEW.period_end
    AND is_processed = false;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically mark visits as processed
CREATE TRIGGER mark_visits_processed_trigger
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_visits_as_processed();

-- Create function to unmark visits when payment is rejected or deleted
CREATE OR REPLACE FUNCTION public.unmark_visits_on_payment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If payment is being deleted or status changed to rejected
  IF TG_OP = 'DELETE' OR (NEW.status = 'rejected' AND OLD.status != 'rejected') THEN
    -- Use OLD for DELETE, NEW for UPDATE
    UPDATE public.visits
    SET 
      is_processed = false,
      processed_in_payment_id = NULL,
      processed_at = NULL
    WHERE processed_in_payment_id = COALESCE(OLD.id, NEW.id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for payment deletion and rejection
CREATE TRIGGER unmark_visits_on_payment_delete_trigger
  AFTER DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.unmark_visits_on_payment_change();

CREATE TRIGGER unmark_visits_on_payment_reject_trigger
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.unmark_visits_on_payment_change();