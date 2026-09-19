# Fix attendance import access for managers, admins and the tech team

## What is wrong today

The import ran as "techteam" and reported **0 records saved, 77 skipped** even though 77 staff records were created. Checks confirm:

- Saving attendance is only allowed for people marked **admin** or **manager** in the system. It does not allow **super admin** or the **Staff Manager** role.
- "techteam" (STF970) is a Staff Manager but is marked as plain **staff**, so every attendance row it tried to save was rejected.
- One more account is affected the same way: **PARTHA (MGR957/MGR958)** carries the manager job title but is marked as **doctor**.
- The screen hides the rejection: when a row fails to save it is silently counted as "skipped", so the user sees no reason for the failure.

## What will change

1. **Who can save attendance** — allow admins, super admins, managers and Staff Managers to add/edit attendance records (reading own attendance stays unchanged for everyone else).
2. **Fix the mismatched accounts** — mark PARTHA as manager so the job title and the access level agree. techteam keeps its Staff Manager role and gains access through rule 1.
3. **Honest import messages** — if rows are rejected because of access or a data problem, the import now shows the real reason instead of quietly counting them as "skipped".
4. **Hide the Import button** for anyone without permission, so nobody runs an import that cannot save.
5. **Re-import check** — after the fix, the same file can be re-imported and the day-wise register should show the records.

## Technical notes

- Migration: replace the `staff_daily_activities` policy "Admins and managers can manage daily activities" with one that ORs `has_designation(admin)`, `has_designation(super_admin)`, `has_designation(manager)` and `is_staff_manager(auth.uid())`, with an explicit `WITH CHECK` mirroring the `USING` clause. Confirm `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` exists for the table.
- Same access set applied to placeholder-staff creation path: `create_placeholder_staff_from_biometric` is SECURITY DEFINER with no caller check — add an authorization guard so only the four tiers above can create placeholder staff.
- Data fix: set `user_designations.designation = 'manager'` for the PARTHA account (staff role already `manager`).
- `src/components/StaffAttendanceManagement.tsx`: capture the upsert `error` in both the batched (range) and single-row loops, collect the first message, and surface it via `toast.error`; keep the success summary when no errors occur. Gate the Import button/input with `hasFullAccess(...) || isManagerLike(role, designation, staffRole)` from `src/lib/accessLevels.ts`.
