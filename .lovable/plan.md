# Biometric code in Staff Master + template-driven import

The biometric fields already exist in the database and in the Add/Edit Staff form (your uploaded template was downloaded from an older build, so it has no biometric columns). This plan closes the remaining gaps so attendance import always matches the right staff record.

## What changes

1. Staff Master form (new/edit)
   - Keep Biometric Code as a required field, Biometric Device optional.
   - Duplicate check becomes case/space insensitive and blocks saving with a clear message naming the conflicting staff member.
   - Show the biometric code as a column in the staff list so unmapped staff are visible at a glance.

2. Download template (Excel)
   - Regenerate with the biometric columns included (staff_code, username, full_name, email, phone, role, department, password, biometric_code, biometric_device).
   - Add a second "Instructions" sheet: which fields are required, allowed roles, biometric code format, and a note that the first sample row is ignored on import.
   - Mark biometric_code as required in the sample row wording.

3. Export current staff (new button next to Download Template)
   - Exports existing staff in the exact template column order so you can fill in biometric codes for everyone at once and re-import.

4. Import from Excel (based on the template)
   - Sample row is detected and skipped (already working) — keep it.
   - Reject rows with a missing biometric_code, listed per row in the results dialog.
   - Detect duplicate biometric codes both within the file and against existing staff, and report them instead of silently overwriting.
   - Treat a biometric-only change as an update: currently a row whose only difference is the biometric code is counted as "skipped".
   - Import results dialog gains a summary line: inserted / updated / skipped / errors and how many staff still have no biometric code.

## Technical notes

- `src/lib/excelImportUtils.ts`: extend `generateStaffTemplate` (instructions sheet), add `generateStaffExport(staff)`, and include `biometric_code`/`biometric_device` in `analyzeStaffImport` field comparison.
- `src/components/StaffManagement.tsx`: validation in `handleStaffImport` (required + duplicate biometric), export button, list column, case-insensitive duplicate check in the form submit path.
- No database migration needed — `staff.biometric_code` and `staff.biometric_device` already exist, and `create-user` already persists both.
