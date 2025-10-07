-- Create function to erase all transactions (for testing purposes only)
-- This function deletes all visits, payments, and related records
-- Only accessible to administrators

CREATE OR REPLACE FUNCTION public.erase_all_transactions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_transactions_count INTEGER;
  payment_visits_count INTEGER;
  payments_count INTEGER;
  visits_count INTEGER;
BEGIN
  -- Only admins can erase transactions
  IF NOT public.has_designation(auth.uid(), 'admin'::app_designation) THEN
    RAISE EXCEPTION 'Only administrators can erase transactions';
  END IF;

  -- Delete in correct order to avoid FK constraint violations
  DELETE FROM public.payment_transactions;
  GET DIAGNOSTICS payment_transactions_count = ROW_COUNT;
  
  DELETE FROM public.payment_visits;
  GET DIAGNOSTICS payment_visits_count = ROW_COUNT;
  
  DELETE FROM public.payments;
  GET DIAGNOSTICS payments_count = ROW_COUNT;
  
  DELETE FROM public.visits;
  GET DIAGNOSTICS visits_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'payment_transactions_deleted', payment_transactions_count,
    'payment_visits_deleted', payment_visits_count,
    'payments_deleted', payments_count,
    'visits_deleted', visits_count,
    'success', true
  );
END;
$$;