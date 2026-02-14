

## Add "Re-assign Task" Option for Admin/Manager

### What Changes

Add a "Re-assign" button on task cards (visible only to admin/manager) that allows reassigning a completed or any-status task to a different staff member. This resets the task back to "pending" status so the new assignee can start fresh.

### How It Works

- A "Re-assign" button appears on task cards for admin/manager users
- Clicking it opens a dialog with a staff dropdown to pick the new assignee
- On submit, the task's `assigned_to` is updated to the new staff member, status is reset to "pending", and `actual_completed_at` / `completed_at` / `updated_at` fields are cleared
- The task then appears as a fresh pending task for the new staff member

### Technical Details

**Changes in `TaskManagement.tsx`:**

1. **Add reassign state variables**: `reassignDialogOpen`, `reassignTaskId`, `reassignStaffId`

2. **Add reassign handler function** (`handleReassign`):
   - Updates the task in DB: sets `assigned_to` to new staff, `status` to `pending`, clears completion timestamps
   - Shows success toast and refreshes task list

3. **Add "Re-assign" button** in the task card action buttons area (admin/manager only):
   - Appears alongside existing Start/Complete buttons
   - Opens a small dialog with staff selection dropdown and confirm button

4. **Add Reassign Dialog**: Simple dialog with staff dropdown + submit button, similar to the create task's "Assign To" field

### Files to Modify

| File | Change |
|------|--------|
| `src/components/TaskManagement.tsx` | Add reassign dialog, state, handler, and button for admin/manager |

