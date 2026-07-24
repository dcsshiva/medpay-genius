## Goal
Grant staff **vasanthipartha175@gmail.com** view + edit access to the **Visit Management** screen (so they can Record New Visit).

## Approach
No app code changes needed — the Configure Access system is already dynamic and registry-driven. We just need to insert a row into `staff_screen_permissions` for this staff mapped to `screen_key = 'visit_management'`.

Two ways to apply it:

### Option A — Use the UI (recommended, no SQL)
1. Log in as admin/super_admin.
2. Go to **Settings → User Access → Staff Access**.
3. Find `vasanthipartha175@gmail.com` and click **Configure Access**.
4. In **Screen Access** tab, locate **Visit Management** (Management group).
5. Tick **View** and **Edit** — auto-saves via realtime.
6. Ask the user to hard-refresh / use the "Check for updates" button; sidebar and route guard update immediately.

### Option B — One-off SQL (for the production DB)
Run in the Supabase SQL editor:

```sql
INSERT INTO public.staff_screen_permissions (staff_id, screen_key, can_view, can_edit, updated_by)
SELECT s.id, 'visit_management', true, true, s.id
FROM public.staff s
WHERE lower(s.email) = 'vasanthipartha175@gmail.com'
ON CONFLICT (staff_id, screen_key)
DO UPDATE SET can_view = true, can_edit = true, updated_at = now();
```

That is the full change — no component or migration edits required.

Confirm which option you want and I'll proceed (Option A is a click-through; Option B I can drop into `supabase/manual-sql/` for you to run).