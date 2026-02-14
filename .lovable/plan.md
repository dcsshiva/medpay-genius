

## Comprehensive Feature Enhancement Plan

This plan covers 6 modules to be built incrementally. Each module is independent and can be approved/built one at a time.

---

### Module 1: Attendance Reports and Analytics

**What it does**: Adds a new "Reports" tab to the Staff Attendance page with monthly/weekly summaries, late trend charts, and Excel export.

**New component**: `src/components/StaffAttendanceReports.tsx`

- Month/year selector to pick reporting period
- Summary cards: Total working days, Present %, Absent %, Late %, Half-day count, Leave count
- Per-staff breakdown table: Staff Code, Name, Present days, Absent days, Late days, Leave days, Working hours total
- Late trend bar chart using Recharts (days of week with highest late counts)
- Export to Excel button generating a formatted `.xlsx` with all staff attendance for the selected month

**Database**: No new tables needed -- queries aggregate from existing `staff_daily_activities` table using date range filters.

**Integration**: Add a Tabs wrapper in the attendance view with "Daily Entry" (existing) and "Reports" tabs.

---

### Module 2: Staff Salary / Payroll Module

**What it does**: Basic salary structure linked to attendance data -- calculates deductions for absences and overtime.

**New database tables**:

| Table | Key Columns |
|-------|-------------|
| `staff_salary_structure` | staff_id, basic_salary, hra, conveyance, medical, other_allowances, is_active |
| `staff_payroll` | staff_id, payroll_month (YYYY-MM), total_working_days, present_days, absent_days, late_days, overtime_hours, gross_salary, deductions, net_salary, generated_by, status (draft/approved/paid) |

**New components**:
- `src/components/StaffSalaryStructure.tsx` -- Manage per-staff salary breakdowns
- `src/components/StaffPayrollGeneration.tsx` -- Select month, auto-calculate from attendance, review and approve, export payslip PDF

**RLS**: Admin and Manager can manage; Staff can view their own payroll records.

**Logic**: 
- Per-day rate = basic_salary / total_working_days
- Absent deduction = absent_days x per-day rate
- Late deduction = configurable (e.g., 3 lates = 1 absent)
- Overtime = hours beyond shift x 1.5 rate

---

### Module 3: Notification System Enhancements

**What it does**: Extends current notification triggers to cover more events and adds notification preferences.

**New database triggers** (no new tables needed, uses existing `notifications` table):
- Payment status changes (approved, rejected, released) -- notify doctor
- Payroll generated -- notify staff
- Task deadline approaching (due within 24 hours) -- notify assigned staff
- Attendance marked as absent/late -- notify staff

**New component**: `src/components/NotificationPreferences.tsx`
- Toggle on/off per notification type in Settings
- New column `notification_preferences` (jsonb) on `profiles` table

**Enhanced NotificationCenter**: Add notification type icons for payment, payroll, and attendance types.

---

### Module 4: Audit Trail / Activity Log

**What it does**: Tracks who changed what and when across key tables.

**New database table**:

| Column | Type |
|--------|------|
| id | uuid |
| table_name | text |
| record_id | uuid |
| action | text (INSERT/UPDATE/DELETE) |
| changed_by | uuid |
| old_values | jsonb |
| new_values | jsonb |
| changed_at | timestamptz |
| ip_address | text (nullable) |

**Implementation**: Database triggers on critical tables:
- `payments`, `payment_releases` -- financial changes
- `staff` -- staff record changes
- `doctors` -- doctor record changes
- Master tables -- configuration changes
- `leave_permission_applications` -- approval changes

**New component**: `src/components/AuditTrailViewer.tsx`
- Filterable log viewer: by table, user, date range, action type
- Shows before/after diff for updates
- Excel export of audit records
- Accessible from Settings for admin users only

**RLS**: Only admin and super_admin can view audit logs.

---

### Module 5: Vendor Payment Reports

**What it does**: Vendor-wise payment summary using existing `quick_payments` table (which has `vendor_id` linking to `vendors` table).

**New component**: `src/components/VendorPaymentReports.tsx`

- Vendor-wise summary cards: Total paid, TDS deducted, Net paid, Payment count
- Date range filter
- Vendor dropdown filter
- Detailed table: Vendor Name, Total Gross, Total TDS, Total Net, Number of Payments
- Drill-down: Click vendor to see individual payment list
- Export to Excel with vendor-wise breakdown
- Payment mode split (bank vs cash vs cheque) per vendor

**Database**: No new tables -- aggregates from `quick_payments` joined with `vendors`.

**Integration**: Add as a new tab in QuickPaymentManagement or as standalone report accessible from sidebar.

---

### Module 6: Mobile Staff Self-Service Enhancements

**What it does**: Extends `StaffMobileDashboard.tsx` with attendance punch-in/out and payslip access.

**Attendance punch-in/out**:
- "Punch In" button records shift_start_time for today
- "Punch Out" button records shift_end_time
- Shows current status (Punched In at HH:MM / Not punched in)
- Auto-sets attendance_status to "present" on punch-in

**Payslip viewing** (after Module 2):
- "My Payslips" quick action card
- List of monthly payslips with status badges
- View payslip detail with salary breakdown

**My Attendance summary**:
- Current month at-a-glance: Present/Absent/Late counts
- Simple calendar heat-map showing status per day

**Modified files**:
- `src/components/StaffMobileDashboard.tsx` -- Add punch-in card and payslip action
- New: `src/components/StaffAttendanceCalendar.tsx` -- Mini calendar component

---

### Recommended Build Order

| Priority | Module | Dependencies |
|----------|--------|-------------|
| 1 | Attendance Reports | None |
| 2 | Audit Trail | None |
| 3 | Vendor Payment Reports | None |
| 4 | Notification Enhancements | None |
| 5 | Salary/Payroll | Attendance Reports (for data) |
| 6 | Mobile Self-Service | Salary/Payroll (for payslips) |

### Technical Notes

- All new components follow existing patterns: Supabase queries, Card/Table UI, toast notifications, Excel export via `xlsx` library
- Charts use `recharts` (already installed)
- PDF generation uses `jspdf` + `jspdf-autotable` (already installed)
- RLS policies use existing `has_designation()` function
- No new edge functions needed for Modules 1, 2, 4, 5, 6
- Module 3 (notifications) uses existing database trigger pattern

