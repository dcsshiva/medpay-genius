

# Fix: Doctor Hub Slow Loading & Infinite Re-render Loop

## Root Cause

The console shows **"Maximum update depth exceeded"** originating from `useQuickAccessItems.tsx` line 80 inside `AppSidebar`. This infinite re-render loop is the primary reason Doctor Hub (and all pages) feel slow on first load.

**The cycle:**
1. `AppSidebar` calls `getNavigationItems()` → new array reference every render
2. This array is passed to `useQuickAccessItems(allNavigationItems)`
3. Inside the hook, `buildManualItems` and `fetchAnalyticsItems` are `useCallback` deps on `navigationItems` → recreated every render
4. The `useEffect` depends on these callbacks → fires every render
5. `setQuickItems()` triggers a re-render → back to step 1

This creates an infinite loop that saturates the main thread, delaying everything including Doctor Hub's RPC call.

## Fix

### 1. Stabilize `navigationItems` reference in AppSidebar
Wrap the `getNavigationItems()` call in `useMemo` so the array reference only changes when its inputs change.

**File:** `src/components/AppSidebar.tsx`
- Add `useMemo` import
- Memoize `allNavigationItems`:
```ts
const allNavigationItems = useMemo(() => 
  getNavigationItems({ userRole, userDesignation, userProfile }),
  [userRole, userDesignation, userProfile?.id]
);
```

### 2. Stabilize `navigationItems` inside useQuickAccessItems
Add a ref-based comparison so the hook only reacts to actual content changes, not reference changes.

**File:** `src/hooks/useQuickAccessItems.tsx`
- Use `useRef` + `JSON.stringify` comparison to detect real changes in `navigationItems`
- Only update internal state when the items actually differ

### 3. Memoize `fetchStats` in AppSidebar
The `fetchStats` function is also recreated every render and used in a `useEffect` — wrap it in `useCallback`.

These changes eliminate the infinite loop, which will dramatically improve first-load performance for Doctor Hub and all other pages.

