

## Fix: Mobile OTP Login Not Loading Data (RLS Issue)

### Problem
When logging in via mobile OTP, the Doctor Hub shows "No doctors found" because the mobile OTP flow creates a local pseudo-session without signing into Supabase Auth. This means `auth.uid()` returns `null`, and all RLS policies deny data access.

Email OTP works because it uses `supabase.auth.verifyOtp()` which establishes a real Supabase Auth session.

### Solution
After mobile OTP verification, sign the user into Supabase Auth using the admin API to generate a real session. The `verify-otp` edge function will use `auth.admin.generateLink` or `auth.admin.createUser`/`signInWithPassword` to create a proper auth token that the client can use.

### Changes

#### 1. Update `verify-otp` Edge Function
- After OTP verification succeeds and user is found, use `supabase.auth.admin.generateLink({ type: 'magiclink', email })` to get a token
- Or better: use `supabase.auth.admin.generateLink({ type: 'magiclink' })` and return the hashed token so the client can call `verifyOtp` with it
- Simplest approach: return a one-time sign-in token by generating a magic link and extracting the token from it

#### 2. Update `verifyMobileOTP` in `src/lib/auth.tsx`
- After receiving the token from the edge function, call `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` to establish a real Supabase Auth session
- Then proceed with designation/profile lookup (same as email OTP flow)
- Remove the pseudo-user creation; use the real Supabase auth user instead

### Technical Details

**Edge Function (`verify-otp`) changes:**
- After finding the user (staff or doctor), look up their auth email
- Generate a magic link using `auth.admin.generateLink({ type: 'magiclink', email })`
- Extract the `hashed_token` from the response
- Return `hashed_token` along with existing user data in the response

**Auth context (`auth.tsx`) changes in `verifyMobileOTP`:**
- Receive the `hashed_token` from the edge function response
- Call `supabase.auth.verifyOtp({ token_hash: hashed_token, type: 'magiclink' })` to create a real Supabase session
- Use the resulting `data.user` and `data.session` (real auth objects)
- Follow the same designation/profile lookup flow as the email OTP `verifyOTP` method
- Create a tracked user session in the `user_sessions` table as before

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/verify-otp/index.ts` | Generate magic link token after OTP verification; return `hashed_token` |
| `src/lib/auth.tsx` | Update `verifyMobileOTP` to use `supabase.auth.verifyOtp` with the returned token |

