## Root cause (confirmed from console)

The "Failed to save permissions" toast is triggered by this Postgres error, captured live in the console for the Settings bundle:

```
code: 22P02
message: invalid input value for enum screen_module: "leave_permission"
```

That enum belongs to the **legacy** `user_screen_access` table (migration `20251024044910_…`, `CREATE TYPE screen_module AS ENUM (...)`). The bundle currently running in your preview is still calling the old `grant_screen_access` / `user_screen_access` write path with the newer screen key `leave_permission`, which was added to `screen_registry` (`permission_registry.sql:190`) but was never added to the old `screen_module` enum — so the insert aborts and the dialog surfaces the generic failure toast.

Two things are true at once:
1. The registry-based rewrite of `AccessConfigDialog.tsx` in the repo no longer touches `user_screen_access`.
2. The build being served to PARTHA still has the legacy write path (either an older cached bundle via the service worker, or the new registry RPCs `upsert_staff_screen_permission` / `upsert_admin_screen_permission` don't exist in the DB yet, so a fallback path fires).

Either way, adding the missing enum value stops the crash for every historical build, and finishing the registry rollout removes the legacy path for good.

## Fix (two SQL steps, no app-code changes)

### Step 1 — Unblock immediately: extend the legacy enum

Add every current `screen_registry.screen_key` that is missing from the `screen_module` enum, so any lingering legacy write succeeds instead of throwing 22P02.

```sql
-- Run once; idempotent via IF NOT EXISTS.
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'leave_permission';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'staff_management';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'doctor_hub';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'admin_dashboard';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'doctor_dashboard';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'staff_dashboard';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'doctor_management_reactivate';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'doctor_hub_delete_unpaid_visit';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'settings_auth_sync';
-- (final list finalized during build by diffing `screen_registry.screen_key`
--  against `pg_enum` for `screen_module`.)
```

Delivered as a new file: `supabase/manual-sql/extend_screen_module_enum.sql`.

Postgres restriction: `ALTER TYPE … ADD VALUE` cannot run inside a transaction block that later uses the new value, so this file will contain only the ADD VALUE statements and nothing else.

### Step 2 — Finish the registry rollout so the legacy path is never hit again

Run, in this order, the two files that already exist in the repo but have not been executed on the database:

1. `supabase/manual-sql/permission_registry.sql` — creates `screen_registry`, `admin_screen_permissions`, `staff_screen_permissions`, `permission_change_log`, and the RPCs `upsert_staff_screen_permission` / `upsert_admin_screen_permission` / `list_screen_registry` / `list_approval_registry` that the current `AccessConfigDialog.tsx` / `AdminAccessConfigDialog.tsx` call.
2. `supabase/manual-sql/seed_screen_registry_and_permissions.sql` — backfills registry rows and per-user permissions so no existing user loses access.

After these run, the "Configure Access" dialog will write only to the new registry tables (no `screen_module` enum involved at all).

### Step 3 — Force the browser off the stale bundle

Because this app is a PWA with a service worker, PARTHA's browser may still be executing an older cached `Settings-*.js`. Ask the affected user(s) to click the **Check for updates** icon in the header (already wired via `CheckUpdateButton.tsx` + `forceVersionRefresh.ts`) once, so the newest bundle — which no longer writes to `user_screen_access` — is loaded.

## Verification

1. Run Step 1 SQL → reopen "Configure Access for PARTHA" on the currently-served bundle → toggle **Leave & Permission → View** → toast shows "Saved" instead of "Failed to save permissions".
2. Run Step 2 SQL → hard-refresh via the Check-for-updates button → toggle any screen for PARTHA → row appears in `staff_screen_permissions` and `permission_change_log`; no writes hit `user_screen_access`.
3. Confirm no console error with `code: 22P02` after either fix.

## Files touched

- **New**: `supabase/manual-sql/extend_screen_module_enum.sql` (Step 1).
- **Existing, unchanged, executed as-is**: `supabase/manual-sql/permission_registry.sql`, `supabase/manual-sql/seed_screen_registry_and_permissions.sql` (Step 2).
- No frontend code changes required to resolve this error.

## Out of scope

- `AccessConfigDialog.tsx`, `AdminAccessConfigDialog.tsx`, `UserAccessManagement.tsx`, `AdminAccessManagement.tsx` — not modified (matches the existing plan's guard-rails).
- No changes to `user_screen_access` structure; the legacy table stays intact and simply gains new enum values so historical builds stop crashing.