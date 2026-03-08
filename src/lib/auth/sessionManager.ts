import { supabase } from '@/integrations/supabase/client';

// Session storage functions - all data stored in Supabase
export const createUserSession = async (sessionData: {
  user_type: string;
  original_id: string;
  user_id: string;
  username: string;
  full_name: string;
  role: string;
}) => {
  const sessionToken = crypto.randomUUID();
  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  // Set timeout duration based on role
  const timeoutDuration = ['admin', 'manager'].includes(sessionData.role) ? 300 : 180;

  // Use server-side validated session creation to prevent role escalation
  const { data, error } = await (supabase.rpc as any)('create_validated_session', {
    _user_id: sessionData.user_id,
    _user_type: sessionData.user_type,
    _original_id: sessionData.original_id,
    _session_token: sessionToken,
    _refresh_token: refreshToken,
    _username: sessionData.username,
    _full_name: sessionData.full_name,
    _role: sessionData.role, // Will be validated server-side against user_designations
    _expires_at: expiresAt.toISOString(),
    _idle_timeout_seconds: timeoutDuration,
  });

  if (error) throw error;
  
  window.localStorage.setItem('supabase_session_token', sessionToken);
  
  // Fetch the created session to return full data
  const session = await getActiveSession();
  return session;
};

export const getActiveSession = async () => {
  const sessionToken = window.localStorage.getItem('supabase_session_token');
  if (!sessionToken) return null;

  const { data, error } = await supabase
    .rpc('get_session_by_token', { _token: sessionToken });

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    window.localStorage.removeItem('supabase_session_token');
    return null;
  }

  return Array.isArray(data) ? data[0] : data;
};

export const invalidateSession = async (sessionToken?: string) => {
  const token = sessionToken || window.localStorage.getItem('supabase_session_token');
  if (!token) return;

  await supabase.rpc('invalidate_session_by_token', { _token: token });
  window.localStorage.removeItem('supabase_session_token');
};

// Comprehensive auth state cleanup
export const hardResetAuthState = async () => {
  if (typeof window === 'undefined') return;

  const clearSupabaseKeys = (storage: Storage) => {
    const keysToRemove = Object.keys(storage).filter(
      (key) => key.startsWith('sb-') || key.includes('supabase')
    );
    keysToRemove.forEach((key) => storage.removeItem(key));
  };

  clearSupabaseKeys(window.localStorage);
  clearSupabaseKeys(window.sessionStorage);
  window.localStorage.removeItem('supabase_session_token');
  window.localStorage.removeItem('emergency_session');

  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (_) {}

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    } catch (_) {}
  }

  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (_) {}
  }
};

export const isFetchError = (err: any): boolean => {
  if (!err) return false;
  const msg = err?.message || err?.error_description || String(err);
  return /failed to fetch|networkerror|network request failed|load failed/i.test(msg);
};
