-- Drop and recreate get_user_visits function to include visit_code
DROP FUNCTION IF EXISTS public.get_user_visits(_user_type text, _user_id uuid, _user_role text);

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
   processed_at timestamp with time zone
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
      v.processed_at
    FROM visits v
    JOIN doctors d ON v.doctor_id = d.id
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
      v.processed_at
    FROM visits v
    JOIN doctors d ON v.doctor_id = d.id
    ORDER BY v.visit_date DESC;
  END IF;
END;
$function$;