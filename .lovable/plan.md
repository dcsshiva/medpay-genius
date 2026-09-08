# Staff Manager: tasks, complaints, leave & permission approvals

Give the Staff Manager role the same people-management powers a manager has — assigning tasks, handling complaints, approving leave and permission — while keeping all payment screens off-limits (unchanged from the current setup).

## Current state

- The Staff Manager (staff code STF970) has the staff role `staff_manager` but the designation `staff`.
- Task and Complaint screens only allow actions when the role is exactly `admin` or `manager`, so a staff manager sees a read-only, own-records view.
- The Leave Management Dashboard only opens for admin / manager / supervisor designations.
- The list of approvers a staff member can send leave or permission to is built from admin and manager only — a staff manager never appears there.
- Database rules for tasks, complaints and leave applications also grant the wide access to admin/manager only, so even if buttons showed, saving would fail.

## What will change

1. **Tasks** — Staff Manager can create tasks, assign them to any staff member, see all tasks, update status and verify completion.
2. **Complaints** — Staff Manager can view all complaints, respond, and change status (open → in progress → solved → closed). Staff raising a complaint can now pick a Staff Manager as the person to submit to.
3. **Leave & Permission approvals** — The Leave Management Dashboard opens for Staff Manager, showing the applications sent to them, with approve / reject / cancel actions. Staff members can select a Staff Manager as their approver when applying.
4. **Staff Manager's own requests** — A Staff Manager can still raise their own leave/permission; their request is routed to an admin or manager (they cannot approve their own), and they see the approver's name and decision in history just like any staff member.
5. Payment-related screens stay excluded, exactly as today.

## Technical notes

Database (one migration):
- Add a `public.is_staff_manager(_user_id uuid)` security-definer helper reading `staff.role = 'staff_manager'` (avoids recursive policy checks).
- Add policies (no drops): `tasks` ALL, `complaints` ALL, `leave_permission_applications` SELECT/UPDATE for staff managers.
- `CREATE OR REPLACE` `get_available_managers()` to also return active staff with `role = 'staff_manager'` or designation manager, and to exclude the calling user so nobody can self-approve.

Frontend:
- Add `isManagerLike(role, designation)` to `src/lib/accessLevels.ts` covering `manager`, `supervisor` and `staff_manager`.
- Use it in `TaskManagement.tsx` (create/assign/verify gates, full task fetch), `ComplaintManagement.tsx` (status update gate, admin view, submit-to filter), and `ApprovalManagement.tsx` (`isManager` check so the dashboard loads applications where they are the approver).
- In `LeaveApplicationForm.tsx` / `PermissionApplicationForm.tsx`, treat `staff_manager` like a manager for routing their own request upward and drop self from the approver dropdown.

Assumption: a Staff Manager approves the applications addressed to them (same rule as a manager); admins keep the org-wide view.
