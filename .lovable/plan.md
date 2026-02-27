
Goal: Fix why Dr. Satishkumar still sees an empty Doctor Hub after login, and make both Email OTP and Mobile OTP reliably load doctor data.

What I verified from your current system:
1. Dr. Satishkumar exists correctly in `doctors`:
   - `id`: `75a17c3f-5029-43c5-aed9-d6309faa8a1c`
   - `user_id`: `fa9ac164-f948-4810-b19c-93bf7e23daaf`
   - `mobile_number`: `9344603808`
2. `get_user_complete_profile(user_id)` returns correct doctor table ID for him.
3. RLS on `doctors/visits/payments/payment_visits` requires `auth.uid()` for doctor reads.
4. Mobile OTP currently creates a custom `user_sessions` record and mock client session, but does not guarantee a real Supabase Auth session in the direct-session path.
5. In Email OTP flow, `verifyOTP` now sets `userProfile.id` correctly for doctors, but `createUserSession.original_id` is still being saved as auth user id in that path, which can break fallback custom-session recovery.

Root cause (combined):
- Doctor Hub filters by doctor-table id (`filterDoctorId`), but DB reads are also gated by RLS (`auth.uid()`).
- Mobile OTP direct mode can leave app in “custom session only” state (no Supabase auth context), causing doctor queries to return empty.
- Email OTP has a remaining inconsistency in `createUserSession.original_id`, which can reintroduce wrong ID after fallback/session recovery.

Implementation plan:

1) Fix Email OTP session consistency in `src/lib/auth.tsx`
- In `verifyOTP`, keep current `setUserProfile.id` logic.
- Change `createUserSession` payload so `original_id` uses doctor table id when user is doctor:
  - from: `original_id: data.user.id`
  - to: doctor-aware value (`doctorTableId` when available).
- This prevents future fallback custom-session restores from using auth UUID as doctor filter id.

2) Make Mobile OTP establish real Supabase auth whenever possible
- File: `supabase/functions/verify-otp/index.ts`
- Enhance response to include `hashed_token` (or equivalent auth bootstrap token) for the matched auth user, so client can call `supabase.auth.verifyOtp(...)` and restore full `auth.uid()` context.
- Keep current direct custom session token as fallback path, but prefer Supabase-auth bootstrap first.

3) Update mobile verify client logic to prioritize Supabase auth session
- File: `src/lib/auth.tsx` (`verifyMobileOTP`)
- If edge function returns `hashed_token`, use the existing legacy branch first:
  - `supabase.auth.verifyOtp({ token_hash: hashedToken, type: 'magiclink' })`
  - Then resolve designation/profile and set doctor `userProfile.id` from profile RPC.
- Only use direct mock-session path when auth bootstrap token is unavailable.
- This ensures DoctorHub and all RLS-protected doctor data queries work for mobile OTP login too.

4) Add defensive doctor-id normalization during custom-session restore
- File: `src/lib/auth.tsx` (`loadSession` custom-session fallback block)
- If restoring a doctor custom session, resolve and enforce doctor-table id before setting `userProfile.id` (use `get_user_complete_profile(sessionData.user_id)` when possible).
- This prevents stale/legacy `original_id` mismatches from producing empty doctor list.

5) Validation checklist (must test both login methods)
- Mobile OTP with Satishkumar:
  - Login succeeds
  - Doctor Hub shows “My Payment Summary”
  - Table shows doctor row (even if amounts are 0, row must appear)
  - No “No doctors found matching ''”
- Email OTP with same doctor:
  - Same expected outcome
- Refresh browser after login:
  - Doctor Hub remains populated
  - No regression after session recovery
- Optional sanity checks:
  - Admin/Manager still sees all doctors in Doctor Hub
  - Staff routing unchanged

Technical notes:
- This plan keeps authorization server-side with existing RLS/`auth.uid()` model.
- No role storage changes are introduced.
- No policy relaxation is needed; we are aligning session establishment and doctor-id mapping to existing secure policies.
