-- Function to fetch staff auth email by username, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_staff_auth_email(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.staff WHERE username = _username LIMIT 1;
$$;