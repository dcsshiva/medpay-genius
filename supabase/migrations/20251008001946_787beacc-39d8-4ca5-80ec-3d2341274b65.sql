-- Fix the get_payment_approval_counts function to exclude fully paid payments
DROP FUNCTION IF EXISTS public.get_payment_approval_counts();

CREATE OR REPLACE FUNCTION public.get_payment_approval_counts()
RETURNS TABLE(pending_cash_count bigint, pending_insurance_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Count payments with pending/manager_approved cash status that have actual cash visits
    -- AND are not fully paid or already admin approved
    (SELECT COUNT(DISTINCT p.id)
     FROM public.payments p
     JOIN public.payment_visits pv ON pv.payment_id = p.id
     JOIN public.visits v ON v.id = pv.visit_id
     WHERE p.cash_approval_status IN ('pending', 'manager_approved')
       AND v.payment_type = 'cash'
       AND p.is_fully_paid = false
       AND p.status NOT IN ('admin_approved', 'rejected'))::bigint as pending_cash_count,
    
    -- Count payments with pending/manager_approved insurance status that have actual insurance visits
    -- AND are not fully paid or already admin approved
    (SELECT COUNT(DISTINCT p.id)
     FROM public.payments p
     JOIN public.payment_visits pv ON pv.payment_id = p.id
     JOIN public.visits v ON v.id = pv.visit_id
     WHERE p.insurance_approval_status IN ('pending', 'manager_approved')
       AND v.payment_type = 'insurance'
       AND p.is_fully_paid = false
       AND p.status NOT IN ('admin_approved', 'rejected'))::bigint as pending_insurance_count;
END;
$$;

-- Fix data consistency: Update the existing fully paid cash payment to have approved status
UPDATE public.payments 
SET cash_approval_status = 'approved'
WHERE is_fully_paid = true 
  AND cash_approval_status = 'pending'
  AND status = 'admin_approved';

-- Also update insurance approval status for consistency
UPDATE public.payments 
SET insurance_approval_status = 'approved'
WHERE is_fully_paid = true 
  AND insurance_approval_status = 'pending'
  AND status = 'admin_approved';