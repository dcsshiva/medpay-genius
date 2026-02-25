

## Emergency Offline Login Mode (DNS Bypass)

### Problem
ALL requests to `*.supabase.co` are DNS-blocked by ISPs in India -- this includes Auth API, Edge Functions, and even database queries. No server-side solution is possible because all server code runs on supabase.co.

### Solution: Emergency Login with Role-Based Fallback OTP
When the DNS connectivity check detects Supabase is unreachable, enable an "Emergency Login" mode with pre-shared OTP codes per role. This creates a local mock session so users can at least access cached/offline-capable parts of the app.

### Security Measures
- Emergency mode ONLY activates when `checkSupabaseReachable()` returns false (Supabase genuinely unreachable)
- OTP codes are stored as SHA-256 hashes (not plain text) in source code
- Emergency sessions are clearly marked and limited
- When connectivity is restored, the app prompts for proper re-authentication

---

### Implementation Steps

#### 1. Update `src/lib/auth.tsx` -- Add emergency login functions

Add two new exported functions:
- `emergencySignIn(email: string, role: 'admin' | 'manager', otp: string)` 
  - Computes SHA-256 of the entered OTP
  - Compares against the hashed fallback OTP for the selected role:
    - Admin role: hash of `948693`
    - Manager role: hash of `933892`
  - If match: creates a local mock User/Session with the email and role, stores in auth context
  - Sets a localStorage flag `emergency_session=true` so the app knows this is a limited session
  - Returns `{ error: null }` on success or `{ error: { message: '...' } }` on mismatch

- Add `emergencySignIn` to the AuthContext interface and provider value

#### 2. Update `src/pages/Auth.tsx` -- Emergency Login UI

When `dnsBlocked` is true:
- Re-enable the Email OTP tab (remove the `disabled` prop)
- Replace the normal email OTP flow with an emergency login form:
  - Email input (so we know who's logging in)
  - Role selector: dropdown with "Admin" and "Manager" options
  - OTP input (6-digit, using existing InputOTP component)
  - "Emergency Sign In" button
  - Small info banner: "Network issues detected. Using emergency offline login. Contact your administrator for the emergency access code."
- Remove the "Send OTP" step entirely (no server call needed)
- On successful verification, navigate to dashboard using existing `navigateByRole()`

#### 3. Update `src/components/DNSHelpBanner.tsx`

When DNS is blocked, add a note: "Emergency login is available using your pre-shared access code. Select the Email OTP tab to sign in."

#### 4. Post-login connectivity recovery

In the dashboard/layout, when `emergency_session=true` is detected in localStorage:
- Periodically check `checkSupabaseReachable()` 
- When connectivity restores, show a toast: "Connection restored. Please sign in again for full access."
- This is a future enhancement -- not blocking for this release

### Files Modified
- `src/lib/auth.tsx` -- Add `emergencySignIn` function with hashed OTP validation
- `src/pages/Auth.tsx` -- Emergency login UI when DNS is blocked
- `src/components/DNSHelpBanner.tsx` -- Updated messaging

### Limitations (Communicated to User)
- Data-dependent features (payments, visits, reports) will not load during DNS outage since all DB queries go through supabase.co
- This login only grants local app access; no server-side data until DNS is resolved
- Users should still change DNS settings (per the existing DNS Help Banner) for full functionality

### OTP Security
- Admin fallback OTP `948693` stored as SHA-256 hash
- Manager fallback OTP `933892` stored as SHA-256 hash
- No plain-text OTP values in source code
- Emergency mode cannot be triggered when Supabase is reachable (prevents abuse)

