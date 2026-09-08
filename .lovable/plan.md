# Day-wise / Staff-wise Attendance Breakdown

## Goal
Give you a periodic (daily, weekly, monthly) breakdown of the imported attendance data — who was Present/Absent/Late on each day, per staff member — viewable on screen and exportable.

## Current state
- The Attendance screen's **Reports** tab already shows a monthly *staff-wise summary* (totals of Present/Absent/Late/Half-day/Leave + hours).
- There is **no day-by-day view** — you can't see "on 5 Sep who was absent" or a calendar-style grid of each staff member's month.

## What will be added

### 1. "Day-wise Register" (new section in the Reports tab)
A classic attendance register grid:
- **Rows** = staff members, **Columns** = each day of the selected month.
- Each cell shows a colour-coded letter: **P** (green), **A** (red), **L** (yellow), **H** (half-day, orange), **Lv** (leave, blue), blank = unmarked.
- Sundays shaded; sticky first column (Code + Name) so you can scroll across 31 days without losing the staff name.
- Hover/tap a cell to see punch in/out times for that day.

### 2. "Day-wise List" (per-day breakdown)
- Pick any single date (defaults to today) and see the full staff list for that day: status, shift start/end, hours worked.
- Quick chips at top: "Absent today", "Late today", "Unmarked today" — tapping one filters the list.
- Previous/Next day arrows for fast browsing.

### 3. Period / range option
- Beyond month mode, add **From–To date range** pickers so you can review a week or any custom period (register grid adapts to the range).

### 4. Filters & search
- Search staff by name/code; filter by department, role, or status.

### 5. Export & Print
- **Export Excel** button exports the day-wise register (staff × dates matrix, matching the on-screen grid).
- **Print** produces the same register as a clean printable sheet (fits A4 landscape).

### 6. Mobile
- Register grid scrolls horizontally on phones with the staff name column pinned; day-wise list renders as compact touch cards. Desktop layout unchanged.

## Technical notes
- All changes in `src/components/StaffAttendanceReports.tsx` (and one small new child component for the register grid).
- Data comes from the existing `staff_daily_activities` table — same query the summary already uses, no database changes needed.
- Uses the existing `fetchAllPaginated` helper if a range ever exceeds 1000 rows.
