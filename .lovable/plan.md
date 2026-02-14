

## Fix: Doctor Dashboard Showing "No Doctors Found"

### Problem
Dr.Sanjay (DOC0112) is logged in and viewing the Doctor Hub, but sees "No doctors found matching ''". This is because the doctor's record has `is_active = false` in the database, and the Doctor Hub query filters for only active doctors.

### Solution
When a doctor is viewing their own dashboard (i.e., `filterDoctorId` is provided), skip the `is_active` filter so they can always see their own payment data regardless of active status.

### Changes

**File: `src/components/DoctorHub.tsx`** (line ~109)

- Move the `.eq('is_active', true)` filter inside a condition so it only applies when viewing all doctors (admin/manager view), not when a specific doctor is viewing their own dashboard.

```
Before:
  query = supabase.from('doctors').select(...).eq('is_active', true);
  if (filterDoctorId) query = query.eq('id', filterDoctorId);

After:
  query = supabase.from('doctors').select(...);
  if (filterDoctorId) {
    query = query.eq('id', filterDoctorId);
  } else {
    query = query.eq('is_active', true);
  }
```

This ensures:
- Doctors always see their own dashboard, even if marked inactive
- Admin/manager views still only show active doctors in the list

### Additional Issue: NotificationCenter Infinite Loop
The console logs show a "Maximum update depth exceeded" warning from `NotificationCenter.tsx`. This is a separate bug caused by a `setState` inside a `useEffect` creating a render loop. This should be investigated separately if needed.

