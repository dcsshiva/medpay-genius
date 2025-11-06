-- Fix the get_user_role function to check user_sessions instead of profiles
-- This aligns with the application's session-based role management

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- First check user_sessions for active sessions (primary source)
  SELECT role::user_role 
  FROM public.user_sessions 
  WHERE user_id = user_uuid 
    AND is_active = true 
    AND expires_at > now()
  ORDER BY last_activity_at DESC
  LIMIT 1;
$$;

-- Make user_id NOT NULL in profiles table for security
-- This prevents RLS bypass vulnerabilities
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;

-- Add a comment explaining the security requirement
COMMENT ON COLUMN public.profiles.user_id IS 
'User ID reference - MUST NOT be NULL for RLS security';
