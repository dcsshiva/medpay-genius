-- Create bank advice history table
CREATE TABLE public.bank_advice_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  generation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_count INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL,
  payment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by UUID REFERENCES auth.users(id),
  file_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_advice_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and managers can view bank advice history"
ON public.bank_advice_history
FOR SELECT
USING (
  has_designation(auth.uid(), 'admin'::app_designation) OR 
  has_designation(auth.uid(), 'manager'::app_designation)
);

CREATE POLICY "Admins and managers can insert bank advice history"
ON public.bank_advice_history
FOR INSERT
WITH CHECK (
  has_designation(auth.uid(), 'admin'::app_designation) OR 
  has_designation(auth.uid(), 'manager'::app_designation)
);

-- Add trigger for updated_at
CREATE TRIGGER update_bank_advice_history_updated_at
BEFORE UPDATE ON public.bank_advice_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_bank_advice_history_generation_date ON public.bank_advice_history(generation_date);
CREATE INDEX idx_bank_advice_history_generated_by ON public.bank_advice_history(generated_by);