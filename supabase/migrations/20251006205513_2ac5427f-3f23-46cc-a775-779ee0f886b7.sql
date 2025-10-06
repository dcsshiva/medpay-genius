-- Drop and recreate the get_user_payments function with additional fields
DROP FUNCTION IF EXISTS public.get_user_payments(_user_type text, _user_id uuid, _user_role text);

CREATE OR REPLACE FUNCTION public.get_user_payments(_user_type text, _user_id uuid, _user_role text)
 RETURNS TABLE(
   id uuid,
   period_start date,
   period_end date,
   total_visits integer,
   total_amount numeric,
   paid_amount numeric,
   remaining_amount numeric,
   is_fully_paid boolean,
   payment_notes text,
   status text,
   manager_approved_by uuid,
   manager_approved_at timestamp with time zone,
   admin_approved_by uuid,
   admin_approved_at timestamp with time zone,
   rejected_by uuid,
   rejected_at timestamp with time zone,
   rejection_reason text,
   bank_advice_generated boolean,
   bank_advice_generated_at timestamp with time zone,
   bank_advice_generated_by uuid,
   cash_approval_status text,
   cash_approved_by uuid,
   cash_approved_at timestamp with time zone,
   cash_rejection_reason text,
   insurance_approval_status text,
   insurance_approved_by uuid,
   insurance_approved_at timestamp with time zone,
   insurance_rejection_reason text,
   doctor_id uuid,
   doctor_code text,
   doctor_name text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Doctors can only see their own payments
  IF _user_type = 'doctor' THEN
    RETURN QUERY
    SELECT 
      p.id, p.period_start, p.period_end, p.total_visits,
      p.total_amount, p.paid_amount, p.remaining_amount, p.is_fully_paid,
      p.payment_notes, p.status::text, p.manager_approved_by, p.manager_approved_at,
      p.admin_approved_by, p.admin_approved_at, p.rejected_by, p.rejected_at,
      p.rejection_reason,
      p.bank_advice_generated, p.bank_advice_generated_at, p.bank_advice_generated_by,
      p.cash_approval_status, p.cash_approved_by, p.cash_approved_at, p.cash_rejection_reason,
      p.insurance_approval_status, p.insurance_approved_by, p.insurance_approved_at, p.insurance_rejection_reason,
      p.doctor_id, d.doctor_code, 
      COALESCE(d.full_name, 'Doctor') as doctor_name
    FROM payments p
    JOIN doctors d ON p.doctor_id = d.id
    WHERE d.user_id = _user_id
    ORDER BY p.created_at DESC;
  -- Admins and managers can see all payments  
  ELSIF _user_role IN ('admin', 'manager') THEN
    RETURN QUERY
    SELECT 
      p.id, p.period_start, p.period_end, p.total_visits,
      p.total_amount, p.paid_amount, p.remaining_amount, p.is_fully_paid,
      p.payment_notes, p.status::text, p.manager_approved_by, p.manager_approved_at,
      p.admin_approved_by, p.admin_approved_at, p.rejected_by, p.rejected_at,
      p.rejection_reason,
      p.bank_advice_generated, p.bank_advice_generated_at, p.bank_advice_generated_by,
      p.cash_approval_status, p.cash_approved_by, p.cash_approved_at, p.cash_rejection_reason,
      p.insurance_approval_status, p.insurance_approved_by, p.insurance_approved_at, p.insurance_rejection_reason,
      p.doctor_id, d.doctor_code, 
      COALESCE(d.full_name, 'Doctor') as doctor_name
    FROM payments p
    JOIN doctors d ON p.doctor_id = d.id
    ORDER BY p.created_at DESC;
  END IF;
END;
$function$;