

## Sort Tasks: In Progress First, Completed Last

### Change
Add sorting to the filtered tasks list so tasks display in this order:
1. **In Progress** (top)
2. **Pending** 
3. **Completed** (bottom)

### Technical Details

**File: `src/components/TaskManagement.tsx` (after line 443)**

Add a sort step after filtering:

```typescript
const statusOrder: Record<string, number> = {
  in_progress: 0,
  pending: 1,
  completed: 2
};

const sortedTasks = [...filteredTasks].sort((a, b) => {
  return (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
});
```

Then replace all references to `filteredTasks` in the JSX rendering (task grid at line 798 and empty state at line 937) with `sortedTasks`. Keep `filteredTasks` for the report generation since report order doesn't need this sorting.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/TaskManagement.tsx` | Add status-based sorting after filter, use `sortedTasks` in task grid rendering |

