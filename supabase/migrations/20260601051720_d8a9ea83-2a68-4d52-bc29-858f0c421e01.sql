CREATE OR REPLACE FUNCTION public.get_doctor_payment_visit_details(
  _payment_id uuid
)
RETURNS TABLE (
  id uuid,
  visit_code text,
  visit_date date,
  patient_name text,
  payment_type text,
  visit_payment numeric,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.visit_code, v.visit_date, v.patient_name,
         v.payment_type::text AS payment_type,
         v.visit_payment,
         'processed'::text AS status
  FROM public.payment_visits pv
  JOIN public.visits v ON v.id = pv.visit_id
  WHERE pv.payment_id = _payment_id
  ORDER BY v.visit_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_doctor_payment_visit_details(uuid) TO authenticated, anon;