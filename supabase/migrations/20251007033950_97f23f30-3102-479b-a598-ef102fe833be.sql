-- Fix foreign key constraint and erase_all_transactions function
-- Step 1: Drop and recreate the foreign key with ON DELETE SET NULL
ALTER TABLE public.visits 
DROP CONSTRAINT IF EXISTS visits_processed_in_payment_id_fkey;

ALTER TABLE public.visits 
ADD CONSTRAINT visits_processed_in_payment_id_fkey 
FOREIGN KEY (processed_in_payment_id) 
REFERENCES public.payments(id) 
ON DELETE SET NULL;

-- Step 2: Replace the erase_all_transactions function
DROP FUNCTION IF EXISTS public.erase_all_transactions();

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

  -- First, nullify all processed_in_payment_id references in visits
  UPDATE public.visits
  SET 
    processed_in_payment_id = NULL,
    is_processed = false,
    processed_at = NULL
  WHERE processed_in_payment_id IS NOT NULL;

  -- Now delete in correct order to avoid FK constraint violations
  DELETE FROM public.payment_transactions WHERE TRUE;
  GET DIAGNOSTICS payment_transactions_count = ROW_COUNT;
  
  DELETE FROM public.payment_visits WHERE TRUE;
  GET DIAGNOSTICS payment_visits_count = ROW_COUNT;
  
  DELETE FROM public.visits WHERE TRUE;
  GET DIAGNOSTICS visits_count = ROW_COUNT;
  
  DELETE FROM public.payments WHERE TRUE;
  GET DIAGNOSTICS payments_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'payment_transactions_deleted', payment_transactions_count,
    'payment_visits_deleted', payment_visits_count,
    'payments_deleted', payments_count,
    'visits_deleted', visits_count,
    'success', true
  );
END;
$$;