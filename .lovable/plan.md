
## Fix: RLS Policies Not Working After Login (Email OTP & Mobile OTP)

### Root Cause

The Supabase client in `src/integrations/supabase/client.ts` is configured with:
- `persistSession: false`
- Dummy storage that always returns `null`

This means:
1. When a user logs in via email OTP or mobile OTP, `supabase.auth.verifyOtp()` creates a real Supabase session **in memory only**
2. On any page refresh or app reload, the session is lost
3. `auth.uid()` returns `null` in all RLS policy checks
4. All RLS-protected queries return empty results (e.g., Doctor Hub shows "No doctors found")

Both email OTP and mobile OTP logins are affected identically because both rely on `supabase.auth.verifyOtp()` for the real auth session.

### Solution

Enable proper Supabase session persistence so `auth.uid()` works in RLS policies at all times.

### Changes

#### 1. Fix Supabase Client Configuration (`src/integrations/supabase/client.ts`)

Remove the dummy storage and `persistSession: false` settings. Use the default `localStorage`-based persistence that Supabase provides out of the box:

```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
```

This allows the Supabase client to:
- Store the auth session in `localStorage` automatically
- Restore it on page refresh
- Auto-refresh tokens when they expire

#### 2. Update Auth Provider Session Loading (`src/lib/auth.tsx`)

Update `loadSession` to:
- First check for a real Supabase auth session via `supabase.auth.getSession()`
- Set up `onAuthStateChange` listener to react to auth state changes (login, logout, token refresh)
- Fall back to the custom `user_sessions` table only when no Supabase session exists (for legacy username/password logins)
- When a real Supabase session is found, populate userRole, userProfile, and userDesignation from `user_designations` table

#### 3. Update Sign Out (`src/lib/auth.tsx`)

Ensure `signOut` always calls `supabase.auth.signOut()` regardless of login method, since all OTP logins now create real persistent sessions.

### What This Fixes

- Email OTP login: Session persists across page refreshes, `auth.uid()` works in RLS
- Mobile OTP login: Same -- the magic link token creates a real session that persists
- Both login methods produce identical auth behavior
- All RLS policies (doctors, payments, visits, etc.) work correctly for both methods

### Files to Modify

| File | Change |
|------|--------|
| `src/integrations/supabase/client.ts` | Remove dummy storage and `persistSession: false` |
| `src/lib/auth.tsx` | Add `onAuthStateChange` listener, prioritize real Supabase session on load |

### What Stays the Same

- The custom `user_sessions` table continues to work for session tracking, idle timeout, and login history
- Username/password login via `verify_user_login` RPC still works as a fallback
- All existing RLS policies remain unchanged -- they already use `auth.uid()` and `has_designation()` correctly
