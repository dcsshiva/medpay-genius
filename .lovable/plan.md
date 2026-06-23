## Problem

Database audit logs confirm the `UPDATE` SQL on the `doctors` table is actually persisting changes for every field (specialization, PAN, mobile, bank fields, etc.). So writes are fine. The bug is on the **read / dialog-open path**: when you reopen Edit for the same doctor right after saving, the form shows the old values.

## Root cause

In `src/components/DoctorManagement.tsx`:

1. `Dialog onOpenChange` (line 982) calls `resetForm()` + `setEditingDoctor(null)` whenever `open === true`. With Radix this normally fires only from a trigger click, but in the Add path it briefly races with `handleEdit` patterns and, more importantly, it is wired so that any path that goes through the trigger button wipes the doctor we just selected.
2. `handleEdit` reads from the `doctors` state snapshot captured at render time. After save, the close flow runs `setDialogOpen(false) → setEditingDoctor(null) → resetForm() → fetchDoctors()`. `fetchDoctors` is **not awaited**, so if the user immediately clicks Edit again, the row in state is the pre-update snapshot and the form prefills stale values.
3. `useEffect([formData.mobile_number, editingDoctor])` triggers a duplicate-mobile check, but `formatMobileNumber` is called on every keystroke — if it strips characters silently it can look like "the field didn't change". Worth verifying with logs.

## Fix

**`src/components/DoctorManagement.tsx`**

1. **Always reload from DB on Edit.** Change `handleEdit(doctor)` to:
   - Refetch the single doctor by id: `supabase.from('doctors').select(...same columns...).eq('id', doctor.id).maybeSingle()`.
   - Refetch its email via the `get-user-emails` edge function (same call already used in `fetchDoctors`).
   - Use the fresh row to populate `formData` and `setEditingDoctor`, then open the dialog. Falls back to the cached `doctor` object on fetch error.

2. **Stop `onOpenChange` from clobbering edit state.** Replace the inline `onOpenChange` on the `<Dialog>` (line 982) with:
   ```ts
   onOpenChange={(open) => {
     if (!open) {
       setDialogOpen(false);
       setEditingDoctor(null);
       resetForm();
       return;
     }
     // Only reset when opening for *Add* (no editingDoctor yet)
     if (!editingDoctor) resetForm();
     setDialogOpen(true);
   }}
   ```
   The `<DialogTrigger>` Add button keeps working (no `editingDoctor` → reset). Programmatic open from `handleEdit` no longer wipes the freshly-set form.

3. **Await refresh after save.** In `handleSubmit`, change the success tail to:
   ```ts
   await fetchDoctors();
   setDialogOpen(false);
   setEditingDoctor(null);
   resetForm();
   ```
   so the next Edit click reads from refreshed state even without the per-row refetch.

4. **Diagnostic logging (temporary, behind `import.meta.env.DEV`)** in `handleEdit`, `handleSubmit` (log the update payload + the row returned by the post-save select), and `fetchDoctors` (log the refreshed row for `editingDoctor.id`). Lets us confirm in console if the issue is anywhere else (e.g. mobile formatter stripping digits).

## Out of scope

- No DB / RLS / migration changes — admin update privileges are correct and audit logs confirm writes.
- No edge-function changes (`update-user-credentials`, `create-user`, `get-user-emails` untouched).
- No layout, styling, or validation rule changes.
- No changes to the Add Doctor flow behaviour, only the shared dialog wiring.

## Verification

1. Edit a doctor → change Specialization, PAN, Mobile, Bank Name, IFSC → Update Doctor → toast Success.
2. Immediately click Edit again on the same row → all new values appear in the form.
3. Refresh page → values still match (confirms DB persistence).
4. Click Add Doctor → form is blank (Add flow untouched).
5. Cancel mid-edit → reopening Edit shows current DB values, not the abandoned edits.
