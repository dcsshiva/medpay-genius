# Dashboard Attendance Status Card

## Goal
Add one compact attendance status card to the main dashboard for Admin, Manager, and Staff Manager users.

## What will be added
- Show **Total Staff**, **Present**, **Absent**, and **Late** in one mobile-friendly card.
- Default the card to the **latest imported attendance date**, so it remains useful when today has no imported data.
- Add a compact period selector with:
  - **Latest** — most recent attendance date in the imported records.
  - **Day** — a chosen date.
  - **Week** — the selected date’s week.
  - **Month** — the selected month.
- Display the active date or date range clearly on the card.
- Let the card open the existing Attendance Reports screen for further detail.
- Keep the existing admin, manager, and staff dashboard cards unchanged.

## Counting rules
- **Total Staff** counts active staff who have a biometric code, matching the existing attendance reports.
- **Present / Absent / Late** use the existing attendance statuses from imported records.
- Latest and Day show staff counts for one date.
- Week and Month show attendance-entry totals across the selected period; a staff member may appear on multiple days.
- Half Day, Leave, and Unmarked will not be added because the requested card is limited to Present, Absent, and Late.

## Access and compatibility
- Show the card to Admin and Manager roles.
- Also recognize the staff-master `staff_manager` role, even when its login designation remains Staff.
- Do not expose manager payment cards or other restricted dashboard information to Staff Managers.
- Use the existing card, selector, date input, loading, and empty-state patterns; fit cleanly on mobile while preserving the desktop dashboard.

## Technical details
- Add a focused attendance summary component and mount it in the main dashboard for manager-like users.
- Query only the latest date and selected date range from `staff_daily_activities`, plus the active biometric-linked staff count.
- Reuse the centralized manager-role helper to identify Staff Managers safely.
- Verify latest-date fallback, day/week/month calculations, role visibility, navigation, and mobile/desktop rendering.
