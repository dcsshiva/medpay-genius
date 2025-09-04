-- Add columns for partial payment tracking
ALTER TABLE public.payments 
ADD COLUMN paid_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN remaining_amount NUMERIC(10,2),
ADD COLUMN is_fully_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN payment_notes TEXT;

-- Create a table to track individual payment transactions
CREATE TABLE public.payment_transactions (
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
CREATE POLICY "Admins can manage all payment transactions" 
ON public.payment_transactions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Managers and doctors can view payment transactions" 
ON public.payment_transactions 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['manager'::user_role, 'admin'::user_role, 'doctor'::user_role]));

-- Add trigger for payment_transactions timestamps
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing payments to set remaining_amount
UPDATE public.payments 
SET remaining_amount = total_amount - COALESCE(paid_amount, 0);

-- Add constraint to ensure paid_amount doesn't exceed total_amount
ALTER TABLE public.payments 
ADD CONSTRAINT payments_paid_amount_check 
CHECK (paid_amount <= total_amount);