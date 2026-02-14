

## Login Flow Fixes and UX Improvements

### Issues Found

#### 1. Duplicate Session Records (Bug)
Both `src/lib/auth.tsx` (verifyOTP, verifyMobileOTP) and `src/pages/Auth.tsx` (handleVerifyOTP, handleVerifyMobileOTP) call `createSessionRecord` / `createUserSession` independently. This means every OTP login creates **two session records** in the `user_sessions` table.

**Fix**: Remove the session creation from `Auth.tsx` handlers since `auth.tsx` already handles it. Auth.tsx should only handle routing after login.

#### 2. Missing `userDesignation` in Email OTP (Bug)
In `auth.tsx` `verifyOTP()`, when a designation is found, only `setUserRole` is called -- `setUserDesignation` is never set. This means `userDesignation` stays `null` after email OTP login, which can affect menu visibility and feature access checks that rely on `userDesignation`.

**Fix**: Add `setUserDesignation(designation.designation)` in the `verifyOTP` function alongside `setUserRole`.

#### 3. Missing `user_type` in Profile (Bug)
In `auth.tsx` `verifyOTP()`, the `userProfile` is set with a generic object that doesn't include `user_type`. Auth.tsx separately checks doctors/staff tables to determine user_type. This means the auto-redirect logic in `Index.tsx` (which checks `userProfile.user_type`) may not work correctly for doctor email OTP logins.

**Fix**: In `verifyOTP`, after getting the designation, also check if the user is a doctor (via `get_user_complete_profile` RPC) and set `user_type` accordingly.

#### 4. NotificationCenter Infinite Re-render (Bug)
Console shows "Maximum update depth exceeded" originating from NotificationCenter's Popover component. This is likely caused by state updates inside the component triggering re-renders that cascade.

**Fix**: Wrap the notification state updates in proper conditions to prevent unnecessary re-renders. Move `fetchNotifications` dependency out of the useEffect that subscribes to realtime changes.

#### 5. Auth.tsx Role Detection Duplication
`Auth.tsx` re-queries doctors, staff, and user_designations tables after OTP verification, duplicating what `auth.tsx` already does. This adds latency and complexity.

**Fix**: Simplify `Auth.tsx` to wait for auth context to update (via a useEffect watching `user` and `userProfile`), then route based on the context values instead of re-querying.

---

### Changes Summary

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/auth.tsx` | Add `setUserDesignation()` in `verifyOTP`, fetch full profile for `user_type` | Fix missing designation and user_type |
| `src/pages/Auth.tsx` | Remove duplicate session creation, simplify to use auth context for routing | Eliminate duplicate sessions, reduce latency |
| `src/hooks/useNotifications.tsx` | Remove `fetchNotifications` from useEffect dependency array | Fix infinite re-render loop |

### What Does NOT Change
- All RLS policies remain untouched
- Database schema stays the same
- Mobile OTP edge functions unchanged
- Navigation items and menu visibility logic unchanged
- Session timeout and tracking behavior preserved

### Technical Details

**Auth.tsx Simplification (handleVerifyOTP)**:
```text
Current flow:
  1. Call verifyOTP() -> creates session in auth.tsx
  2. Re-query doctors table
  3. Re-query staff table
  4. Re-query user_designations table
  5. Create ANOTHER session record
  6. Navigate

Proposed flow:
  1. Call verifyOTP() -> creates session, sets profile in auth.tsx
  2. Navigate based on auth context values (userProfile, userRole)
```

**Auth.tsx Simplification (handleVerifyMobileOTP)**:
```text
Current flow:
  1. Call verifyMobileOTP() -> creates session in auth.tsx
  2. Re-query session from user_sessions table
  3. Navigate based on session data

Proposed flow:
  1. Call verifyMobileOTP() -> creates session, sets profile in auth.tsx
  2. Navigate based on auth context values (userProfile, userRole)
```

**verifyOTP Fix in auth.tsx**:
- Add `setUserDesignation(designation.designation)` when designation is found
- Use `get_user_complete_profile` RPC to populate `user_type` in the profile object

**NotificationCenter Fix**:
- The `useEffect` at line 96-123 in `useNotifications.tsx` includes `fetchNotifications` in its dependency array
- `fetchNotifications` is a `useCallback` that depends on `user`
- When `user` object reference changes (which happens on auth state changes), it recreates `fetchNotifications`, which re-triggers the useEffect, potentially causing cascading updates
- Fix: Call `fetchNotifications` directly inside the effect without including it as a dependency, or use a ref to stabilize it

