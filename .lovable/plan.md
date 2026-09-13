# Personal Attendance Card for Staff Dashboards

## Goal
Let each staff member see only their own attendance performance directly on their dashboard, on both desktop and mobile.

## What will change

### 1. Personal attendance summary card
- Add a staff-specific version of the Attendance card showing **Present, Absent, Late, Half-day, and Leave** for the signed-in staff member only.
- Default to the staff member's **latest imported attendance date**.
- Include **Latest / Day / Week / Month** period controls, matching the manager attendance card.
- Show the selected date or range and clear loading, unavailable, and no-record states.

### 2. Both staff dashboard experiences
- Display the card on the regular desktop staff dashboard.
- Display the same card near the top of the mobile staff dashboard, below punch-in/out and before task statistics.
- Keep the existing monthly attendance calendar on mobile for the day-by-day view.

### 3. Privacy and role handling
- Resolve the signed-in user's linked staff record using the existing staff identity helper.
- Every attendance query will be filtered by that staff ID; no totals or records belonging to other staff will appear.
- Staff Managers will retain the all-staff management summary on their manager-style dashboard rather than receiving the ordinary staff card.

### 4. Navigation and compatibility
- The card's details action will open the staff member's existing attendance calendar area or personal attendance destination available to that role, without granting access to management reports.
- Use the existing responsive card styling so controls and metrics fit phone, tablet, and desktop widths without horizontal overflow.

## Technical notes
- Extend the existing dashboard attendance card with a personal mode instead of duplicating date-range and status-count logic.
- Wire personal mode into `Dashboard.tsx` and `StaffMobileDashboard.tsx` after resolving the staff ID.
- Reuse `staff_daily_activities`; no database schema change is required.
- Validate with type checking, production build, and signed-in desktop/mobile browser checks.
