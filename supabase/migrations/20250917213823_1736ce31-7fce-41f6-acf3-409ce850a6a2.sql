-- Create user sessions table to store all login data in Supabase
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_type text NOT NULL, -- 'staff', 'doctor', 'supabase_auth'
  original_id uuid, -- staff/doctor ID from their respective tables
  session_token text NOT NULL UNIQUE,
  refresh_token text,
  username text,
  full_name text,
  role text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user sessions
CREATE POLICY "Users can manage their own sessions"
ON public.user_sessions
FOR ALL
USING (user_id::text = auth.uid()::text OR session_token = current_setting('app.current_session_token', true));

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
END;
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_user_sessions_updated_at
BEFORE UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();