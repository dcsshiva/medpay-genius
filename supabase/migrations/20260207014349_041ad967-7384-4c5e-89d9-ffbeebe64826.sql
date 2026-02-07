
-- 1. RPC: Get session by token (for page refresh recovery)
CREATE OR REPLACE FUNCTION public.get_session_by_token(_token text)
RETURNS TABLE (
  id uuid, user_id uuid, user_type text, original_id uuid,
  session_token text, refresh_token text, username text, full_name text,
  role text, expires_at timestamptz, created_at timestamptz,
  updated_at timestamptz, is_active boolean, last_activity_at timestamptz,
  idle_timeout_seconds integer, warning_shown_at timestamptz,
  timeout_warnings_count integer
)
LANGUAGE sql SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id, user_id, user_type, original_id,
         session_token, refresh_token, username, full_name,
         role, expires_at, created_at,
         updated_at, is_active, last_activity_at,
         idle_timeout_seconds, warning_shown_at,
         timeout_warnings_count
  FROM user_sessions
  WHERE session_token = _token
    AND is_active = true
    AND expires_at > now()
  LIMIT 1;
$$;

-- 2. RPC: Update session activity (for timeout tracking)
CREATE OR REPLACE FUNCTION public.update_session_activity(_token text)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE user_sessions
  SET last_activity_at = now(), warning_shown_at = NULL, updated_at = now()
  WHERE session_token = _token AND is_active = true;
$$;

-- 3. RPC: Invalidate session by token (for logout)
CREATE OR REPLACE FUNCTION public.invalidate_session_by_token(_token text)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE user_sessions
  SET is_active = false, updated_at = now()
  WHERE session_token = _token;
$$;

-- 4. RPC: Update session warning (for timeout warning tracking)
CREATE OR REPLACE FUNCTION public.update_session_warning(_token text)
RETURNS TABLE (timeout_warnings_count integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT us.timeout_warnings_count INTO current_count
  FROM user_sessions us
  WHERE us.session_token = _token AND us.is_active = true;

  UPDATE user_sessions
  SET warning_shown_at = now(),
      timeout_warnings_count = COALESCE(current_count, 0) + 1,
      updated_at = now()
  WHERE session_token = _token AND is_active = true;

  RETURN QUERY SELECT COALESCE(current_count, 0) + 1;
END;
$$;

-- 5. Enable Realtime for navigation_analytics
ALTER PUBLICATION supabase_realtime ADD TABLE public.navigation_analytics;
