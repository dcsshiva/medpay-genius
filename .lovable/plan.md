

## Fix: Admin User Showing as "Staff" -- Race Condition in Auth Flow

### Root Cause

There is a race condition in the authentication flow:

1. When a user logs in via email, `signInWithPassword` triggers `onAuthStateChange(SIGNED_IN)`
2. The `onAuthStateChange` handler sets the `user` state **immediately** (line 223), which triggers a redirect to `/dashboard`
3. The designation fetch is deferred with `setTimeout(..., 0)` and hasn't completed yet
4. The dashboard renders with `userRole = null`, which causes navigation to fall through to default items
5. If the delayed designation fetch in `onAuthStateChange` fails silently (no `else` clause), the role stays null/wrong

Additionally, the `signInWithEmail` function at line 590 has inconsistent indentation that makes the code harder to follow, and the `onAuthStateChange` handler doesn't fall back to the profiles table when the designation fetch returns null.

### Fix Strategy

Ensure the role is reliably set during both login and session restoration by:

1. **Prevent double-processing**: In `signInWithEmail`, skip the role-setting logic since `onAuthStateChange` will handle it. OR, add a flag to prevent `onAuthStateChange` from overwriting values set by `signInWithEmail`.
2. **Add fallback in `onAuthStateChange`**: When designation fetch returns null, fall back to the profiles table (same as `loadSession` does).
3. **Fix the `signInWithEmail` indentation** for code clarity.

### Technical Changes

#### File: `src/lib/auth.tsx`

**Change 1 -- Add profiles fallback to `onAuthStateChange` handler (lines 227-251)**

When `fetchDesignation` returns null in the `onAuthStateChange` callback, add a fallback that checks the `profiles` table -- same pattern used in `loadSession`:

```typescript
setTimeout(async () => {
  try {
    const designation = await fetchDesignation(supaSession.user.id);
    if (designation) {
      setUserRole(designation);
      setUserDesignation(designation);
      // ... existing profile fetch code
    } else {
      // NEW: Fallback to profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supaSession.user.id)
        .maybeSingle();
      if (profile) {
        setUserRole(profile.role);
        setUserProfile(profile);
      }
    }
  } catch (err) {
    console.error('Error fetching designation on auth change:', err);
  }
}, 0);
```

**Change 2 -- Fix indentation in `signInWithEmail` (lines 590-613)**

The `if (designation?.designation)` block at line 590 has inconsistent indentation which makes the else branch confusing. Fix to align with the surrounding code block.

**Change 3 -- Ensure `loadSession` also sets `userDesignation` from profiles fallback (line 328-338)**

When `loadSession` falls back to the profiles table, it only calls `setUserRole(profile.role)` but not `setUserDesignation`. Add `setUserDesignation` mapping from the profile's role value so the navigation logic that checks `userDesignation` also works correctly.

### Files Modified
- `src/lib/auth.tsx` -- Three targeted changes to ensure role is reliably determined during authentication

### Expected Result
After this fix, when shivanss@gmail.com (admin) logs in:
- `userRole` will be "admin" 
- `userDesignation` will be "admin"
- The sidebar will show full admin navigation
- The header will display "Admin" instead of "Staff"

