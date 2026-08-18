ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS biometric_code text,
  ADD COLUMN IF NOT EXISTS biometric_device text;

CREATE UNIQUE INDEX IF NOT EXISTS staff_biometric_code_unique
  ON public.staff (lower(btrim(biometric_code)))
  WHERE biometric_code IS NOT NULL AND btrim(biometric_code) <> '';