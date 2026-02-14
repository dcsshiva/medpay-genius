

## Fix: "Profile not found" Error When Creating Tasks

### Problem

When an admin creates a task, the code does:
1. Query `profiles` table for the user's profile ID
2. Use that profile ID to find the staff record

But custom auth users (admins logged in via the session-based auth system) often don't have a `profiles` record, causing the "Profile not found" error.

### Fix (TaskManagement.tsx)

Replace the two-step lookup (profiles -> staff) with a direct lookup of the `staff` table using `user_id`, which is the same pattern used in `staffUtils.ts`.

**Current code (lines 208-221):**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('user_id', user!.id)
  .maybeSingle();

if (!profile) throw new Error('Profile not found');

const { data: currentStaff } = await supabase
  .from('staff')
  .select('id')
  .eq('id', profile.id)
  .single();
```

**New code:**
```typescript
const { data: currentStaff } = await supabase
  .from('staff')
  .select('id')
  .eq('user_id', user!.id)
  .maybeSingle();
```

This directly finds the staff record via `user_id`, bypassing the `profiles` table entirely.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/TaskManagement.tsx` | Replace profiles+staff lookup with direct staff lookup by user_id |

