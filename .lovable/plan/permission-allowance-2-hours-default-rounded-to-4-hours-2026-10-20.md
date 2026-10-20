# Permission allowance: 2 hours default, rounded to 4 hours

## What changes
1. **Default allowance = 2 hours per pay cycle** for every staff member (currently 4 hours).
   - All existing active staff are updated to 2 hours.
   - New staff (Staff Master, attendance-import new staff) start at 2 hours.
2. **Admin can change it**
   - Payroll settings gets a "Default permission hours per cycle" box (admin-only, like other payroll settings). Saving it can apply the new value to all staff.
   - The per-staff permission hours in Staff Master stays editable by admins for individual exceptions.
3. **Rounding rule (per pay cycle)**
   - Up to 2h: counted as actual minutes used.
   - Over 2h up to 4h (e.g. 2h 7m): shown as **4h used**. No salary deduction for this.
   - Over 4h: each minute beyond 4h is deducted at the normal per-minute rate (existing rule), and the 8-hour consolidated lateness rule continues to apply to those deducted minutes.
   - Shown in the attendance ledger note, e.g. "2h 7m used — counted as 4h".

## Where it shows
Payroll calculation, payslip, staff "My Attendance" (permission used), Leave & Permission balance.

## Technical details
- Data: run SQL to set `monthly_permission_hours = 2` for active staff and default 2 in `hr_staff`; add `defaultPermissionHours` (2) and `permissionRoundUpToHours` (4) to `hr_settings.payroll`.
- `src/hrms/data.ts`: fallback 4 → 2.
- `scripts/port_prototype.py`: patch the prototype's permission pool so the effective pool is the rounded tier (quota 2h, tolerance to 4h with "counted as 4h" display; minutes beyond 4h go to per-minute deduction); add the settings field; new-staff default from setting. Regenerate `src/hrms/prototype.ts`.
- Mirror the rule in `src/lib/hrms/payrollEngine.ts` / `leaveBalance.ts` fallbacks (4 → 2) for the classic screens.
- Add a small pure helper `permissionUsage(minutes, quotaH, roundH)` with tests: 90m → 90 used/0 deducted; 127m → 240 shown/0 deducted; 250m → 240 + 10m deducted.
- Save the rule to project memory.
