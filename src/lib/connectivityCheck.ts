const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Pings the Supabase project with a 5-second timeout.
 * Returns true if reachable, false otherwise.
 */
export async function checkSupabaseReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
