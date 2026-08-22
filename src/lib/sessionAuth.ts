/**
 * Helper functions for authenticating edge function calls.
 *
 * The app supports two session types:
 *  - Legacy custom sessions stored in `user_sessions` (token in localStorage)
 *  - Real Supabase auth sessions (email OTP, mobile OTP, username + password)
 *
 * Edge functions accept either, so we send the custom token when present and
 * otherwise let the Supabase client attach its own Authorization JWT.
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Get session token from localStorage
 */
export const getSessionToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('supabase_session_token');
};

/**
 * Headers for edge function calls. Never throws when a real Supabase session
 * exists — that session is validated server-side from the Authorization header.
 */
export const getSessionAuthHeaders = async (): Promise<Record<string, string>> => {
  const sessionToken = getSessionToken();
  if (sessionToken) {
    return { 'X-Session-Token': sessionToken };
  }

  const { data } = await supabase.auth.getSession();
  if (data?.session?.access_token) {
    // supabase.functions.invoke already sends this, but set it explicitly so
    // the header is present even when a custom fetch is used.
    return { Authorization: `Bearer ${data.session.access_token}` };
  }

  throw new Error('No active session found. Please sign in again.');
};
