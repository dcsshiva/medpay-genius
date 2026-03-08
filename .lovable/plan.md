

# Application Testing Report & Recommended Modifications

After thoroughly reviewing the codebase, here are the issues and improvements I've identified as a tester, organized by severity.

---

## Critical Issues (Bugs)

### 1. Emergency Login Exposes Hardcoded OTP Codes in Source
**File:** `src/lib/auth.tsx` (lines 1134-1136)
**Problem:** Emergency OTP codes (`948693` for admin, `933892` for manager) are computed at runtime via `sha256('948693')` and `sha256('933892')` -- the plain-text values are visible in the source code comments (lines 21-24) and in the function body. Anyone inspecting the JS bundle can extract these codes.
**Fix:** Move emergency OTP validation to a server-side edge function. The client should send the OTP to the server which validates it and returns a session token. Never include plain-text OTPs or their computation in client-side code.

### 2. `signInWithEmail` Doesn't Resolve Doctor Table ID
**File:** `src/lib/auth.tsx` (lines 596-700)
**Problem:** The `signInWithEmail` function (password-based) sets `userProfile.id = data.user.id` (auth UUID) without calling `get_user_complete_profile`. If a doctor ever logs in via this path, Doctor Hub will be empty -- same bug that was just fixed for OTP but not applied here.
**Fix:** Add the same `get_user_complete_profile` RPC call and doctor ID resolution logic used in `verifyOTP`.

### 3. Missing Error Boundary at Route Level
**File:** `src/App.tsx`
**Problem:** The try-catch around the JSX return (lines 45-87) only catches synchronous render errors. React render errors in children (like `Index`, `Auth`) won't be caught. The `useAuth must be used within an AuthProvider` error is an example -- it crashes the whole app with a blank screen.
**Fix:** Add a proper React Error Boundary component wrapping the `<Routes>` block.

---

## High Priority (UX/Reliability)

### 4. Session Recovery Doesn't Populate `code` Field
**File:** `src/lib/auth.tsx` (line 412)
**Problem:** When restoring a custom session for a doctor, `code` is set to `undefined`. Components relying on `userProfile.code` (e.g., for display or filtering) will show incorrect data after a page refresh.
**Fix:** Fetch `p.code` from the `get_user_complete_profile` RPC result during session recovery and include it in the profile.

### 5. No Loading State After OTP Auto-Verify
**File:** `src/pages/Auth.tsx` (lines 77-81)
**Problem:** When auto-verify fires (6 digits entered), there's no visual loading indicator shown immediately. The user sees a brief unresponsive period before the toast/redirect.
**Fix:** Set `formLoading = true` at the start of the auto-verify useEffect before calling `handleVerifyOTP`.

### 6. DoctorHub Makes N+1 Queries
**File:** `src/components/DoctorHub.tsx` (lines 103-176)
**Problem:** For each doctor, the component fires 3 separate Supabase queries (paid payments, unprocessed visits, pending payment visits). For 50 doctors, that's 150 network requests.
**Fix:** Create a single database function `get_doctor_summaries(filter_doctor_id)` that returns all summary data in one query.

### 7. Duplicate `useAuth()` Calls in Auth.tsx
**File:** `src/pages/Auth.tsx` (lines 27, 32)
**Problem:** `useAuth()` is called twice -- once destructuring login methods, once for `loading`. This creates two subscriptions to the same context unnecessarily.
**Fix:** Combine into a single `useAuth()` call.

---

## Medium Priority (Security/Robustness)

### 8. Emergency Session Not Invalidated on Reconnection
**File:** `src/lib/auth.tsx`
**Problem:** Emergency sessions (localStorage flag `emergency_session`) persist indefinitely. When connectivity is restored, the user remains in a mock session with no real auth context and no RLS access. No automatic upgrade to a real session occurs.
**Fix:** On `loadSession`, check if `emergency_session` flag exists and if Supabase is now reachable, prompt re-authentication.

### 9. No Rate Limiting on Client-Side OTP Attempts
**File:** `src/pages/Auth.tsx`
**Problem:** While the server limits to 3 OTP attempts, the client allows unlimited `sendMobileOTP` calls with only a cooldown timer (which resets on page refresh).
**Fix:** Add server-side rate limiting on the `send-otp` edge function (e.g., max 5 OTP sends per mobile per hour).

### 10. Mock Session Tokens Are Predictable
**File:** `src/lib/auth.tsx` (lines 524, 1163)
**Problem:** Fallback session tokens use `session_${Date.now()}_${Math.random()}` which is predictable and not cryptographically secure.
**Fix:** Use `crypto.randomUUID()` or `crypto.getRandomValues()` for token generation.

---

## Low Priority (Code Quality/Maintenance)

### 11. Auth.tsx is 1221 Lines
**Problem:** The auth module handles too many concerns: session management, OTP flows, emergency login, profile resolution, session recovery, username login.
**Fix:** Split into separate modules: `emailOTP.ts`, `mobileOTP.ts`, `sessionManager.ts`, `emergencyLogin.ts`.

### 12. Index.tsx Uses Large Switch Statement (30+ cases)
**File:** `src/pages/Index.tsx` (lines 145-234)
**Problem:** Adding new routes means editing this growing switch statement. All components are eagerly imported (44 imports).
**Fix:** Use a route config map and `React.lazy()` for code splitting.

### 13. `SessionTimeoutWrapper` is a No-Op
**File:** `src/components/SessionTimeoutWrapper.tsx`
**Problem:** The component just renders `{children}` -- session timeout logic is not implemented despite being referenced in architecture docs.
**Fix:** Either implement session timeout or remove the wrapper to avoid confusion.

### 14. Unused `SimpleApp` Component
**File:** `src/App.tsx` (lines 19-27)
**Problem:** `SimpleApp` is defined but never used -- leftover from debugging.
**Fix:** Remove it.

---

## Summary Table

| # | Issue | Severity | Files |
|---|-------|----------|-------|
| 1 | Emergency OTP codes in client source | Critical | `auth.tsx` |
| 2 | `signInWithEmail` missing doctor ID resolution | Critical | `auth.tsx` |
| 3 | No React Error Boundary | Critical | `App.tsx` |
| 4 | Session recovery missing `code` field | High | `auth.tsx` |
| 5 | No loading state on OTP auto-verify | High | `Auth.tsx` |
| 6 | DoctorHub N+1 queries | High | `DoctorHub.tsx` |
| 7 | Duplicate `useAuth()` calls | High | `Auth.tsx` |
| 8 | Emergency session not auto-invalidated | Medium | `auth.tsx` |
| 9 | No server-side OTP send rate limiting | Medium | `send-otp` edge fn |
| 10 | Predictable mock session tokens | Medium | `auth.tsx` |
| 11 | Auth.tsx too large (1221 lines) | Low | `auth.tsx` |
| 12 | Eager imports, no code splitting | Low | `Index.tsx` |
| 13 | SessionTimeoutWrapper is no-op | Low | `SessionTimeoutWrapper.tsx` |
| 14 | Unused SimpleApp component | Low | `App.tsx` |

All fixes preserve existing database schema and logic. Let me know which ones you'd like to implement first.

