-- Add bank advice tracking fields to payments table
ALTER TABLE public.payments
ADD COLUMN bank_advice_generated boolean NOT NULL DEFAULT false,
ADD COLUMN bank_advice_generated_at timestamp with time zone,
ADD COLUMN bank_advice_generated_by uuid REFERENCES auth.users(id);

-- Add index for faster queries
CREATE INDEX idx_payments_bank_advice ON public.payments(bank_advice_generated, is_fully_paid);