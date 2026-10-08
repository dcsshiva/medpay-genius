# Fix "Change password" and hide salary details from staff

## 1. Change password error
**Cause:** The sign-in service has "require current password" switched on. The app already checks the current password itself (it signs in again with it), but then the save step is refused with "Current password required when setting new password." Staff accounts have no real mailbox, so the service's own email-code confirmation can't be used either.

**Fix:** Turn off that extra service-side requirement. The app's own check stays, so a wrong current password is still rejected ("Current password is incorrect"). Works for staff and admin accounts. Password-reset links are unaffected.

## 2. Staff login shows attendance only (salary hidden for now)
New admin switch in **Payroll settings**: "Show salary details to staff" — **off by default**.

When off, the staff workspace shows:
- **Overview:** name, code, department, manager, and attendance stats only — Present days, Late instances, Permission used, CL used. Hidden: Gross Salary / Net Payable badges, Lateness/LOP deduction, PF + ESI + PT + other, Overtime pay, Net payable.
- **My Shift & Salary** tab renamed **My Attendance**; the Deduction and Net-to-date columns are removed (date, status, shift, in/out, late, permission, OT, note stay).
- **Payslip** tab hidden.
- My Tasks and Leave & Permission unchanged.

When an admin turns the switch on, everything returns exactly as it is today. Admin and manager screens are not affected.

## Technical details
- Auth config: `supabase--configure_auth` with `require_current_password: false` (keep other settings unchanged). `changePassword` in `src/hrms/auth.ts` keeps its re-sign-in verification.
- Flag `staffSalaryVisible: false` added to `DEFAULT_PAYROLL_SETTINGS` and stored in `hr_settings.payroll` (jsonb, existing save path); confirm staff can read `hr_settings` under current policies, otherwise default to hidden.
- All UI changes made via asserted patches in `scripts/port_prototype.py` (`profileAndStats`, ledger table, staff tabs list, `renderPayrollSettings` toggle), then regenerate `src/hrms/prototype.ts`.
- Verify: build OK; isolated render of staff dashboard with flag off/on.
