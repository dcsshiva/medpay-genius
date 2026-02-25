
Goal: resolve the remaining login failure loop by fixing the part that still happens before your current recovery logic can help.

What I verified from your latest evidence:
- In your browser preview, requests to `POST /auth/v1/token?grant_type=refresh_token` and `POST /auth/v1/otp` still fail with `TypeError: Failed to fetch`.
- The failing refresh token value is very short (`3ftjehm6fgdr`), which is not a normal Supabase refresh token shape.
- I reproduced the same login flow in a clean remote browser session and OTP send succeeds (`200`), which strongly indicates a persisted client-state/runtime problem rather than an always-broken backend endpoint.
- Edge Function health being unhealthy is still important, but your current blocker is Auth API fetch from affected browser state.

Do I know what the issue is?
- Yes: the failure is most likely caused by corrupted/stale persisted auth state (and possibly stale service worker state) being loaded too early by Supabase client initialization, creating a refresh loop that poisons OTP calls before your current in-app recovery can fully stabilize.

Implementation approach (next patch)
1) Prevent bad auth state from ever being loaded at client bootstrap
- File: `src/integrations/supabase/client.ts`
- Add explicit `createClient(..., { auth: ... })` config with a storage wrapper that validates persisted auth payload before returning it to Supabase.
- If stored auth payload is malformed (missing/invalid refresh token shape), remove it and return `null`.
- Add a storage key version bump (e.g. new auth storage key suffix) to hard-cut old corrupted persisted sessions.
- Why: this runs earlier than `AuthProvider` recovery, preventing refresh-loop startup.

2) Fully stop stale SW control during “Fix Login”
- File: `src/lib/auth.tsx`
- Extend `hardResetAuthState` to:
  - unregister all service workers (`navigator.serviceWorker.getRegistrations().unregister()`),
  - then clear caches,
  - then clear auth keys and local signout.
- Keep existing storage cleanup, but strengthen key matching and malformed-token detection (accept both top-level and nested Supabase token formats).
- Why: clearing cache alone does not remove a stale controlling service worker.

3) Add a pre-auth refresh-loop kill switch
- File: `src/lib/auth.tsx`
- Before normal `getSession`, detect repeated fetch failure patterns; on trigger:
  - stop auto-refresh attempts,
  - clear in-memory + persisted auth,
  - attempt one clean re-init path only.
- Ensure no infinite retry loops.
- Why: prevents repeated failed refresh attempts from starving login requests.

4) Remove Supabase API runtime caching from PWA strategy
- File: `vite.config.ts`
- Remove/limit the Workbox runtime cache rule that targets `*.supabase.co`.
- Keep static asset/image caching only.
- Why: Auth/API traffic should not be part of app-level runtime cache behavior; this avoids stale or undefined behavior across releases.

5) Improve user-facing diagnostics on auth failures
- Files: `src/lib/auth.tsx`, `src/pages/Auth.tsx`
- Differentiate these cases in message copy:
  - “Service unreachable from this browser runtime”
  - “Invalid OTP/email”
  - “Login state corrupted and reset performed”
- Keep “Fix Login” as a one-click action, but confirm completion text after reset path succeeds.

Validation plan
1. In affected preview session:
- Click “Fix Login” once.
- Confirm service workers are unregistered, caches cleared, and page reloads.
- Confirm refresh-token loop no longer appears immediately.

2. Email OTP:
- `POST /auth/v1/otp` should return 200 or a normal API error body (not Failed to fetch).

3. Mobile OTP:
- `send-otp` and `verify-otp` should behave normally.

4. Regression checks:
- Existing signed-in users should only be logged out once due to storage key migration.
- Published URL and preview URL both tested.

5. Cross-project reuse:
- Apply same bootstrap storage guard + SW unregister + PWA cache scope fix to `kmm connect` and `HealthCore Foundation` for consistent behavior.

Risk and tradeoffs
- Short-term impact: users may need one-time re-login (expected and acceptable for stabilization).
- Benefit: removes persistent “stuck browser state” as a class of issues and reduces repeated support loops.

Technical execution order
1. `client.ts` bootstrap guard + storage key version
2. `auth.tsx` hard reset upgrade + refresh-loop kill switch
3. `vite.config.ts` runtime cache scope tightening
4. auth error message normalization in UI
5. verify end-to-end in preview and published
