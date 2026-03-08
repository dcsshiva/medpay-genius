

# Timeline/Activity Log + Status Change Notifications

## Approach

### 1. Activity Timeline — Use Existing `audit_logs` Table

The `audit_logs` table already captures all INSERT/UPDATE/DELETE via triggers on tasks and complaints. No new tables needed.

**Query pattern**: `SELECT * FROM audit_logs WHERE table_name = 'tasks' AND record_id = :taskId ORDER BY changed_at DESC`

Each log entry has `old_values` and `new_values` as JSONB — we can diff the `status` field to show status transitions, and use `changed_by` to resolve who made the change.

### 2. Timeline UI Component

Create a reusable `ActivityTimeline` component that:
- Fetches audit logs for a given `table_name` + `record_id`
- Parses old/new JSONB to extract meaningful changes (status, notes, assigned_to, etc.)
- Renders a vertical timeline with dots, timestamps, and actor names
- Shown in a collapsible section on each task/complaint card (expandable via "View Activity" button)
- Resolves `changed_by` (user UUID) to staff name via a lookup

### 3. Database: Notification Triggers for Status Changes

**Task status change trigger** (UPDATE on `tasks` where `OLD.status != NEW.status`):
- Notifies the assigned staff member when their task status changes
- Type: `task_status_changed`

**Complaint status change trigger** (UPDATE on `complaints` where `OLD.status != NEW.status`):
- Notifies the complaint raiser when status changes
- Type: `complaint_status_changed`

### 4. NotificationCenter Updates

Add routing for new notification types (`task_status_changed` → tasks tab, `complaint_status_changed` → complaints tab) and icons.

## Files Changed

| File | Change |
|------|--------|
| New: `src/components/ActivityTimeline.tsx` | Reusable timeline component querying audit_logs |
| `src/components/TaskManagement.tsx` | Add "View Activity" toggle on each task card rendering ActivityTimeline |
| `src/components/ComplaintManagement.tsx` | Add "View Activity" toggle on each complaint card rendering ActivityTimeline |
| `src/components/NotificationCenter.tsx` | Add icons/routing for task_status_changed, complaint_status_changed |
| DB migration | Create notify_task_status_change() and notify_complaint_status_change() triggers |

