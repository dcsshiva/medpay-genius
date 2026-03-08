
-- FIX #1: PRIVILEGE ESCALATION on user_sessions
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.user_sessions;

CREATE POLICY "Users can create own sessions"
  ON public.user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update get_user_role() to use user_designations
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
  RETURNS user_role
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
  SELECT 
    CASE d.designation
      WHEN 'admin' THEN 'admin'::user_role
      WHEN 'super_admin' THEN 'admin'::user_role
      WHEN 'manager' THEN 'manager'::user_role
      WHEN 'doctor' THEN 'doctor'::user_role
      ELSE 'staff'::user_role
    END
  FROM public.user_designations d
  WHERE d.user_id = user_uuid
  LIMIT 1;
$$;

-- Create validated session creation function
CREATE OR REPLACE FUNCTION public.create_validated_session(
  _user_id uuid,
  _user_type text,
  _original_id uuid,
  _session_token text,
  _refresh_token text,
  _username text,
  _full_name text,
  _role text,
  _expires_at timestamptz,
  _idle_timeout_seconds integer DEFAULT 180
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE
  validated_role text;
  session_id uuid;
BEGIN
  SELECT designation::text INTO validated_role
  FROM public.user_designations
  WHERE user_id = _user_id
  LIMIT 1;

  IF validated_role IS NULL THEN
    validated_role := 'staff';
  END IF;

  INSERT INTO public.user_sessions (
    user_id, user_type, original_id, session_token, refresh_token,
    username, full_name, role, expires_at, idle_timeout_seconds,
    last_activity_at, is_active
  ) VALUES (
    _user_id, _user_type, _original_id, _session_token, _refresh_token,
    _username, _full_name, validated_role, _expires_at, _idle_timeout_seconds,
    now(), true
  )
  RETURNING id INTO session_id;

  RETURN session_id;
END;
$$;

-- FIX #2: OTP codes readable by everyone
DROP POLICY IF EXISTS "Users can view their own OTP records" ON public.otp_verifications;

-- FIX #3: Staff basic info view
CREATE OR REPLACE VIEW public.staff_basic_info
WITH (security_invoker = on) AS
  SELECT 
    id, staff_code, full_name, role, department, 
    is_active, user_id, email, phone, created_at
  FROM public.staff;

-- FIX #4: Vendor data exposure
DROP POLICY IF EXISTS "Anyone can view active vendors" ON public.vendors;

CREATE POLICY "Authenticated users can view active vendors"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (is_active = true);
