# Current tasks

- [x] Fix Salary → View payslip → Next opening; signed-in checks passed for both unit letterheads, period selection, Back, Print and PDF.

- [x] Add Overview attendance cycle/date labels, stacked unit colours, and a unit legend; five calculation tests passed; signed-in display, unit filtering, cycle switching and day details verified.

- [ ] Update the six remix credentials — blocked until the secure update form is accepted.
- [ ] Replace removed email-function calls with managed sending — blocked until this remix has its own configured email domain.
- [x] Verify `techteam@westmedhospitals.com` and `shivanss@gmail.com` and assign administrator designation without disturbing other accounts.
- [x] Make navigation, dashboards, help, and in-app links staff-only while retaining staff payroll and historical records.
- [x] Show complete roles and precise missing-field errors when attendance imports add new staff.
- [x] Default newly discovered attendance staff to Unit 1 / Front Office / Front Office Executive / General Shift / Staff / no manager, with salary pending edit.
- [x] Add a visible bulk-fill section for Unit, Department, Designation, Shift, Role and Reporting Manager in attendance import.
- [x] Match every attendance import to existing HRMS Staff Master records by normalized biometric code and preserve saved staff details.
- [ ] Verify attendance import in a signed-in preview — blocked until a preview account is signed in; requester account is not available for session minting.
- [x] Add designation-restricted 4-Hour Break Shift (S5) with assignment filtering in Staff Master, attendance import, and Shift Planner.
- [x] Staff Master: drag-to-slide on wide tables, search boxes keep focus while typing, Shift Planner legend and colours cover all Shift Master shifts.
- [x] PF and ESI off for every staff member (live data updated 2026-10-12); new staff default to off; administrators turn them on per staff in Staff Master.
- [x] Lateness uses the shift nearest the IN punch for everyone except General Shift staff (Shift Planner overrides still win); applies to all cycles because lateness is computed live.
- [x] Overview explorer: every card, chart bar, late-comer row, payroll segment and table row opens a drill-down (unit → department → staff → day-by-day sheet; staff → manager, reports, tasks, leave) with breadcrumb and Back; managers explore only their reports, salary hidden.
- [x] Security stage 1 (live 2026-10-12): no anonymous access to HR tables, staff directory or HR functions; directory only for HR users; must-change-password flag on the 139 default-password accounts.
- [x] Forced "choose a new password" screen before any data loads; passwords ≥ 6 characters and never the Staff Code; admin-set passwords must be replaced at next sign-in.
- [x] Saving: an edit made while a save is running is no longer lost; a failed insert batch no longer creates duplicate tasks / leave requests.
- [x] Security stage 2 (live 2026-10-29): migration 0019 applied — accounts on a default or admin-set password get no HR data until they choose their own; managers see and act on their own reports only.
- [x] Removed the unused verify-emergency-otp edge function (hard-coded access codes) from the repo.
- [ ] Delete the already-deployed verify-emergency-otp function in Supabase (Edge Functions) — removing the code does not undeploy it.
- [x] Look and feel: "Digitify Desk" style (navy top bar and frame, one white rounded panel, blue #0971F9 accent, Roboto, 8px corners, flat borders, compact 13px tables, labels never upper-case, tinted rounded status pills); one light theme. Styles only — no behaviour changes.
- [x] Module menu in the navy top bar (admin and staff workspaces; own row below laptop width, scrolls sideways on phones).
- [x] Version management: every push to main bumps the release number and stamps the release time (fixed workflow — it was failing on `npm ci`); the app shows "v… · Released <date, time>" in the top bar and on the sign-in screen.
- [x] 11 staff absent on every working day 27 Aug – 27 Oct 2026 made inactive (live data, 2026-10-29); managers, reporting managers and admins excluded. Inactive staff are left out of attendance counts, charts, ledger and payroll; Staff Master can reactivate them.
- [x] 5 more long-absent staff made inactive (live 2026-10-29: Swetha, Jodhimani, Dhinakaran, Muthamizh, Dharshan B). Palaniappan, Thiyagarajan, Sugumar and Senthil Murugan kept active (recent joiners / punched in on 27 Oct).
- [x] Punches re-read before counting (src/hrms/punches.js): night shifts paired across midnight, morning after a night = off after night duty, single IN punch marked Absent = Present ("missing OUT punch"). General-shift staff punching in 3+ hours after shift start are measured against the nearest other shift.
- [x] Weekly off per staff (Staff Master → Weekly off; column hr_staff.weekly_off live 2026-10-29): when set it replaces the device's Sat/Sun weekly offs for that person.
- [ ] HR to fill in Weekly off for staff whose day off isn't Saturday/Sunday.
- [x] Punch Monitor import reads columns from the header row and checks each value (src/hrms/punchMonitor.js); a time or number is never taken as a staff name. Fixed 4 names saved as times on 2026-10-29 (2100408, 2100420, 2100422, 2100423).
- [ ] Re-import the 27 Oct Punch Monitor file once this is published — that day was misread (91 Absent, punches lost).
