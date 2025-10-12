-- Create function to fetch payment visits with proper access control
-- This bypasses RLS issues with custom session authentication
CREATE OR REPLACE FUNCTION public.get_payment_visits(_payment_id uuid, _user_id uuid)
RETURNS TABLE(
  visit_payment numeric,
  payment_type text,
  patient_count integer,
  patient_name text,
  visit_date date,
  insurance_company_id uuid,
  company_name text,
  company_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify the user has access to this payment
  IF NOT EXISTS (
    SELECT 1 FROM payments p
    LEFT JOIN doctors d ON p.doctor_id = d.id
    WHERE p.id = _payment_id
      AND (
        -- Doctors can see their own payments
        d.user_id = _user_id
        -- Admins and managers can see all
        OR has_designation(_user_id, 'admin'::app_designation)
        OR has_designation(_user_id, 'manager'::app_designation)
      )
  ) THEN
    RAISE EXCEPTION 'Access denied to payment visits';
  END IF;

  -- Return visits for this payment
  RETURN QUERY
  SELECT 
    v.visit_payment,
    v.payment_type,
    v.patient_count,
    v.patient_name,
    v.visit_date,
    v.insurance_company_id,
    ic.company_name,
    ic.company_code
  FROM payment_visits pv
  JOIN visits v ON pv.visit_id = v.id
  LEFT JOIN insurance_companies ic ON v.insurance_company_id = ic.id
  WHERE pv.payment_id = _payment_id;
END;
$$;