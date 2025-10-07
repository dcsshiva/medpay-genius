-- Create function to get consolidated payment approval totals for admin dashboard
-- This aggregates payment amounts by payment type (cash/insurance) and approval status

CREATE OR REPLACE FUNCTION public.get_payment_approval_totals()
RETURNS TABLE(
  pending_cash numeric,
  pending_insurance numeric,
  approved_cash numeric,
  approved_insurance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    -- Pending cash: sum of visit_payment for cash visits where cash_approval_status is pending or manager_approved
    COALESCE(SUM(CASE 
      WHEN v.payment_type = 'cash' 
        AND p.cash_approval_status IN ('pending', 'manager_approved')
      THEN v.visit_payment 
      ELSE 0 
    END), 0) as pending_cash,
    
    -- Pending insurance: sum of visit_payment for insurance visits where insurance_approval_status is pending or manager_approved
    COALESCE(SUM(CASE 
      WHEN v.payment_type = 'insurance' 
        AND p.insurance_approval_status IN ('pending', 'manager_approved')
      THEN v.visit_payment 
      ELSE 0 
    END), 0) as pending_insurance,
    
    -- Approved cash: sum of visit_payment for cash visits where cash_approval_status is approved
    COALESCE(SUM(CASE 
      WHEN v.payment_type = 'cash' 
        AND p.cash_approval_status = 'approved'
      THEN v.visit_payment 
      ELSE 0 
    END), 0) as approved_cash,
    
    -- Approved insurance: sum of visit_payment for insurance visits where insurance_approval_status is approved
    COALESCE(SUM(CASE 
      WHEN v.payment_type = 'insurance' 
        AND p.insurance_approval_status = 'approved'
      THEN v.visit_payment 
      ELSE 0 
    END), 0) as approved_insurance
  FROM public.payments p
  JOIN public.payment_visits pv ON pv.payment_id = p.id
  JOIN public.visits v ON v.id = pv.visit_id;
END;
$function$;