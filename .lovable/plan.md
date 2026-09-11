# Staff Manager access fix + shift-aware late detection

Two things: make the Staff Manager role actually show its allowed screens and powers, and read the shift (morning / second / night) from the imported attendance punch times, with the shift timings editable by admins and managers.

## Part 1 — Staff Manager screens

What was found:

- No staff record currently carries the Staff Manager role — techteam (STF970) is back on Manager, so the automatic default-screen setup never ran again for anyone.
- Even when the role is set, the person's designation stays "staff". Almost every screen (and the app's own role check) reads that designation, so the app treats a Staff Manager as an ordinary staff member and hides the menu items and the people-management buttons.
- The 24 default screens are already saved for techteam, so the data is fine; it is the role reading that breaks it.

What will change:

1. techteam (STF970) is set to the Staff Manager role, and the default screen set is re-applied so nothing is missing.
2. The app will read the real staff role (Staff Manager) alongside the designation, so a Staff Manager keeps their menu and their manager-level buttons for tasks, complaints, attendance, appraisals, payroll and leave/permission approvals.
3. The Staff Management Dashboard, which currently refuses anyone who is not an admin or manager, will open for a Staff Manager too.
4. Payment screens stay hidden, exactly as agreed before.
5. Setting anyone to the Staff Manager role in the staff master will keep giving them this same set automatically.

## Part 2 — Shift detection and Late rule

New behaviour when attendance is imported (both the daily punch file and the week/month range report):

- The first punch decides the shift:
  - 09:00-10:00 → Morning shift
  - 14:00-15:00 → Second shift
  - 20:00-21:00 → Night shift
- Late = more than 15 minutes after that shift's start (morning 09:15, second 14:15, night 20:15).
- A punch outside all three windows is attached to the nearest shift and marked Late, so nothing is lost.
- No punch → Absent (unchanged); leave/holiday days unchanged.
- The detected shift is saved with the day's record and shown in the attendance screen and in the reports (day-wise register tooltip, per-day list, staff summary), with a shift filter and per-shift late counts.

Shift timings are configurable: a new "Shifts" tab in Masters where an admin or manager can add or edit shifts — name, start time, end time, the detection window, and the grace minutes. Imports and the Late calculation always use the saved shifts, so changing 09:00 to 08:30 immediately changes future imports. The three shifts above are created as the starting values.

## Technical notes

Database (one migration):
- `shift_definitions` table: `id, shift_name, start_time, end_time, window_from, window_to, grace_minutes (default 15), is_active, sort_order`, with GRANTs (`select` to authenticated, all to service_role), RLS enabled, read for authenticated, write for admin/manager/super_admin via `has_designation` / `is_staff_manager`. Seeded with Morning / Second / Night.
- `staff_daily_activities`: add nullable `shift_name text`.
- Re-apply `apply_staff_manager_defaults` for STF970 after the role change (data change via query tool, not the migration).

Frontend:
- `src/lib/auth.tsx`: expose `staffRole` (from `staff.role` on the resolved profile) in AuthContext, populated on every login path.
- `src/lib/accessLevels.ts`: `isManagerLike(role, designation, staffRole?)` also accepts the staff-table role.
- Use it in `StaffManagementDashboard.tsx` (`isAllowed`), `TaskManagement.tsx`, `ComplaintManagement.tsx`, `ApprovalManagement.tsx`, `LeaveApplicationForm.tsx`, `PermissionApplicationForm.tsx`, `StaffAttendanceManagement.tsx`.
- New `useShiftDefinitions()` hook + `resolveShift(inTime, shifts)` helper in `src/lib/attendanceShifts.ts` returning `{ shiftName, isLate, start, end }`; used by both parsers in `StaffAttendanceManagement.tsx`, replacing the fixed `09:15` compare (the manual "Late after" box becomes a per-shift grace shown read-only from Masters).
- `src/components/masters/ShiftsTab.tsx` added to `MasterDataManagement.tsx`.
- `StaffAttendanceReports.tsx` / `AttendanceDayRegister.tsx`: shift column, shift filter, per-shift late totals; biometric-code-only filtering stays.
