# Permission only when pre-approved

## The rule
- **Permission counts only when it was applied for and approved** (Leave & Permission → type "Permission", for that date, status Approved).
- **Late arrival without an approved permission is not covered by the permission balance.** After the usual shift grace (e.g. 15 minutes) and the monthly extra-late allowance, all late minutes are cut from pay per minute. The 8-hour lateness rule (CL, otherwise loss of pay) still applies.
- **On a day with approved permission:** late minutes up to the approved hours are covered and use the staff member's permission balance. The 2-hour / 4-hour rule from the last change still applies to the cycle total (2h 7m approved and used → counted as 4h, no pay cut; anything past 4h is cut per minute).
- Late minutes beyond the approved hours that day are cut per minute.
- Pending or rejected requests cover nothing.

## What staff and admins will see
- Attendance note per day, e.g. "52m late — covered by approved permission (1h)" or "52m late — no approved permission, 37m deducted".
- Permission used / remaining reflects approved permissions only.

## Technical details
- `scripts/port_prototype.py` (new patch block): in `computeCycle`, build a map `approvedPermMin[date]` from `LEAVES` where `empNo` matches, `type==='Permission'`, `status==='Approved'` (`hours*60`).
- In the late branch, replace the automatic `fromPerm = min(late, permissionRemaining)` with `min(late, approvedToday, permissionRemaining)`; the rest of the late minutes go to per-minute deduction and the consolidated rule.
- Keep grace/extra-late steps unchanged. Regenerate `src/hrms/prototype.ts`.
- Classic engine `src/lib/hrms/payrollEngine.ts`: remove the automatic permission-pool absorption in the late branch (approved `permissions[date]` stays the only cover).
- Tests: extend `src/hrms/permissionRule.test.js` — late without approval → no permission used; late with 1h approved → covered up to 60m, rest deducted; pending ignored.
- Update the permission-allowance memory.
