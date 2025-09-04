-- Check if columns exist and add only missing ones
DO $$ 
BEGIN
    -- Add remaining_amount if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='remaining_amount') THEN
        ALTER TABLE public.payments ADD COLUMN remaining_amount NUMERIC(10,2);
    END IF;
    
    -- Add is_fully_paid if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='is_fully_paid') THEN
        ALTER TABLE public.payments ADD COLUMN is_fully_paid BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add payment_notes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='payment_notes') THEN
        ALTER TABLE public.payments ADD COLUMN payment_notes TEXT;
    END IF;
END $$;

-- Create payment_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_transactions
DROP POLICY IF EXISTS "Admins can manage all payment transactions" ON public.payment_transactions;
CREATE POLICY "Admins can manage all payment transactions" 
ON public.payment_transactions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

DROP POLICY IF EXISTS "Managers and doctors can view payment transactions" ON public.payment_transactions;
CREATE POLICY "Managers and doctors can view payment transactions" 
ON public.payment_transactions 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['manager'::user_role, 'admin'::user_role, 'doctor'::user_role]));

-- Add trigger for payment_transactions timestamps if not exists
DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing payments to set remaining_amount and paid_amount defaults
UPDATE public.payments 
SET 
  paid_amount = COALESCE(paid_amount, 0),
  remaining_amount = total_amount - COALESCE(paid_amount, 0),
  is_fully_paid = (COALESCE(paid_amount, 0) >= total_amount)
WHERE remaining_amount IS NULL;

-- Add constraint to ensure paid_amount doesn't exceed total_amount
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_paid_amount_check;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_paid_amount_check 
CHECK (paid_amount <= total_amount);