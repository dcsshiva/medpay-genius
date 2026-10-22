# CL / Permission: route to the staff member's own reporting manager

## What changes for staff
- In **Apply for CL / Permission**, the "Reporting Manager (approver)" box shows the manager assigned to them in Staff Master, already selected.
- Only their assigned manager is offered (today it lists every manager, so a request could be sent to the wrong person).
- **No reporting manager assigned:** the box shows "No reporting manager assigned — please contact HR/Admin", and the **Submit request** button is greyed out and can't be pressed. A clear message appears under the form.
- If the assigned manager has been made inactive, it's treated the same as "not assigned".

## What changes for approvers
- A manager's Leave & Permission approval page lists only requests from staff who report to them (already the rule; it stays).
- On submit, the request is always saved with the staff member's assigned manager, so it can't land on another manager's page.
- Admins still see every request.

## Technical details
- All edits go in `scripts/port_prototype.py` as asserted patches to `openLeaveForm`, then regenerate `src/hrms/prototype.ts`.
- Approver = `findStaff(emp.reportingManager)` if it exists and is active; dropdown has that single option; else placeholder option, `lvSubmit` disabled, and submit handler also refuses with an error (guard against tampering).
- `rec.reportingManager` is set from `emp.reportingManager`, not from the dropdown value.
- Verify signed in: staff with a manager can submit; staff without one sees the message and a disabled button; the manager's approval page shows the new request.
