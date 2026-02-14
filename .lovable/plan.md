

## Fix "Staff record not found" Error in Complaint Submission

### Root Cause

The complaint submission code (lines 289-303) tries to find the staff record by:
1. Looking up `profiles` table by `user_id`
2. Using that profile's `id` to look up `staff` table

This fails for custom auth users (staff logging in with username/password) because the `profiles` table may not have a matching record, or the IDs don't align. The staff ID is already available in `user.user_metadata.original_id` for custom auth users.

### Fix

Replace the broken profile-to-staff lookup with the existing `getStaffId()` utility from `src/lib/staffUtils.ts`, which already handles both custom auth and Supabase auth users correctly.

### File to Modify

**`src/components/ComplaintManagement.tsx`**

1. Import `getStaffId` from `@/lib/staffUtils`
2. Replace lines 288-303 (the profile lookup + staff lookup) with:

```typescript
const staffId = await getStaffId(user);
if (!staffId) throw new Error('Staff record not found');
```

3. Use `staffId` as `raised_by` in the insert call (line 312)

### No Other Changes
- Form UI, validation, dropdowns, and all other logic remain the same
- Database schema unchanged
