## Goal
Give staff `ADM430` (Arulmani Ayyamperumal, drarulmani375@gmail.com) unrestricted `can_view` + `can_edit` on every registered screen, plus every approval permission — so the User Access Management screen shows all counts filled and no feature is gated.

## Approach
Data-only change via the insert tool (no schema or code edits). Since this user's role is `admin`, they already short-circuit most permission checks in `auth.tsx`, but the Configure Access UI reads from `staff_screen_permissions` / `staff_approval_permissions` — so we seed those explicitly to reflect "full access" everywhere.

## SQL to run (insert tool)

1. **Resolve the staff row** by `staff_code = 'ADM430'` (fallback: email `drarulmani375@gmail.com`).

2. **Grant every active screen** — cross join with `screen_registry`:
```sql
INSERT INTO public.staff_screen_permissions (staff_id, screen_key, can_view, can_edit)
SELECT s.id, r.screen_key, true, true
FROM public.staff s
CROSS JOIN public.screen_registry r
WHERE s.staff_code = 'ADM430'
  AND r.is_active = true
ON CONFLICT (staff_id, screen_key)
DO UPDATE SET can_view = true, can_edit = true, updated_at = now();
```

3. **Grant every approval permission** — cross join with `approval_permission_registry`:
```sql
INSERT INTO public.staff_approval_permissions (staff_id, permission_key, granted)
SELECT s.id, p.permission_key, true
FROM public.staff s
CROSS JOIN public.approval_permission_registry p
WHERE s.staff_code = 'ADM430'
ON CONFLICT (staff_id, permission_key)
DO UPDATE SET granted = true, updated_at = now();
```

4. **Mirror into `admin_screen_permissions`** (if an `admin_users` row exists for this user) so the admin-side dialog also reflects full access:
```sql
INSERT INTO public.admin_screen_permissions (admin_user_id, screen_key, can_view, can_edit)
SELECT a.id, r.screen_key, true, true
FROM public.admin_users a
JOIN public.staff s ON s.id = a.staff_id  -- or a.user_id = s.user_id, whichever link exists
CROSS JOIN public.screen_registry r
WHERE s.staff_code = 'ADM430'
  AND r.is_active = true
ON CONFLICT (admin_user_id, screen_key)
DO UPDATE SET can_view = true, can_edit = true;
```

## After running
- Open Settings → User Access, search "Arulmani" — Screen Access and Approvals counters will show the full totals instead of 0.
- User clicks **Check for updates** in the header to reload the permission cache.

## Notes
- Idempotent — safe to re-run.
- No schema changes, no code changes.
- If `staff_code` doesn't match exactly, I'll fall back to matching by email in the same query.
