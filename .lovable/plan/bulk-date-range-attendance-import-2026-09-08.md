# Bulk (date-range) attendance import

Keep the current daily import exactly as it is, and add support for the weekly/monthly "Daily Attendance Report (Summary Report)" file so a whole date range can be loaded in one upload.

## What the user gets

- The same Import button also accepts the range report (e.g. "01.09.2026 to 07.09.2026").
- The file is detected automatically — no extra button or mode to pick. Three formats now work:
  1. Our own template (single day)
  2. Biometric punch monitor export (single day)
  3. Range summary report (many days, many staff) — new
- After upload, a summary shows how many days and staff were saved, the date range covered, any staff that could not be matched, and any placeholder staff records created.
- The screen jumps to the last date in the file so the result is visible immediately, and the day-wise register/reports pick the data up straight away.

## Rules agreed

- Every day in the file is saved as-is: a weekly-off day with no punch is recorded as Absent; a weekly-off day that was worked is recorded as Present (or Late).
- Existing records for those days are overwritten by the file.
- Same late cut-off as the daily import (first punch after 09:15 = Late).
- Statuses mapped from the file: Present/WeeklyOff Present → present or late by punch time; Absent and WeeklyOff (no punch) → absent; Leave → leave; Half Day → half_day; Holiday → treated as leave.
- Staff matched by employee code against biometric code, then by name. If neither matches, a placeholder staff record is created from the code and name (same behaviour as today), so no punch is lost.

## Technical notes

- `src/components/StaffAttendanceManagement.tsx`: add `parseRangeSummarySheet(grid)` that walks the sheet blocks — each block starts at an "Employee Code:" row (code + employee name to the right), followed by a `Date / InTime / OutTime / Shift / Total Duration / Status` header, then one row per date until the "Total Duration=… PresentDays=…" footer. Returns `{ empCode, name, days: [{ date, inTime, outTime, status }] }[]`.
- Detection order in `handleImport`: existing punch parser first, then the new range parser, then the template path. Nothing in the existing branches changes.
- Reuse `excelDateToISO`, `norm`, the biometric/name lookup maps and `create_placeholder_staff_from_biometric`.
- Upserts go to `staff_daily_activities` on `staff_id,activity_date` (overwrite), batched in chunks of ~200 instead of one call per row, since a month × 60 staff is ~1,800 rows.
- Import text under the button updated to mention range reports.
