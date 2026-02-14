

## Fix: Prevent Multiple "Register Completion" Clicks

### Problem
The "Register Completion" button can be clicked multiple times before the UI refreshes, allowing duplicate submissions.

### Solution
Add a `useRef` guard to prevent rapid double-clicks, and also do a fresh database check before updating to handle race conditions.

### Technical Changes in `TaskManagement.tsx`

**1. Add a ref to track in-progress registration (near other state declarations):**
```typescript
const isRegisteringCompletionRef = useRef(false);
```

**2. Update `registerCompletion` function (lines 251-276):**
- Check the ref at the start; return immediately if already registering
- Fetch fresh task state from DB to verify `actual_completed_at` is still null
- Set ref to true before the operation, false in `finally`

**3. Add `disabled` state to the Register Completion button (lines 803-813):**
- Add a `registeringTaskId` state to visually disable the button during the operation
- Show "Registering..." text while in progress

### Files to Modify

| File | Change |
|------|--------|
| `src/components/TaskManagement.tsx` | Add ref guard, DB validation, and button disabled state to prevent multiple registrations |

