-- Create staff_payments table for monthly staff payments
CREATE TABLE public.staff_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  branch_name TEXT,
  account_holder_name TEXT,
  payment_notes TEXT,
  bank_advice_generated BOOLEAN NOT NULL DEFAULT false,
  bank_advice_generated_at TIMESTAMPTZ,
  bank_advice_generated_by UUID REFERENCES auth.users(id),
  bank_advice_reference TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_staff_payment_date UNIQUE (staff_id, payment_date)
);

-- Create staff_payment_bank_advice_history table
CREATE TABLE public.staff_payment_bank_advice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  generation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_count INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  file_content TEXT,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payment_bank_advice_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_payments
CREATE POLICY "Admins and managers can manage all staff payments"
  ON public.staff_payments
  FOR ALL
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

CREATE POLICY "Staff can view their own staff payments"
  ON public.staff_payments
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM public.staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for staff_payment_bank_advice_history
CREATE POLICY "Admins and managers can manage staff payment bank advice history"
  ON public.staff_payment_bank_advice_history
  FOR ALL
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

CREATE POLICY "Staff can view staff payment bank advice history"
  ON public.staff_payment_bank_advice_history
  FOR SELECT
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

-- Indexes for performance
CREATE INDEX idx_staff_payments_staff_id ON public.staff_payments(staff_id);
CREATE INDEX idx_staff_payments_payment_date ON public.staff_payments(payment_date);
CREATE INDEX idx_staff_payments_bank_advice ON public.staff_payments(bank_advice_generated);

-- Trigger for updated_at
CREATE TRIGGER update_staff_payments_updated_at
  BEFORE UPDATE ON public.staff_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_payment_bank_advice_history_updated_at
  BEFORE UPDATE ON public.staff_payment_bank_advice_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();