CREATE OR REPLACE FUNCTION public.get_session_by_token(_token text)
RETURNS TABLE (
  id uuid, user_id uuid, user_type text, original_id uuid,
  session_token text, refresh_token text, username text, full_name text,
  role text, expires_at timestamptz, created_at timestamptz,
  updated_at timestamptz, is_active boolean, last_activity_at timestamptz,
  idle_timeout_seconds integer, warning_shown_at timestamptz,
  timeout_warnings_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, user_id, user_type, original_id,
         session_token, refresh_token, username, full_name,
         role, expires_at, created_at,
         updated_at, is_active, last_activity_at,
         idle_timeout_seconds, warning_shown_at,
         timeout_warnings_count
  FROM public.user_sessions
  WHERE session_token = _token
    AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Session timeouts are disabled for WestMed; sessions remain valid until explicit logout.
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_user_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Session timeouts are disabled for WestMed; sessions remain valid until explicit logout.
  RETURN 0;
END;
$$;