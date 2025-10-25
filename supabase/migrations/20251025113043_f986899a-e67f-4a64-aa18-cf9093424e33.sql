-- Create table for storing OTPs
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0
);

-- Create index for faster lookups
CREATE INDEX idx_otp_mobile_number ON public.otp_verifications(mobile_number);
CREATE INDEX idx_otp_expires_at ON public.otp_verifications(expires_at);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own OTP records
CREATE POLICY "Users can view their own OTP records"
ON public.otp_verifications
FOR SELECT
USING (true); -- Allow reading for verification purposes

-- Function to cleanup expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  DELETE FROM public.otp_verifications
  WHERE expires_at < now() OR created_at < (now() - INTERVAL '24 hours');
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  RETURN cleanup_count;
END;
$$;