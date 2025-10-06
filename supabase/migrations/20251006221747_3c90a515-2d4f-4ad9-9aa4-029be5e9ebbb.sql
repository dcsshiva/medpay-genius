-- Add visit_code column to visits table (without UNIQUE constraint initially)
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS visit_code TEXT;
CREATE INDEX IF NOT EXISTS idx_visits_visit_code ON public.visits(visit_code);

-- Create helper function to get financial year start date (April 1st)
CREATE OR REPLACE FUNCTION public.get_financial_year_start(visit_date DATE)
RETURNS DATE AS $$
BEGIN
  -- Financial year starts on April 1st
  IF EXTRACT(MONTH FROM visit_date) >= 4 THEN
    -- If month is April or later, FY starts this year
    RETURN DATE(EXTRACT(YEAR FROM visit_date) || '-04-01');
  ELSE
    -- If month is before April, FY started last year
    RETURN DATE((EXTRACT(YEAR FROM visit_date) - 1) || '-04-01');
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- Create function to generate visit code
CREATE OR REPLACE FUNCTION public.generate_visit_code()
RETURNS TRIGGER AS $$
DECLARE
  doctor_code_val TEXT;
  date_str TEXT;
  seq_num INTEGER;
  new_code TEXT;
  fy_start DATE;
BEGIN
  -- Get doctor code
  SELECT doctor_code INTO doctor_code_val
  FROM public.doctors
  WHERE id = NEW.doctor_id;
  
  -- Format date as DDMMYY (e.g., 060125)
  date_str := TO_CHAR(NEW.visit_date, 'DDMMYY');
  
  -- Get financial year start date
  fy_start := public.get_financial_year_start(NEW.visit_date);
  
  -- Get next sequential number for this doctor in current financial year
  SELECT COALESCE(MAX(
    CAST(
      SPLIT_PART(visit_code, '-', 3) AS INTEGER
    )
  ), 0) + 1
  INTO seq_num
  FROM public.visits
  WHERE doctor_id = NEW.doctor_id
    AND visit_date >= fy_start
    AND visit_date < (fy_start + INTERVAL '1 year')
    AND visit_code IS NOT NULL;
  
  -- Generate the code: AS001-060125-0001 (4 digits)
  new_code := doctor_code_val || '-' || date_str || '-' || LPAD(seq_num::TEXT, 4, '0');
  
  NEW.visit_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-generate visit code on INSERT
DROP TRIGGER IF EXISTS trigger_generate_visit_code ON public.visits;
CREATE TRIGGER trigger_generate_visit_code
  BEFORE INSERT ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_visit_code();

-- Backfill existing records with proper visit codes using a CTE approach
WITH ranked_visits AS (
  SELECT 
    v.id,
    d.doctor_code || '-' || 
    TO_CHAR(v.visit_date, 'DDMMYY') || '-' || 
    LPAD(
      ROW_NUMBER() OVER (
        PARTITION BY v.doctor_id, 
        public.get_financial_year_start(v.visit_date)
        ORDER BY v.visit_date, v.created_at
      )::TEXT, 
      4, 
      '0'
    ) as new_visit_code
  FROM public.visits v
  JOIN public.doctors d ON d.id = v.doctor_id
  WHERE v.visit_code IS NULL
)
UPDATE public.visits v
SET visit_code = rv.new_visit_code
FROM ranked_visits rv
WHERE v.id = rv.id;

-- Now add the UNIQUE constraint
ALTER TABLE public.visits ADD CONSTRAINT visits_visit_code_key UNIQUE (visit_code);