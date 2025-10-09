-- Fix get_payment_approval_totals function to handle approved/manager_approved statuses
-- and exclude fully paid/rejected payments from pending counts
CREATE OR REPLACE FUNCTION public.get_payment_approval_totals()
 RETURNS TABLE(pending_cash numeric, pending_insurance numeric, approved_cash numeric, approved_insurance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    -- Pending cash: sum of visit_payment for cash visits where cash_approval_status is pending or manager_approved
    -- BUT exclude payments that are fully paid or admin_approved/rejected
    COALESCE(SUM(CASE 
      WHEN v.payment_type = 'cash' 
        AND p.cash_approval_status IN ('pending', 'manager_approved')
        AND p.is_fully_paid = false
        AND p.status NOT IN ('admin_approved', 'rejected')
      THEN v.visit_payment 
      ELSE 0 
    END), 0) as pending_cash,
    
    -- Pending insurance: sum of visit_payment for insurance visits where insurance_approval_status is pending or manager_approved
    -- BUT exclude payments that are fully paid or admin_approved/rejected
    COALESCE(SUM(CASE 
      WHEN v.payment_type = 'insurance' 
        AND p.insurance_approval_status IN ('pending', 'manager_approved')
        AND p.is_fully_paid = false
        AND p.status NOT IN ('admin_approved', 'rejected')
      THEN v.visit_payment 
      ELSE 0 
    END), 0) as pending_insurance,
    
    -- Approved cash: sum of visit_payment for cash visits where cash_approval_status is approved
    -- AND the payment is fully paid or admin_approved
    COALESCE(SUM(CASE 
      WHEN v.payment_type = 'cash' 
        AND p.cash_approval_status = 'approved'
        AND (p.is_fully_paid = true OR p.status = 'admin_approved')
      THEN v.visit_payment 
      ELSE 0 
    END), 0) as approved_cash,
    
    -- Approved insurance: sum of visit_payment for insurance visits where insurance_approval_status is approved
    -- AND the payment is fully paid or admin_approved
    COALESCE(SUM(CASE 
      WHEN v.payment_type = 'insurance' 
        AND p.insurance_approval_status = 'approved'
        AND (p.is_fully_paid = true OR p.status = 'admin_approved')
      THEN v.visit_payment 
      ELSE 0 
    END), 0) as approved_insurance
  FROM public.payments p
  JOIN public.payment_visits pv ON pv.payment_id = p.id
  JOIN public.visits v ON v.id = pv.visit_id;
END;
$function$;

-- Fix data inconsistency: Update payments that are fully paid and admin_approved
-- to have their approval statuses set to 'approved' instead of 'pending'
UPDATE public.payments
SET 
  cash_approval_status = 'approved',
  cash_approved_at = COALESCE(admin_approved_at, now())
WHERE is_fully_paid = true
  AND status = 'admin_approved'
  AND cash_approval_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.payment_visits pv
    JOIN public.visits v ON v.id = pv.visit_id
    WHERE pv.payment_id = payments.id
    AND v.payment_type = 'cash'
  );

UPDATE public.payments
SET 
  insurance_approval_status = 'approved',
  insurance_approved_at = COALESCE(admin_approved_at, now())
WHERE is_fully_paid = true
  AND status = 'admin_approved'
  AND insurance_approval_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.payment_visits pv
    JOIN public.visits v ON v.id = pv.visit_id
    WHERE pv.payment_id = payments.id
    AND v.payment_type = 'insurance'
  );