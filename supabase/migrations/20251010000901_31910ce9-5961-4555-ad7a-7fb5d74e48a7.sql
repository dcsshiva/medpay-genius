-- Fix cash approval status for existing payments that are already manager/admin approved
-- but still show as pending in cash_approval_status
UPDATE public.payments
SET 
  cash_approval_status = 'approved',
  cash_approved_at = COALESCE(admin_approved_at, manager_approved_at, now())
WHERE status IN ('manager_approved', 'admin_approved')
  AND cash_approval_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.payment_visits pv
    JOIN public.visits v ON v.id = pv.visit_id
    WHERE pv.payment_id = payments.id
    AND v.payment_type = 'cash'
  );

-- Fix insurance approval status for existing payments that are already manager/admin approved
-- but still show as pending in insurance_approval_status
UPDATE public.payments
SET 
  insurance_approval_status = 'approved',
  insurance_approved_at = COALESCE(admin_approved_at, manager_approved_at, now())
WHERE status IN ('manager_approved', 'admin_approved')
  AND insurance_approval_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.payment_visits pv
    JOIN public.visits v ON v.id = pv.visit_id
    WHERE pv.payment_id = payments.id
    AND v.payment_type = 'insurance'
  );