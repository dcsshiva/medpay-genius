-- Clear all payment transactions first
DELETE FROM public.payment_transactions;

-- Clear the foreign key references in visits
UPDATE public.visits 
SET processed_in_payment_id = NULL, 
    is_processed = false 
WHERE processed_in_payment_id IS NOT NULL;

-- Now we can safely delete payments
DELETE FROM public.payments;

-- Finally clear all visits
DELETE FROM public.visits;