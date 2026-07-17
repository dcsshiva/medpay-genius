## Leave Management Dashboard (Admin / Manager)

Transform `ApprovalManagement.tsx` from a pending-only approvals list into a full **Leave & Permission Management Dashboard** with stats, tabbed views, filters, export, and print.

### 1. Top stats cards (clickable → jumps to matching tab)
- Pending Approvals
- Approved (this month)
- Rejected (this month)
- Cancelled / Withdrawn
- Total Leave Days (this month)
- On Leave Today (staff currently on approved leave)

### 2. Tabbed views
- **Pending** — current approve/reject flow (unchanged behaviour)
- **Approved** — approved leaves & permissions
- **Rejected** — rejected applications with rejection reason
- **On Leave Today / Upcoming** — quick roster view
- **All Applications** — everything, for search/audit

Each tab uses the same table component with columns:
Applicant · Type · Date/Period · Days/Duration · Reason · Applied On · Status · Approved/Rejected By · Approved/Rejected On · Notes/Rejection reason · Actions

### 3. Filters (apply to active tab)
- Search (name / staff code)
- Type: Leave / Permission / All
- Status (in All tab)
- Date range (applied-on OR leave date)
- Department / Role (admin only, if data available)
- Reset filters button

### 4. Admin/Manager-only extra actions
- **Revoke Approval** (admin only) — moves an approved app back to pending, with audit note
- **Force Cancel** — cancel an approved future leave
- View full application details drawer (reuses existing ApprovalDialog content in read-only mode)

### 5. Export & Print
- **Export to Excel** — uses `xlsx` (already available pattern in project) with auto-fit column widths; exports the currently filtered rows of the active tab; file name `leave-applications-<tab>-<yyyymmdd>.xlsx`
- **Print** — opens an HTML print window (reuse `printUtils.ts` pattern) with hospital header, filter summary, and the visible table; A4 landscape, table-friendly styling

### 6. Access control
- Only `admin` and `manager` roles can open the dashboard
- Manager sees applications where they are approver + their reportees
- Admin sees everything
- Revoke Approval visible to admin only

### 7. Files to change / add
- **Edit** `src/components/leave-permission/ApprovalManagement.tsx` → rename internal component semantics to dashboard; add stats, tabs, filters, export/print buttons
- **New** `src/components/leave-permission/LeaveDashboardStats.tsx` — stat cards
- **New** `src/components/leave-permission/LeaveApplicationsTable.tsx` — reusable table used by every tab
- **New** `src/components/leave-permission/LeaveDetailsDialog.tsx` — read-only details view + revoke/cancel actions
- **New** `src/lib/leaveExportUtils.ts` — Excel export (auto-fit) + HTML print builder for leave data
- No DB schema change required (uses existing `leave_permission_applications` columns: status, approved_by, approved_at, rejection_reason, etc.)

### Technical notes
- Data fetched once per tab switch, cached in local state; refetch after any status change
- Auto-fit Excel: compute max char width per column across header + rows, cap at 60
- Print: same HTML table styling used by other print reports in the project for visual consistency
- All colors via existing semantic tokens (no hardcoded hex)
