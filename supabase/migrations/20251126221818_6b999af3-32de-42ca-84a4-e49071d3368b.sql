-- Create payment_releases table for tracking partial payments
CREATE TABLE public.payment_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  release_number INTEGER NOT NULL DEFAULT 1,
  release_percentage NUMERIC NOT NULL,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  tds_percentage NUMERIC NOT NULL DEFAULT 10,
  tds_amount NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  release_status TEXT NOT NULL DEFAULT 'pending',
  bank_advice_generated BOOLEAN NOT NULL DEFAULT false,
  bank_advice_generated_at TIMESTAMPTZ,
  bank_advice_generated_by UUID REFERENCES public.profiles(id),
  bank_advice_reference TEXT,
  released_by UUID REFERENCES public.profiles(id),
  released_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add tracking columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS total_released_gross NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_released_tds NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_released_net NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS release_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS release_status TEXT DEFAULT 'not_started';

-- Enable RLS on payment_releases
ALTER TABLE public.payment_releases ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_releases
CREATE POLICY "Admins can manage all payment releases"
ON public.payment_releases
FOR ALL
USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Managers can manage payment releases"
ON public.payment_releases
FOR ALL
USING (has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Doctors can view their own payment releases"
ON public.payment_releases
FOR SELECT
USING (
  payment_id IN (
    SELECT p.id FROM public.payments p
    JOIN public.doctors d ON p.doctor_id = d.id
    WHERE d.user_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX idx_payment_releases_payment_id ON public.payment_releases(payment_id);
CREATE INDEX idx_payment_releases_release_status ON public.payment_releases(release_status);

-- Trigger to update updated_at
CREATE TRIGGER update_payment_releases_updated_at
BEFORE UPDATE ON public.payment_releases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();