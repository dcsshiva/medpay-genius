# Backend cleanup: remove unmapped staff records

Delete staff master records that have no biometric code mapped, excluding admin and manager roles, along with their demo payment data. This is a one-off backend data cleanup — no UI changes.

## Scope (verified against live data)

- 36 staff have no biometric code and are not admin/manager: 35 nurses + PHM409 "Arulmani" (pharmacist).
- **PHM409 Arulmani is kept** — final target is the **35 nurse records**.
- Admin (2) and manager (6) records are untouched.

## Linked data for the 35 targets

| Data | Count | Action |
| --- | --- | --- |
| Staff payments (all dated 2025-11-01, demo batch) | 33 (₹3,82,400) | Delete |
| Bank advice batch STAFF-011125-48 | 1 | Delete |
| Tasks assigned | 5 | Delete |
| Appraisal records | 1 | Delete |
| Daily activity entries | 1 | Delete |
| Payroll / salary structure / warnings | 0 | None |
| Login accounts | 35 | Delete |

## Steps

1. Snapshot the 35 target rows (staff code, name, email, login id) so the list is recorded before deletion.
2. Delete their staff payments, then the demo bank advice history batch entry covering those payments.
3. Delete their tasks, appraisal rows (including criteria scores) and daily activity rows.
4. Delete the staff rows themselves, plus permission/designation rows attached to them.
5. Delete their login accounts.
6. Verify: 0 remaining unmapped non-admin/manager staff other than PHM409, 0 staff payments on 2025-11-01, admin/manager counts unchanged (2 and 6).

## Technical notes

- Executed as data operations against the backend database; `staff_payments.staff_id` has `ON DELETE RESTRICT`, so payments must go first.
- Any other foreign-key references discovered at delete time (e.g. audit or access-history rows) are cleared in the same order before the staff row.
- Login accounts are removed after the staff rows to avoid dangling references.
