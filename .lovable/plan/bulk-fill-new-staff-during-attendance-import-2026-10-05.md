# Bulk-fill new staff during attendance import

## What will change

- Add a clearly visible **Fill all new staff** section above the new-staff list.
- Provide six selectors there: **Unit, Department, Designation, Shift, Role, and Reporting Manager**.
- Add one **Apply to all** action that copies the selected values to every checked new-staff row.
- Keep each row editable afterward, so exceptions can be changed individually before import.
- Keep unchecked rows excluded and leave staff matching, attendance records, and existing staff unchanged.
- Preserve the current defaults: Unit 1, Front Office, Front Office Executive, General Shift, Staff, and no reporting manager.
- Keep the controls usable without horizontally scrolling the wide staff table, including on phones.

## Technical details

- Implement the change in the HRMS prototype port source and regenerate the generated HRMS file; do not hand-edit the generated output.
- Reuse the existing active master lists and eligible reporting-manager list.
- Reuse the existing per-row fields and validation; the bulk action only populates values and does not bypass required-field checks.

## Verification

- Preview an attendance file containing multiple unmatched staff codes.
- Confirm all six bulk selectors are visible above the list.
- Apply one set of values and verify every checked row receives them.
- Change one row afterward and confirm the exception is preserved.
- Uncheck one row and confirm it is not created or included in imported attendance.
- Confirm the imported staff records retain the selected reporting manager and other values.
