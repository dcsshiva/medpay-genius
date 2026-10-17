# Unit-wise Attendance Calendar on Admin Overview

## Goal
Add a new "Attendance Calendar (This Cycle)" panel to the admin Overview, below the daily attendance chart.

## Layout
```text
Unit        26  27  28  29  30 | 1  2  3 ... 25
            Fri Sat Sun ...
Unit 1      42  40  WO  41  --   ...
            3A  5A      4A
Unit 2      ...
Total       ...
```
- Columns = every day of the selected pay cycle, left to right (for example 26 Sep to 25 Oct), with weekday under the date and a month break marker. Scrolls sideways (drag works too); the Unit column stays pinned.
- Rows = each available unit (follows the "All units" picker), plus a Total row.
- Each cell shows Present count (green) and Absent count (red); Late is included in Present with a small marker.
- Days with no imported attendance show a grey "Not received" cell (dashed). Future days are faded. Weekly off and holidays are shaded.
- Legend below: Present, Absent, Not yet imported, Weekly off / holiday.
- Clicking a cell opens that day's attendance details for that unit (same popup the chart uses).
- Follows the cycle picker at the top.

## Technical details
- Add a pure helper `attendanceCalendar(dates, staff, attendance, units)` in `src/hrms/attendanceChart.js` returning per unit/day `{present, late, absent, off, status: 'ok'|'missing'|'future'}`; "missing" = no attendance rows for any staff of that unit that day. Add node tests next to the existing ones.
- Render via a new `unitAttendanceCalendar()` patch in `scripts/port_prototype.py`, inserted after the chart in `renderAdminOverview`; regenerate `src/hrms/prototype.ts`.
- Styles in `src/hrms/hrms.css` using existing tokens; sticky first column.
