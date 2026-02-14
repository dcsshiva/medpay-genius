

## Track Task Update Time and Actual Completion Time

### What Changes

Two new time-tracking features for tasks:

1. **Update Click Time**: When clicking "Update Task", the `updated_at` column (already exists) will be explicitly set to the current IST timestamp, so you can see when the last update happened. This timestamp will also be displayed on the task card.

2. **Register Actual Finish Time**: A new column `actual_completed_at` and a "Register Completion" button that staff can click when they physically finish the task. This is separate from the status change -- it captures the real-world finish time.

### Database Changes

Add one new column to the `tasks` table:

```sql
ALTER TABLE public.tasks ADD COLUMN actual_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
```

### UI Changes (TaskManagement.tsx)

1. **Update Task dialog**: When submitting, explicitly set `updated_at` to current IST time
2. **New "Register Completion" button**: Appears on in-progress or completed tasks that don't yet have an `actual_completed_at` value. Clicking it stamps the current time.
3. **Display timestamps**: Show `updated_at` (last updated) and `actual_completed_at` (actual finish time) on task cards when available

### Technical Details

**Task interface update:**
- Add `actual_completed_at?: string` and `updated_at: string` to the Task interface

**updateTaskStatus function:**
- Always include `updated_at: toISOStringIST()` in the update payload

**New function `registerCompletion`:**
```typescript
const registerCompletion = async (taskId: string) => {
  const { error } = await supabase
    .from('tasks')
    .update({ actual_completed_at: toISOStringIST(), updated_at: toISOStringIST() })
    .eq('id', taskId);
  // toast + refresh
};
```

**Task card additions:**
- Show "Last Updated: [time]" below the created date
- Show "Finished at: [time]" when `actual_completed_at` is set
- Add a "Register Completion" button (clock icon) for tasks without `actual_completed_at`

### Files to Modify

| File | Change |
|------|--------|
| New migration SQL | Add `actual_completed_at` column to tasks |
| `src/components/TaskManagement.tsx` | Add updated_at tracking, register completion button, display timestamps |

