
## Fix Quick Access Data Mismatch and Session Logout on Refresh

### Root Cause 1: Quick Access Does NOT Match Heatmap

**The real problem** is NOT about caching or realtime -- it's about how data is aggregated.

The same `navigation_id` gets stored with DIFFERENT `navigation_name` values depending on the user's role:

```text
navigation_id = "doctors"
  - Admin clicks it: stored as "Doctor Management" (10 clicks)
  - Manager clicks it: stored as "Doctors" (11 clicks)

navigation_id = "doctor-hub"  
  - Admin clicks it: stored as "Doctor Hub" (19 clicks)
  - Doctor clicks it: stored as "My Dashboard" (7 clicks)
```

- The **Heatmap** aggregates by `navigation_name` -- so "Doctors" (11) and "Doctor Management" (10) appear as separate entries
- **Quick Access** aggregates by `navigation_id` -- so "doctors" = 21 total (merging both names)

This causes different rankings between the two views.

**Fix:** Change Quick Access to aggregate by `navigation_name` (matching the heatmap), then match navigation items by label instead of by ID.

---

### Root Cause 2: Auth Page Never Redirects Logged-In Users

**The real problem** is NOT about localStorage vs sessionStorage or RPC failures -- all of that is working correctly now. The actual issue:

- Route `/` renders `<Auth />` (the login page) in `App.tsx` line 57
- When the user refreshes, the Lovable preview loads at `/`
- `AuthProvider.loadSession()` correctly restores the session from localStorage via the RPC
- BUT `Auth.tsx` has **NO code to check if user is already logged in and redirect to `/dashboard`**
- So the user sees the login page even though their session is perfectly valid

The redirect logic exists ONLY in `Index.tsx` (dashboard), which only runs at `/dashboard`. It never runs at `/`.

**Fix:** Add a `useEffect` in `Auth.tsx` that checks if the user is already authenticated (after loading completes) and redirects to `/dashboard`.

---

### Implementation

#### File 1: `src/hooks/useQuickAccessItems.tsx`

Change aggregation from `navigation_id` to `navigation_name` to match the heatmap exactly:

- Fetch `navigation_name` only (not `navigation_id`)
- Aggregate counts by `navigation_name`
- Rank by count descending (same as heatmap)
- Match to user's navigation items by comparing `item.label === navigation_name`
- Take top 6 accessible items

#### File 2: `src/pages/Auth.tsx`

Add redirect for already-authenticated users:

```typescript
useEffect(() => {
  if (!loading && user) {
    navigate('/dashboard');
  }
}, [user, loading, navigate]);
```

This uses `loading` from `useAuth()` which is `true` while `loadSession()` runs, and becomes `false` once the session check completes. If a valid session was found, `user` will be set and we redirect.

---

### Why Previous Attempts Failed

1. **Quick Access**: Previous fixes focused on caching, realtime subscriptions, and 30-day filtering. None of these matter because the fundamental aggregation logic was different between heatmap (by name) and Quick Access (by ID).

2. **Session logout**: Previous fixes addressed RPC creation, localStorage migration, and RLS bypass. All of those changes were correct and necessary, but they missed the simple routing issue -- the Auth page just never checked if the user was already logged in.

---

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useQuickAccessItems.tsx` | Aggregate by `navigation_name` and match items by label |
| `src/pages/Auth.tsx` | Add `useEffect` to redirect authenticated users to `/dashboard` |

### No Database Changes Needed

All database changes from previous attempts (RPCs, Realtime publication) are already correct and will continue to be used.
