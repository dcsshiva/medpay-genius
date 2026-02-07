
## Fix Quick Access Real-time Data and Session Persistence on Refresh

### Problem 1: Quick Access Shows Stale Data

The `useQuickAccessItems` hook fetches data once and caches it for 5 minutes. It does NOT use Supabase Realtime, so changes to `navigation_analytics` (new clicks) are not reflected until the cache expires. Additionally, the `navigation_analytics` table is NOT published to Supabase Realtime.

**Fix:**
- Add `navigation_analytics` to the `supabase_realtime` publication (database migration)
- Update `useQuickAccessItems` to subscribe to Realtime INSERT events on `navigation_analytics`
- When a new row is inserted, immediately re-fetch the ranking data (bypassing the 5-minute cache)

---

### Problem 2: Page Refresh Causes Automatic Logout

**Root Cause Chain:**

1. The Supabase client is configured with `persistSession: false` and no-op storage -- Supabase auth sessions are deliberately NOT persisted
2. The app uses a custom session system: session tokens stored in `sessionStorage` (survives refresh), session data in `user_sessions` table
3. On page refresh, `loadSession()` in `auth.tsx` tries to query `user_sessions` using the stored token
4. **The `user_sessions` SELECT RLS policy requires `user_id = auth.uid()`**
5. Since the Supabase auth session was lost on refresh, `auth.uid()` is NULL
6. The query returns no rows -- user appears not logged in
7. `Index.tsx` redirects to `/auth` -- user is logged out

The same issue affects the session timeout hook's `checkSessionStatus()` and `updateActivity()` functions, which also query/update `user_sessions` with RLS policies requiring `auth.uid()`.

**Fix:**
Create three SECURITY DEFINER RPC functions that bypass RLS to perform session operations using the session token as authentication (the token itself acts as a bearer credential):

1. **`get_session_by_token(token)`** -- Read session data by token (used on page load)
2. **`update_session_activity(token)`** -- Update last_activity_at timestamp (used by session timeout)
3. **`invalidate_session_by_token(token)`** -- Deactivate a session (used on logout)

Then update the application code to use these RPCs instead of direct table queries.

---

### Implementation Details

#### Step 1: Database Migration

Create a migration with:

```sql
-- 1. RPC: Get session by token (for page refresh recovery)
CREATE OR REPLACE FUNCTION get_session_by_token(_token text)
RETURNS TABLE (
  id uuid, user_id uuid, user_type text, original_id uuid,
  session_token text, refresh_token text, username text, full_name text,
  role text, expires_at timestamptz, created_at timestamptz,
  updated_at timestamptz, is_active boolean, last_activity_at timestamptz,
  idle_timeout_seconds integer, warning_shown_at timestamptz,
  timeout_warnings_count integer
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT * FROM user_sessions
  WHERE session_token = _token
    AND is_active = true
    AND expires_at > now()
  LIMIT 1;
$$;

-- 2. RPC: Update session activity (for timeout tracking)
CREATE OR REPLACE FUNCTION update_session_activity(_token text)
RETURNS void
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE user_sessions
  SET last_activity_at = now(), warning_shown_at = NULL, updated_at = now()
  WHERE session_token = _token AND is_active = true;
$$;

-- 3. RPC: Invalidate session by token (for logout)
CREATE OR REPLACE FUNCTION invalidate_session_by_token(_token text)
RETURNS void
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE user_sessions
  SET is_active = false, updated_at = now()
  WHERE session_token = _token;
$$;

-- 4. Enable Realtime for navigation_analytics
ALTER PUBLICATION supabase_realtime ADD TABLE public.navigation_analytics;
```

#### Step 2: Update `src/lib/auth.tsx`

- **`getActiveSession()`**: Replace direct `supabase.from('user_sessions').select(...)` with `supabase.rpc('get_session_by_token', { _token: sessionToken })`
- **`invalidateSession()`**: Replace direct UPDATE with `supabase.rpc('invalidate_session_by_token', { _token: token })`

#### Step 3: Update `src/hooks/useSessionTimeout.tsx`

- **`updateActivity()`**: Replace direct UPDATE on `user_sessions` with `supabase.rpc('update_session_activity', { _token: sessionToken })`
- **`checkSessionStatus()`**: Replace direct SELECT with `supabase.rpc('get_session_by_token', { _token: sessionToken })`
- **`showTimeoutWarning()`**: Create an additional RPC or adjust the update query to use token-based access

#### Step 4: Update `src/hooks/useQuickAccessItems.tsx`

- Add Supabase Realtime subscription to `navigation_analytics` table (INSERT events)
- On receiving a new insert event, immediately re-fetch ranking data (reset the cache timer)
- Keep the 5-minute polling as a fallback
- Properly clean up the subscription on unmount

---

### Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/...` | **Create** | RPC functions + Realtime publication |
| `src/lib/auth.tsx` | **Modify** | Use RPCs for getActiveSession and invalidateSession |
| `src/hooks/useSessionTimeout.tsx` | **Modify** | Use RPCs for session queries/updates |
| `src/hooks/useQuickAccessItems.tsx` | **Modify** | Add Realtime subscription for live updates |

---

### Security Considerations

- The SECURITY DEFINER RPCs use the session token as authentication -- knowing the token is equivalent to being authenticated
- Session tokens are random, time-limited (24h), and stored only in `sessionStorage` (same-tab only)
- The RPCs only allow reading/updating sessions that are active and not expired
- No sensitive data is exposed beyond what the token owner already has access to

### Expected Results

**After fix:**
- Quick Access updates immediately when any user clicks a navigation item (real-time)
- Page refresh no longer logs users out -- session persists as long as the tab is open and the session hasn't expired
- Session timeout continues to work correctly after refresh
