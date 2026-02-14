

## Add Staff Attendance Entry with Excel-like Grid and Import

### What This Adds

A new "Staff Attendance" page accessible from the sidebar (admin/manager) that displays attendance in a spreadsheet-like table grid. Admins/managers can:
- View all staff attendance for a selected date in a table (rows = staff, columns = status, shift times)
- Mark attendance inline (dropdown in each row) for the selected date
- Import attendance from an Excel file for bulk entry
- Download an Excel template for bulk attendance import

### Database

No new table is needed -- the existing `staff_daily_activities` table already has `attendance_status` (present, late, absent, half_day, leave), `activity_date`, `staff_id`, `shift_start_time`, `shift_end_time`, and `recorded_by` columns. We will use this table directly.

### How It Works

1. **Date Picker** at the top lets the admin pick a date (defaults to today)
2. A **table grid** loads all active staff and their attendance for that date
3. Each row shows: Staff Code, Name, Role, Department, Attendance Status (dropdown), Shift Start, Shift End
4. Changing a dropdown inserts or updates the `staff_daily_activities` record for that staff + date
5. **Download Template** button generates an Excel with staff list pre-filled (staff_code, full_name) and an attendance_status column
6. **Import Excel** button lets admin upload a filled template to bulk-insert/update attendance

### Technical Details

**New file: `src/components/StaffAttendanceManagement.tsx`**

| Section | Details |
|---------|---------|
| State | `selectedDate`, `staffList`, `attendanceMap` (keyed by staff_id), `loading`, `importing` |
| Fetch | Load all active staff from `staff` table; load `staff_daily_activities` for selected date; merge into a grid |
| Inline Edit | On status dropdown change, upsert into `staff_daily_activities` (insert if no record, update if exists) |
| Template Download | Uses `xlsx` library (already installed) to generate template with staff_code, full_name, attendance_status dropdown, shift_start, shift_end |
| Excel Import | Parse uploaded file, match by staff_code, upsert attendance records |

**Modified files:**

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add `case 'attendance'` to render `StaffAttendanceManagement` |
| `src/lib/navigationItems.ts` | Add `{ id: 'attendance', label: 'Attendance', icon: CalendarCheck }` for admin/manager/super_admin |

### Component Structure

```text
StaffAttendanceManagement
+-- Date Picker + Download Template + Import Excel buttons
+-- Table (Excel-like grid)
    +-- Header: Staff Code | Name | Role | Department | Status | Shift Start | Shift End
    +-- Row per staff member:
        +-- Staff info (read-only)
        +-- Status = Select dropdown (present/late/absent/half_day/leave)
        +-- Shift times = time inputs
        +-- Auto-saves on change
```

### Attendance Statuses (from existing enum)
- Present
- Late
- Absent
- Half Day
- Leave

