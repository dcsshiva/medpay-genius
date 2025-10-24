-- Create quick_payment_types master table
CREATE TABLE IF NOT EXISTS public.quick_payment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code TEXT UNIQUE NOT NULL,
  type_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_payment_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quick_payment_types
CREATE POLICY "Admins can manage quick payment types"
  ON public.quick_payment_types FOR ALL
  USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Anyone authenticated can view active quick payment types"
  ON public.quick_payment_types FOR SELECT
  USING (is_active = true);

-- Create quick_payments table
CREATE TABLE IF NOT EXISTS public.quick_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL CHECK (mobile_number ~ '^[0-9]{10}$'),
  payment_type_id UUID REFERENCES public.quick_payment_types(id),
  
  -- Bank Details
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  branch_name TEXT,
  account_holder_name TEXT,
  
  -- Payment Amount with TDS
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  tds_percentage NUMERIC DEFAULT 0,
  tds_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  payment_notes TEXT,
  
  -- Bank Advice Status
  bank_advice_generated BOOLEAN NOT NULL DEFAULT false,
  bank_advice_generated_at TIMESTAMPTZ,
  bank_advice_generated_by UUID,
  bank_advice_reference TEXT,
  
  -- Audit fields
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quick_payments
CREATE POLICY "Admins and managers can manage all quick payments"
  ON public.quick_payments FOR ALL
  USING (has_designation(auth.uid(), 'admin'::app_designation) 
         OR has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Staff can view their own quick payments"
  ON public.quick_payments FOR SELECT
  USING (created_by = auth.uid());

-- Create quick_payment_bank_advice_history table
CREATE TABLE IF NOT EXISTS public.quick_payment_bank_advice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  generation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_count INTEGER NOT NULL,
  total_gross_amount NUMERIC NOT NULL DEFAULT 0,
  total_tds_amount NUMERIC NOT NULL DEFAULT 0,
  total_net_amount NUMERIC NOT NULL DEFAULT 0,
  payment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by UUID,
  file_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_payment_bank_advice_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quick_payment_bank_advice_history
CREATE POLICY "Admins and managers can insert quick payment bank advice history"
  ON public.quick_payment_bank_advice_history FOR INSERT
  WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation) 
              OR has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Admins and managers can view quick payment bank advice history"
  ON public.quick_payment_bank_advice_history FOR SELECT
  USING (has_designation(auth.uid(), 'admin'::app_designation) 
         OR has_designation(auth.uid(), 'manager'::app_designation));

-- Trigger for updated_at on quick_payment_types
CREATE TRIGGER update_quick_payment_types_updated_at
  BEFORE UPDATE ON public.quick_payment_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on quick_payments
CREATE TRIGGER update_quick_payments_updated_at
  BEFORE UPDATE ON public.quick_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on quick_payment_bank_advice_history
CREATE TRIGGER update_quick_payment_bank_advice_history_updated_at
  BEFORE UPDATE ON public.quick_payment_bank_advice_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default quick payment types
INSERT INTO public.quick_payment_types (type_code, type_name, description, display_order) VALUES
  ('vendor', 'Vendor Payment', 'Payments to suppliers and vendors', 1),
  ('patient', 'Patient Refund', 'Refunds to patients', 2),
  ('contractor', 'Contractor Payment', 'Payments to contractors', 3),
  ('staff_advance', 'Staff Advance', 'Advance payments to staff', 4),
  ('utility', 'Utility Bills', 'Electricity, water, and other utilities', 5),
  ('other', 'Other', 'Miscellaneous payments', 6)
ON CONFLICT (type_code) DO NOTHING;