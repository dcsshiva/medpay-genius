-- Fix user_sessions RLS policies to allow session creation with custom auth
-- Drop existing policy that blocks session creation
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;

-- Allow anyone to INSERT sessions (authentication verified by verify_user_login SECURITY DEFINER function)
CREATE POLICY "Anyone can create sessions"
ON public.user_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow users to SELECT their own sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
TO anon, authenticated
USING (
  (user_id = auth.uid()) 
  OR (session_token = current_setting('app.current_session_token'::text, true))
);

-- Allow users to UPDATE their own sessions
CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
TO anon, authenticated
USING (
  (user_id = auth.uid()) 
  OR (session_token = current_setting('app.current_session_token'::text, true))
);

-- Allow users to DELETE their own sessions
CREATE POLICY "Users can delete their own sessions"
ON public.user_sessions
FOR DELETE
TO anon, authenticated
USING (
  (user_id = auth.uid()) 
  OR (session_token = current_setting('app.current_session_token'::text, true))
);