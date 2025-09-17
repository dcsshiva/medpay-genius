-- Remove rate_per_visit column from doctors table
ALTER TABLE public.doctors DROP COLUMN IF EXISTS rate_per_visit;

-- Remove rate_per_visit column from payments table  
ALTER TABLE public.payments DROP COLUMN IF EXISTS rate_per_visit;