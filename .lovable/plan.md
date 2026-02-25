
## Stabilize OTP Login for Persistent “Failed to fetch” in Preview (Auth API path)

### What I verified from the current state
- The user-facing error is at **Email OTP send** (`Failed to Send OTP -> Failed to fetch`), not only mobile OTP.
- Recent network traces show repeated failures to:
  - `POST /auth/v1/token?grant_type=refresh_token`
  - `POST /auth/v1/otp`
- The failing calls are against **Supabase Auth endpoints** (not edge functions), so fixing only edge functions is not enough.
- In this codebase, auth recovery currently clears only `sb-*-auth-token` + local signOut, but repeated refresh loops can still continue in some browsers/sessions.
- The app also uses PWA/service worker + cached runtime routes, which can make stale/broken client state persist longer across reloads.

---

## Root issue framing
This is a **client-session corruption + persistent browser state** problem on top of network fetch failures:
1. stale/corrupted Supabase auth artifacts can keep refresh loops alive
2. OTP calls then fail in the same broken state
3. users remain stuck unless they manually clear browser storage/cache

So the fix should be **self-healing inside the app**, not only backend-side.

---

## Implementation plan

### 1) Expand auth self-healing to a full “hard reset” path
**File:** `src/lib/auth.tsx`

Add a stronger recovery helper (keep current one, but extend it):
- clear all likely Supabase auth storage keys (not only exact `sb-*-auth-token`, also variant/migrated keys)
- clear auth keys from both `localStorage` and `sessionStorage`
- local-only `supabase.auth.signOut({ scope: "local" })`
- invalidate app custom token (`supabase_session_token`) when appropriate
- optionally clear stale service worker caches used by this app (only in recovery flow, not normal flow)

Use this helper in:
- initial session bootstrap (`loadSession`) when any auth fetch failure occurs
- `signInWithOTP` retry path
- `verifyOTP` retry path
- `sendMobileOTP` retry path
- `verifyMobileOTP` retry path

Retry behavior:
- on fetch/network-like auth failure, run recovery once and retry once
- prevent infinite retries

---

### 2) Add targeted detection for “broken persisted session loop”
**File:** `src/lib/auth.tsx`

Introduce a guard that detects obviously invalid persisted session payloads (e.g., malformed refresh token/session shape) before normal auth flow proceeds.

If malformed:
- immediately run recovery helper
- skip auto-refresh loop startup from broken state

This stops endless `grant_type=refresh_token` failing loops from poisoning login attempts.

---

### 3) Expose a user-triggered “Fix Login” action on Auth screen
**File:** `src/pages/Auth.tsx`

Add a small secondary button in the login page, e.g.:
- “Having trouble signing in? Fix login”
- calls a recovery function from auth context (`repairAuthState`)

Behavior:
- clears stale auth/browser state safely
- reloads the page
- shows clear toast message (“Login state reset. Please try OTP again.”)

This gives non-technical users a one-click recovery instead of manual cache/storage clearing.

---

### 4) Improve error messaging for faster diagnosis
**Files:** `src/lib/auth.tsx`, `src/pages/Auth.tsx`

Normalize fetch failures into clearer messages:
- distinguish “network/auth service unreachable” vs “invalid email/OTP”
- keep existing destructive toast style but with actionable copy

Example intent:
- “Couldn’t reach sign-in service. We reset local login state and retried. Please try once more.”

---

### 5) Keep existing edge-function CORS hardening (already done), no rollback there
No additional edge CORS changes for this pass unless logs prove new preflight failures. Current user symptom is Auth API path (`/auth/v1/*`).

---

## Validation checklist after implementation
1. Fresh load on `/` with stale storage present:
   - no endless refresh-token failure loop
2. Click **Send 6-Digit OTP**:
   - request succeeds or fails with clear, specific message
3. If first call fails:
   - app auto-recovers once and retries
4. “Fix Login” button:
   - clears broken state and allows OTP flow to proceed
5. Repeat in preview and published URLs
6. Confirm this pattern can be reused in the other affected workspace projects (`kmm connect`, `HealthCore Foundation`)

---

## Technical notes
- This plan focuses on resilient client recovery because the failing path is `supabase.co/auth/v1/*`, not just edge functions.
- It avoids schema changes/migrations and keeps auth model intact.
- Risk is low; behavior changes are limited to error/recovery paths and explicit user recovery action.
