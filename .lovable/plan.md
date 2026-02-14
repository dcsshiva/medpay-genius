

## Make Task Stats Cards Clickable

### What Changes
The four stats cards (Pending, In Progress, Completed, Overdue) in the Task Management screen will become clickable filters. Clicking a card will set the status filter to that card's status, instantly filtering the task list below. Clicking the same card again will reset the filter to "All".

### File to Modify

**`src/components/TaskManagement.tsx`** (lines 565-613)

- Add `cursor-pointer` and active ring/border styling to each stats card
- On click, set `statusFilter` to the corresponding status (or reset to `'all'` if already active)
- Visually highlight the active card with a colored border/ring matching its icon color
- Add `transition-all` and `hover:shadow-md` for tactile feedback on both desktop and mobile
- Ensure touch targets are comfortable (cards already have `p-6` so sizing is fine)

### Visual Behavior
- Default state: cards look as they do now
- Hover: subtle shadow lift
- Active (filtered): colored left border or ring matching the status color (teal for Pending, warning for In Progress, green for Completed, red for Overdue)
- Click same card again: deselects and shows all tasks

### No Other Changes
- Filter dropdowns below still work independently
- Task list, create dialog, update dialog all unchanged
- All existing logic preserved

