

## Updated Staff Task Flow: In Progress + Completed Options

### Current Behavior
- Staff can only select "In Progress" in the update dialog
- "Update Task" button disables after staff sets to "In Progress"

### New Behavior (per user request)

**Staff update dialog options:**
- 1. In Progress
- 2. Completed

**Button logic:**
- "Update Task" button: enabled while task is pending or in_progress. Once staff sets status to "Completed", the button becomes disabled (shows "Updated")
- "Register Completion" button: only appears after task status is "Completed" AND `actual_completed_at` is not yet set. One-time use only.

### Technical Changes in `TaskManagement.tsx`

**1. Update dialog status options (lines 558-567):**
Staff gets both "In Progress" and "Completed" options instead of only "In Progress":
```typescript
{isStaffRole(userRole) ? (
  <>
    <SelectItem value="in_progress">In Progress</SelectItem>
    <SelectItem value="completed">Completed</SelectItem>
  </>
) : (
  <>
    <SelectItem value="pending">Pending</SelectItem>
    <SelectItem value="in_progress">In Progress</SelectItem>
    <SelectItem value="completed">Completed</SelectItem>
  </>
)}
```

**2. Update Task button disable logic (lines 781-792):**
Disable the button when staff has set the task to "completed" (instead of checking for "in_progress"):
```typescript
const staffAlreadyUpdated = isStaffRole(userRole) && task.status === 'completed' && task.updated_at;
```

**3. Register Completion visibility (lines 797-807):**
Only show "Register Completion" when status is "completed" (not "in_progress"), so staff must first complete the task via Update Task, then register the actual finish time:
```typescript
{!task.actual_completed_at && task.status === 'completed' && (
  <Button ...>Register Completion</Button>
)}
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/TaskManagement.tsx` | Add "Completed" option for staff, disable Update after completed, show Register only after completed |

