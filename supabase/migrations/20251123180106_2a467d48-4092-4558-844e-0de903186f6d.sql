-- Remove insecure RLS policies that reference session tokens via current_setting
-- This prevents session token leakage through database logs and query inspection

-- Drop existing policies that use current_setting
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;

-- Create secure policies that rely solely on auth.uid()
-- Session validation should be done in application layer or edge functions

CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
TO anon, authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
TO anon, authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
ON public.user_sessions
FOR DELETE
TO anon, authenticated
USING (user_id = auth.uid());

-- Note: INSERT policy remains unchanged (users can only insert their own sessions)
-- This is handled by the existing "Users can insert their own sessions" policy