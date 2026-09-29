# Staff-only navigation and dashboard

## What will change
- Remove Doctor Management, Doctor Hub, Visit Management, cash and insurance payments, general/quick payments, bank advice, TDS and vendor/payment reports from the desktop sidebar and mobile navigation for every role, including administrators. Keep staff management, attendance, tasks, leave, complaints, chat, staff reports and payroll/salary tools.
- Replace doctor, visit and patient-payment dashboard cards with staff-related information. Preserve the existing attendance and task summaries; keep staff payroll separate from patient payment screens.
- Block opening the removed screens through saved links, dashboard actions, notifications, quick access, or other in-app navigation. Send attempts to the staff dashboard instead. Remove misleading doctor/payment shortcuts and related options from navigation customization where appropriate.
- Leave existing historical records and staff finance untouched; this changes the app experience, not the underlying stored data.

## Technical approach
- Maintain one staff-only screen exclusion list and apply it to both database-driven and fallback navigation, and to the central tab dispatcher. This prevents administrator permission bypasses and stale shortcuts from rendering removed screens.
- Update the admin/manager dashboard queries and cards so they no longer fetch doctor/visit/patient-payment statistics. Handle doctor-only redirects without exposing Doctor Hub; retain existing authentication and staff roles.
- Check alternate entry points (mobile menu, chatbot navigation, notifications, quick access, menu settings) against the same exclusions rather than relying on sidebar visibility alone.
- Verify desktop and phone navigation, admin/manager dashboards, direct-link attempts, and the retained staff payroll flow.

**Note:** Blocking here means these screens cannot open in this app. It does not revoke historical database access or delete any doctor/payment records.
