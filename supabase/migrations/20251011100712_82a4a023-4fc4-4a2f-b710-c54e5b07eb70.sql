-- Add insurance_company_id column to visits table
ALTER TABLE public.visits 
ADD COLUMN insurance_company_id UUID REFERENCES public.insurance_companies(id);

-- Add index for better query performance
CREATE INDEX idx_visits_insurance_company ON public.visits(insurance_company_id);

-- Drop and recreate get_user_visits function with insurance company information
DROP FUNCTION IF EXISTS public.get_user_visits(text, uuid, text);

CREATE OR REPLACE FUNCTION public.get_user_visits(_user_type text, _user_id uuid, _user_role text)
RETURNS TABLE(
  id uuid, 
  visit_code text, 
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
  processed_at timestamp with time zone,
  insurance_company_id uuid,
  insurance_company_name text,
  insurance_company_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Doctors can only see their own visits
  IF _user_type = 'doctor' THEN
    RETURN QUERY
    SELECT 
      v.id, 
      v.visit_code,
      v.visit_date, 
      v.patient_count, 
      v.patient_id, 
      v.patient_name,
      v.visit_payment, 
      v.payment_type, 
      v.visit_reason, 
      v.notes, 
      v.doctor_id,
      d.doctor_code, 
      COALESCE(d.full_name, 'Doctor') as doctor_name,
      v.is_processed, 
      v.processed_in_payment_id, 
      v.processed_at,
      v.insurance_company_id,
      ic.company_name as insurance_company_name,
      ic.company_code as insurance_company_code
    FROM visits v
    JOIN doctors d ON v.doctor_id = d.id
    LEFT JOIN insurance_companies ic ON v.insurance_company_id = ic.id
    WHERE d.user_id = _user_id
    ORDER BY v.visit_date DESC;
  -- Admins and managers can see all visits  
  ELSIF _user_role IN ('admin', 'manager') THEN
    RETURN QUERY
    SELECT 
      v.id, 
      v.visit_code,
      v.visit_date, 
      v.patient_count, 
      v.patient_id, 
      v.patient_name,
      v.visit_payment, 
      v.payment_type, 
      v.visit_reason, 
      v.notes, 
      v.doctor_id,
      d.doctor_code, 
      COALESCE(d.full_name, 'Doctor') as doctor_name,
      v.is_processed, 
      v.processed_in_payment_id, 
      v.processed_at,
      v.insurance_company_id,
      ic.company_name as insurance_company_name,
      ic.company_code as insurance_company_code
    FROM visits v
    JOIN doctors d ON v.doctor_id = d.id
    LEFT JOIN insurance_companies ic ON v.insurance_company_id = ic.id
    ORDER BY v.visit_date DESC;
  END IF;
END;
$function$;