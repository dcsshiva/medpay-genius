# Import Unit 1 staff list (54 rows) without touching admin/manager setup

The uploaded file has 54 people. Several of them already exist in Staff Master as admin/manager users (Rajaram, Deepan Raj, Partha, Nithya). Per your decision, every row whose **department is "ADMIN" is skipped entirely**, and all remaining rows are created as **new staff records with logins**.

## What happens

1. Rows skipped
   - Any row with department "ADMIN" (finance manager, lab incharge, general manager rows) is reported as "skipped - admin department" and never written. Existing admin/manager staff, their roles, usernames, permissions and role mappings stay untouched.

2. Job titles become real roles
   - The 26 distinct job titles in the file (STAFF NURSE, PHARMACIST, LAB TECHNICIAN, X-RAY - INCHARGE, HOUSE KEEPING, OT - TECHNICIAN, INSURANCE, PURCHASE, DUTY MEDICAL OFFICER, etc.) are added to Roles Master as active roles, with a clean code (e.g. `staff_nurse`, `x_ray_incharge`).
   - The existing role sync trigger adds each code to the staff role list automatically, so imported staff carry their real designation.
   - Titles that already exist (Pharmacist, Nursing Superindentant) reuse the existing role instead of duplicating.

3. Departments
   - The file's 9 departments (NUSING DEPARTMENT, PHARMACY DEPARTMENT, FRONT OFFICE DEPARTMENT, LAB DEPARTMENT, RADIOLOGY DEPARTMENT, CLINICAL DEPARTMENT, ELECTRICAL DEPARTMENT, HOUSE KEEPING DEPARTMENT) are normalised (trailing spaces trimmed, "NUSING" kept as-is unless you want it spelled "Nursing") and added to Departments Master when missing.

4. Staff records created
   - Full name, phone, department, role, biometric code from the file.
   - Staff code auto-generated in the existing 3-letter + 3-digit format.
   - Username taken from the file, cleaned for login use (`MR. AJIT KUMAR` becomes `ajit.kumar`); the original title text stays in the full name.
   - Email auto-generated as `<username>@westmedhospital.com` since the file has no emails.
   - Login account created with the default password `SecurePass789`, so each person can sign in and change it later.

5. Safety checks before writing
   - Duplicate biometric codes (in the file or already in the system) are rejected and listed.
   - If a generated username/email collides with an existing staff member, that row is reported instead of overwriting anyone.
   - A results summary shows: created / skipped (admin dept) / errors, with the reason per row.

## Technical notes

- New roles/departments are inserted into `roles_master` and `departments_master`; `trg_sync_role_to_staff_enum` extends the `staff_role` enum automatically.
- Staff creation goes through the existing `create-user` edge function (auth user + `staff` row + designation `staff`) so records match those created from the UI, including `biometric_code`.
- No changes to existing rows in `staff`, `user_designations`, `staff_screen_permissions`, `staff_approval_permissions` or `department_role_mapping`.
- The import runs as a one-off data load from the uploaded file; the existing Staff Master Excel importer stays as-is for future files.

## Open point

"NUSING DEPARTMENT" is a typo in the file. I will store it as "Nursing Department" unless you want the file spelling preserved.
