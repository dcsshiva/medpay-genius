

## Fix Doctor Dashboard Empty State for Both Login Methods

### Problem
When a doctor logs in (via email OTP or mobile OTP), the Doctor Hub shows "No doctors found" because the `filterDoctorId` passed to the DoctorHub component doesn't match the doctor's record in the `doctors` table.

### Root Cause Analysis

**Email OTP Login** (`verifyOTP` function, line ~797):
- The code calls `get_user_complete_profile` RPC which returns `p.id` = doctors table ID (correct)
- But then sets `userProfile.id = data.user.id` (the Supabase auth UUID)
- The DoctorHub queries `doctors` table with this auth UUID, which doesn't match `doctors.id`

**Mobile OTP Login** (`verifyMobileOTP` function, line ~974):
- Sets `userProfile.id = userData.id` which is the doctors table ID (correct)
- However, `userProfile.user_id = userData.user_id` (auth UUID)
- This path works correctly IF the doctor has a mobile number set in the database

### Fix (Single File: `src/lib/auth.tsx`)

#### 1. Email OTP - Use doctors table ID from profile RPC
In the `verifyOTP` function (~line 797), when designation is 'doctor', use `p.id` (doctors table ID) from the `get_user_complete_profile` result instead of `data.user.id`:

```
setUserProfile({
  id: p.id || data.user.id,        // Use doctors table ID when available
  user_id: data.user.id,            // Auth user ID stays as user_id
  full_name: fullName,
  role: designation.designation,
  user_type: userType,
  code: p.code                      // Also include doctor_code
});
```

#### 2. Email OTP - Session recovery (loadSession)
Apply the same fix in the `loadSession` function (~line 328-339) where profile is loaded on page refresh for Supabase auth sessions:

```
setUserProfile({
  id: p.id || supaSession.user.id,   // Use doctors table ID
  user_id: p.user_id || supaSession.user.id,
  full_name: p.full_name,
  role: designation,
  user_type: p.designation === 'doctor' ? 'doctor' : 'staff',
  code: p.code
});
```

#### 3. Email OTP - onAuthStateChange handler
Same fix in the auth state change handler (~line 238-245):

```
setUserProfile({
  id: p.id,                          // Use doctors table ID
  user_id: p.user_id,
  full_name: p.full_name,
  role: designation,
  user_type: p.designation === 'doctor' ? 'doctor' : 'staff',
  code: p.code
});
```

### Summary
The core issue is that `userProfile.id` must contain the **doctors table ID** (not the auth user UUID) for the Doctor Hub filter to work. The `get_user_complete_profile` RPC already returns the correct doctors table ID as `id`, but the email OTP login paths were overwriting it with the auth UUID. All three places where the user profile is set from this RPC need to be updated.

### Files Changed
| File | Change |
|------|--------|
| `src/lib/auth.tsx` | Use `p.id` from RPC result as `userProfile.id` in 3 locations |

