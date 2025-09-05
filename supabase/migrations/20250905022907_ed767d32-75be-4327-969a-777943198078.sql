-- Add payment_type column to visits table
ALTER TABLE public.visits 
ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'cash';

-- Add constraint to ensure valid payment types
ALTER TABLE public.visits 
ADD CONSTRAINT visits_payment_type_check 
CHECK (payment_type IN ('cash', 'insurance'));