-- Create a function to periodically cleanup expired sessions (can be called via cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_user_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  cleanup_count integer;
BEGIN
  -- Mark expired sessions as inactive
  UPDATE public.user_sessions 
  SET is_active = false, updated_at = now()
  WHERE expires_at < now() AND is_active = true;
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Delete very old inactive sessions (older than 30 days)
  DELETE FROM public.user_sessions 
  WHERE is_active = false 
    AND updated_at < (now() - interval '30 days');
  
  RETURN cleanup_count;
END;
$$;