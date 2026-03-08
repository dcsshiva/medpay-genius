

# Task & Complaint Management: Industry-Standard Flow Improvements

## Current Gaps Found

### Task Management
1. **No manager verification step** — When staff marks a task "completed," it's final. Industry standard: manager should verify/approve the completion.
2. **No cancel with reason** — Tasks can't be cancelled from the UI; there's a "cancelled" status in the type but no way to use it.
3. **Overdue never triggers** — The "overdue" status exists but is never automatically set when `due_date` passes.
4. **One-click status changes have no confirmation** — Admin clicks "Complete" and it happens instantly with no notes.

### Complaint Management
1. **Status changes happen without requiring notes** — Admin clicks "Take Action" / "Start Progress" / "Mark Solved" with no explanation captured.
2. **No "Close" action** — After solved/resolved, there's no way to formally close the complaint.
3. **"Solved" vs "Resolved" is confusing** — Two similar terminal states. Industry standard: Solved (by handler) → Closed (verified/accepted).
4. **"Respond & Resolve" skips workflow** — Jumps from open directly to resolved without intermediate steps.

## Plan

### 1. TaskManagement.tsx — Add Verification & Cancel Flows

**Manager verification of completed tasks:**
- When staff marks task "completed," add a new visual indicator "Awaiting Verification" on the card
- Admin/manager sees a "Verify Completion" button on completed tasks that don't have `actual_completed_at`
- Clicking "Verify Completion" opens a small dialog with optional notes, then stamps `actual_completed_at`
- This replaces the current "Register Completion" button with a more meaningful label

**Cancel with reason:**
- Admin/manager gets a "Cancel" button on pending/in_progress tasks
- Opens a dialog requiring a cancellation reason (stored in `notes`)
- Sets status to "cancelled"

**Overdue auto-detection:**
- Add a `useMemo` that checks `due_date < now` for pending/in_progress tasks and visually marks them as overdue (red border, overdue badge) without changing DB status

**Confirmation for direct status changes:**
- Wrap "Start Task" and "Complete" admin buttons with a small confirmation + optional notes dialog

### 2. ComplaintManagement.tsx — Proper Status Workflow with Notes

**Action notes dialog for all status changes:**
- Create a reusable "Status Change Dialog" that appears for every status transition
- Shows: current status → new status, required action notes textarea, confirm button
- All transitions (`Take Action`, `Start Progress`, `Mark Solved`, `Close`) go through this dialog

**Streamlined status flow:**
- Open → Take Action (requires notes) → In Progress (requires notes) → Solved (requires notes) → Closed (final, requires closing notes)
- Remove "Respond & Resolve" shortcut — force proper workflow
- "Under Review" becomes an alternative to "Take Action" for complaints needing investigation
- Remove separate "resolved" status from UI flow — use Solved → Closed instead

**Close action:**
- Add "Close Complaint" button on solved complaints
- Requires closing verification notes
- Updates status to "closed"

## Files Changed

| File | Change |
|------|--------|
| `src/components/TaskManagement.tsx` | Add verification dialog, cancel with reason dialog, overdue visual detection, confirmation for status changes |
| `src/components/ComplaintManagement.tsx` | Add status change dialog with required notes, add Close action, remove Respond & Resolve shortcut, streamline status flow |

No database changes needed — all fields (`notes`, `action_notes`, `actual_completed_at`, `status: cancelled/closed`) already exist in the schema.

