

## Task Update Flow: Staff vs Admin Controls

### What Changes

Modify the task update behavior so that:

1. **Staff can only set tasks to "In Progress"** (remove "Completed" option from staff update dialog)
2. **Once staff updates a task, disable the "Update Task" button** for that staff member -- the task stays "in_progress" until admin reviews
3. **"Register Completion" records finish time and disables itself** after use -- does NOT change status to completed
4. **Only admin/manager can mark tasks as "Completed"**

### How It Works

**For Staff:**
- "Update Task" button: only allows changing to "in_progress" + adding notes. Once task is already "in_progress" and has been updated (has `updated_at`), the button is disabled
- "Register Completion" button: stamps `actual_completed_at` time. Once stamped, button disappears (already works this way)
- Staff CANNOT set status to "completed"

**For Admin/Manager:**
- Full control: can Start, Complete, or Update tasks regardless of staff actions
- Can see when staff last updated and when they registered completion

### Technical Details

**Changes in `TaskManagement.tsx`:**

1. **Update dialog for staff** (lines 558-563): Remove "Completed" option, only show "In Progress"
2. **Disable "Update Task" button for staff** (lines 774-781): Add condition -- if task is already `in_progress` and `updated_at` is set, disable the button
3. **Register Completion** (line 251-276): Keep as-is (only stamps time, no status change) -- already correct behavior

**Specific code changes:**

Staff update dialog options:
```typescript
// Staff can only set to in_progress
{isStaffRole(userRole) ? (
  <SelectItem value="in_progress">In Progress</SelectItem>
) : (
  <>
    <SelectItem value="pending">Pending</SelectItem>
    <SelectItem value="in_progress">In Progress</SelectItem>
    <SelectItem value="completed">Completed</SelectItem>
  </>
)}
```

Disable Update Task button for staff when already updated:
```typescript
// Staff: disable if already in_progress and has been updated
const staffAlreadyUpdated = task.status === 'in_progress' && task.updated_at;

<Button 
  size="sm" 
  onClick={() => handleUpdateTask(task)}
  disabled={!!staffAlreadyUpdated}
>
  {staffAlreadyUpdated ? 'Updated' : 'Update Task'}
</Button>
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/TaskManagement.tsx` | Restrict staff status options, disable buttons after staff update |

