
## Stabilize Login by Fixing Edge Function Health + Browser CORS Compatibility

### What I found
- Your Supabase screenshot shows **Auth is healthy** but **Edge Functions are unhealthy**.
- I checked live function behavior:
  - `send-otp`, `verify-otp`, `create-user`, `update-user-credentials`, etc. are reachable and returning expected auth/validation errors when called directly.
  - `chatbot` is repeatedly throwing `TypeError: messages is not iterable` (confirmed in edge logs), which can keep Edge Functions in an unhealthy state.
- I also found a likely browser-side blocker for OTP login:
  - Most edge functions use limited CORS headers:
    - `authorization, x-client-info, apikey, content-type`
  - They are missing modern Supabase client headers:
    - `x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`
  - This can cause browser preflight failure (`Failed to fetch`) even when function code is otherwise fine.

---

## Implementation approach

### 1) Fix the unhealthy function behavior (chatbot)
**File:** `supabase/functions/chatbot/index.ts`

- Add safe request parsing:
  - If request body is empty/invalid JSON, return `400` (not `500`)
  - Validate `messages` is an array before using `...messages`
- Add a lightweight health response:
  - For `GET` (or `GET /`), return `200` with `{ ok: true }`
- Keep current streaming behavior unchanged for valid chat requests.

**Why:** Prevent repeated runtime 500s from malformed pings/requests, which likely drives the “Edge Functions unhealthy” state.

---

### 2) Standardize CORS headers on all browser-invoked functions
**Files:**
- `supabase/functions/send-otp/index.ts`
- `supabase/functions/verify-otp/index.ts`
- `supabase/functions/create-user/index.ts`
- `supabase/functions/update-user-credentials/index.ts`
- `supabase/functions/get-user-emails/index.ts`
- `supabase/functions/sync-auth-emails/index.ts`

- Update `Access-Control-Allow-Headers` to include the full Supabase browser header set:
  - `authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`
- Ensure OPTIONS preflight always returns these headers.

**Why:** This removes browser preflight incompatibilities that surface as login “Failed to fetch” on mobile OTP flows.

---

### 3) Harden request validation to avoid false unhealthy signals
**Same edge function files as above**

- Ensure non-OPTIONS requests with bad/empty JSON return `400` with clear error payload (not uncaught exceptions/500).
- Keep authorization checks as-is (401/403 where appropriate).

**Why:** Avoid health monitor noise and improve observability.

---

### 4) Improve client-side login error clarity (small UX hardening)
**File:** `src/lib/auth.tsx`

- In `sendMobileOTP` and `verifyMobileOTP` catch blocks:
  - Normalize Supabase function errors into user-friendly messages
  - Distinguish connectivity/CORS vs validation errors
- Keep existing auth recovery logic (local auth cache cleanup + retry) unchanged.

**Why:** Users/admins can quickly tell whether issue is input-related, permissions-related, or network/CORS-related.

---

## Validation checklist after implementation

1. **Edge health**
   - Supabase dashboard should move from “Edge Functions Unhealthy” to healthy after error rate drops.
2. **Mobile OTP login**
   - `send-otp` works from browser preview without preflight errors.
   - `verify-otp` completes and session is established.
3. **Email OTP login**
   - Still works as before (no regressions).
4. **Logs**
   - No recurring `messages is not iterable` in chatbot logs.
5. **Cross-project confidence**
   - Apply same function-header and chatbot hardening pattern to your other affected workspace projects (`kmm connect`, `HealthCore Foundation`) if they share this edge function structure.

---

## Technical notes / risk control
- This is a low-risk hardening pass: no schema migration, no auth model rewrite.
- Primary risk is accidental response-shape change in edge functions; we’ll preserve existing success/error JSON contracts.
- The fix targets both symptoms:
  - unhealthy edge status (chatbot 500 loop)
  - browser login failures tied to CORS preflight header mismatch.
