-- Add bank details columns to doctors table
ALTER TABLE public.doctors 
ADD COLUMN bank_account_number text,
ADD COLUMN account_holder_name text,
ADD COLUMN bank_name text,
ADD COLUMN branch_name text,
ADD COLUMN ifsc_code text;