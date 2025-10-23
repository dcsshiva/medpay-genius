-- Phase 1: Add TDS tracking columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_percentage NUMERIC DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0;

-- Update existing records with calculated TDS
UPDATE public.payments
SET 
  gross_amount = COALESCE(paid_amount, total_amount),
  tds_amount = COALESCE(paid_amount, total_amount) * 0.10,
  tds_percentage = 10.0,
  net_amount = COALESCE(paid_amount, total_amount) * 0.90
WHERE gross_amount = 0 OR gross_amount IS NULL;

-- Add helpful comments
COMMENT ON COLUMN public.payments.gross_amount IS 'Total amount before TDS deduction';
COMMENT ON COLUMN public.payments.tds_amount IS 'TDS deducted (typically 10%)';
COMMENT ON COLUMN public.payments.tds_percentage IS 'TDS percentage applied';
COMMENT ON COLUMN public.payments.net_amount IS 'Net amount after TDS deduction (transferred to doctor)';

-- Phase 2: Create TDS certificates table
CREATE TABLE IF NOT EXISTS public.tds_certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_number TEXT NOT NULL UNIQUE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  financial_year TEXT NOT NULL,
  quarter TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_gross_amount NUMERIC NOT NULL DEFAULT 0,
  total_tds_amount NUMERIC NOT NULL DEFAULT 0,
  total_net_amount NUMERIC NOT NULL DEFAULT 0,
  payment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  certificate_data JSONB,
  generated_by UUID,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tds_certificates_doctor ON public.tds_certificates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_tds_certificates_fy ON public.tds_certificates(financial_year);
CREATE INDEX IF NOT EXISTS idx_tds_certificates_quarter ON public.tds_certificates(quarter);

-- RLS Policies
ALTER TABLE public.tds_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage TDS certificates" ON public.tds_certificates;
CREATE POLICY "Admins can manage TDS certificates"
  ON public.tds_certificates FOR ALL
  USING (has_designation(auth.uid(), 'admin'::app_designation));

DROP POLICY IF EXISTS "Doctors can view their own TDS certificates" ON public.tds_certificates;
CREATE POLICY "Doctors can view their own TDS certificates"
  ON public.tds_certificates FOR SELECT
  USING (doctor_id IN (
    SELECT id FROM public.doctors WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Managers can view all TDS certificates" ON public.tds_certificates;
CREATE POLICY "Managers can view all TDS certificates"
  ON public.tds_certificates FOR SELECT
  USING (has_designation(auth.uid(), 'manager'::app_designation));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tds_certificates_updated_at ON public.tds_certificates;
CREATE TRIGGER update_tds_certificates_updated_at
  BEFORE UPDATE ON public.tds_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 3: Create function for TDS summary
CREATE OR REPLACE FUNCTION public.get_doctor_tds_summary(
  _start_date DATE,
  _end_date DATE,
  _doctor_id UUID DEFAULT NULL
)
RETURNS TABLE(
  doctor_id UUID,
  doctor_code TEXT,
  doctor_name TEXT,
  total_payments BIGINT,
  total_gross_amount NUMERIC,
  total_tds_amount NUMERIC,
  total_net_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as doctor_id,
    d.doctor_code,
    COALESCE(d.full_name, 'Doctor') as doctor_name,
    COUNT(p.id)::BIGINT as total_payments,
    COALESCE(SUM(p.gross_amount), 0) as total_gross_amount,
    COALESCE(SUM(p.tds_amount), 0) as total_tds_amount,
    COALESCE(SUM(p.net_amount), 0) as total_net_amount
  FROM public.doctors d
  LEFT JOIN public.payments p ON p.doctor_id = d.id
    AND p.bank_advice_generated = true
    AND p.period_end BETWEEN _start_date AND _end_date
  WHERE (_doctor_id IS NULL OR d.id = _doctor_id)
    AND d.is_active = true
  GROUP BY d.id, d.doctor_code, d.full_name
  HAVING COUNT(p.id) > 0 OR _doctor_id IS NOT NULL
  ORDER BY d.doctor_code;
END;
$$;