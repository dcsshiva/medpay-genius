# 4-Hour Break Shift — designation-restricted assignment

## What you'll get

- A new **4-Hour Break Shift** appears in Shift Master (placeholder timings 10:00–14:00, 15-min grace — a manager can edit them anytime).
- Only staff with these designations can be **assigned** this shift (in Staff Master or the Shift Planner):
  - Admin (role)
  - HR Manager
  - HR Executive
  - General Manager – Sales & Marketing
  - General Manager – Accounts & Finance
  - Purchase & Accounts Executive
  - Operations Manager (all holders — covers "1" and "2")
  - Senior Marketing Executive
  - Digital Marketing & Technical Assistant
  - Project & Maintenance In-Charge
- If a manager tries to assign the Break Shift to anyone else, the selection is blocked with a clear message naming the allowed designations. Existing assignments of other staff to this shift are shown with a warning flag but not silently changed.
- Punch detection is **not** restricted (per your choice): anyone's punch can still attach to the nearest shift as today.

## How it works

1. **Database (additive, no breaking changes):**
   - Add nullable column `allowed_designations text[]` to `hr_shifts` (null/empty = everyone allowed, so existing shifts are unaffected).
   - Insert the new shift row: code `S5`, letter `B`, name "4-Hour Break Shift", 10:00–14:00, grace 15 min, with `allowed_designations` set to the designation codes above (DSG7, DSG8, DSG31, DSG5, DSG6, DSG27, DSG29, DSG9, DSG26) plus a special `ADMIN` marker for the Admin role.
2. **App (prototype port, per project convention):**
   - Load `allowed_designations` with the shift list in `src/hrms/data.ts`.
   - In `scripts/port_prototype.py`, patch the shift dropdowns in Staff Master (add/edit staff) and the Shift Planner so choosing the Break Shift for a non-eligible staff member is rejected with a toast/message; eligible check = staff designation in the shift's list, or staff role is Admin when the list includes the ADMIN marker.
   - Show a small lock/hint on restricted shifts in the dropdown so managers see the rule before picking.
   - Regenerate `src/hrms/prototype.ts` via `python3 scripts/port_prototype.py` (never hand-edit).
3. **Shift Master screen:** the new shift appears like any other; its designation restriction is visible in the helper text. Editing the allowed list later is a data change an admin can request — no code change needed.

## Verification

- Build log stays clean after regenerating the prototype.
- Isolated Playwright harness check: assigning the Break Shift to an HR Executive succeeds; assigning it to a Staff Nurse is blocked with the message; unrestricted shifts still assign to anyone.

## Out of scope

- No change to attendance punch detection, late rules, or payroll.
- No existing staff records are modified.
