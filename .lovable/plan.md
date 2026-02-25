

## Bypass Supabase Auth API: Edge-Function-Only Login

### Problem
Both login methods (Email OTP and Mobile OTP) currently depend on Supabase's `/auth/v1/*` endpoints, which are unreachable when ISPs block `*.supabase.co` DNS resolution. Even the Mobile OTP flow -- which successfully sends and verifies SMS via edge functions -- still calls `supabase.auth.verifyOtp()` at the end, which hits the blocked Auth API.

### Solution: Direct Session Login (No Auth API Needed)
Make the Mobile OTP login path work **entirely through edge functions + the `user_sessions` table**, without ever touching Supabase Auth endpoints. This means work can continue even when Supabase Auth is DNS-blocked.

---

### How it works today vs. the proposed change

**Current flow (blocked by DNS):**
```text
Phone --> send-otp (edge fn) --> SMS sent [OK]
Phone --> verify-otp (edge fn) --> returns hashed_token [OK]
Client --> supabase.auth.verifyOtp(hashed_token) --> BLOCKED by DNS
```

**Proposed flow (bypasses Auth API entirely):**
```text
Phone --> send-otp (edge fn) --> SMS sent [OK]
Phone --> verify-otp (edge fn) --> returns user data + JWT [OK]
Client --> creates user_sessions row directly --> logged in [OK]
```

---

### Implementation Steps

#### 1. Update `verify-otp` edge function
- After successful OTP verification, instead of generating a `magiclink` hashed token (which requires client-side Auth API call), generate a **custom session token** server-side
- Return user data (id, user_id, full_name, role, designation) directly
- Remove the `hashed_token` field from the response; add a `session_token` field instead
- The edge function already has service role access, so it can insert into `user_sessions` directly

#### 2. Update `verifyMobileOTP` in `src/lib/auth.tsx`
- When `verify-otp` returns successfully with a `session_token`:
  - Skip the `supabase.auth.verifyOtp()` call entirely
  - Store the session token in localStorage
  - Build the mock user/session objects from the returned user data (same pattern already used for username/password login fallback)
  - Set user state and navigate to dashboard
- This path never touches `/auth/v1/*`

#### 3. Add a "DNS Bypass Mode" indicator
- On the Auth page, when the connectivity check detects Supabase is unreachable, automatically switch to Mobile OTP tab and show a note: "Email login unavailable due to network issues. Please use Mobile OTP."
- Disable the Email OTP tab when DNS check fails (since email OTP requires Auth API)

#### 4. Edge function creates session row directly
- The `verify-otp` function will insert into `user_sessions` table with the service role key
- Returns session token to client
- Client stores it and uses existing `getActiveSession()` / `get_session_by_token` RPC for all subsequent authenticated calls

---

### Technical Details

**verify-otp edge function changes:**
- Remove `generateAuthToken` (magic link generation)
- Add direct `user_sessions` insert with generated session token
- Return: `{ success, session_token, user: { user_type, id, user_id, full_name, role, designation } }`

**auth.tsx `verifyMobileOTP` changes:**
- Check if response has `session_token` (new path) vs `hashed_token` (legacy path)
- If `session_token`: skip `supabase.auth.verifyOtp`, store token, build mock session
- If `hashed_token`: keep existing flow as fallback for when DNS works

**Auth.tsx UI changes:**
- When DNS check fails: auto-select Mobile tab, disable Email tab with tooltip explaining why
- Show small info banner: "Email login requires internet connectivity to authentication servers. Use Mobile OTP instead."

---

### What this enables
- Staff and doctors can log in via Mobile OTP even when Supabase Auth API is completely unreachable
- All app features that use `user_sessions` and RPC functions (which go through edge functions or direct DB) continue to work
- Email OTP remains available as a secondary option when DNS is working
- No database schema changes needed -- reuses existing `user_sessions` table

### Limitations
- RLS policies that check `auth.uid()` will not work in this mode (but the app already handles this via `SECURITY DEFINER` functions and `user_sessions`)
- Email OTP will still be unavailable during DNS outages (this is expected and communicated to users)

### Risk Assessment
- Low risk: the fallback mock-session pattern is already proven in the codebase (used by username/password login)
- No schema changes required
- Backward compatible: if `hashed_token` is returned (DNS working), the existing Auth flow still works

