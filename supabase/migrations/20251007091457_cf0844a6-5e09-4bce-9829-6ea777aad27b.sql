-- Create function to get accurate payment approval counts
CREATE OR REPLACE FUNCTION public.get_payment_approval_counts()
RETURNS TABLE(pending_cash_count bigint, pending_insurance_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    -- Count payments with pending/manager_approved cash status that have actual cash visits
    (SELECT COUNT(DISTINCT p.id)
     FROM public.payments p
     JOIN public.payment_visits pv ON pv.payment_id = p.id
     JOIN public.visits v ON v.id = pv.visit_id
     WHERE p.cash_approval_status IN ('pending', 'manager_approved')
       AND v.payment_type = 'cash')::bigint as pending_cash_count,
    
    -- Count payments with pending/manager_approved insurance status that have actual insurance visits
    (SELECT COUNT(DISTINCT p.id)
     FROM public.payments p
     JOIN public.payment_visits pv ON pv.payment_id = p.id
     JOIN public.visits v ON v.id = pv.visit_id
     WHERE p.insurance_approval_status IN ('pending', 'manager_approved')
       AND v.payment_type = 'insurance')::bigint as pending_insurance_count;
END;
$function$;