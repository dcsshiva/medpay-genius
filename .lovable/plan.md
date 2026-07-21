## Goal

Make the Configure Access dialogs (staff + admin) and all permission checks driven by two Supabase registry tables with realtime propagation. Preserve existing UI, tabs, badges, Notes/Save flow, and existing admin/manager role logic. Never touch super_admin bypass behavior.

## Database (single migration)

New tables (public schema, with GRANTs + RLS):

1. `screen_registry`
   - `id uuid pk`, `screen_key text unique`, `screen_name text`, `group_name text`, `route_path text null`, `is_active bool default true`, `sort_order int default 0`, `super_admin_only bool default false`, `created_at`, `updated_at`
2. `approval_permission_registry`
   - `id uuid pk`, `permission_key text unique`, `permission_name text`, `applicable_role text` (`manager`/`admin`/`any`), `group_name text`, `is_active bool default true`, `sort_order int default 0`, timestamps
3. `permission_change_log`
   - `id`, `staff_id uuid null`, `admin_user_id uuid null`, `target_type text` (`screen`/`approval`/`admin_screen`), `target_key text`, `old_value jsonb`, `new_value jsonb`, `notes text`, `changed_by uuid`, `changed_at`

Existing tables reused (do NOT recreate — they already exist and back the current RPCs):
- `staff_screen_permissions`, `staff_approval_permissions`, `admin_screen_permissions`

RLS: only admin/manager can read registries + write permission rows; the affected staff can read their own permission rows (needed for realtime on their session).

Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE staff_screen_permissions, staff_approval_permissions, admin_screen_permissions, screen_registry, approval_permission_registry;`

## Seed migration (idempotent)

Insert into `screen_registry` every entry currently hardcoded in `AccessConfigDialog.SCREEN_MODULES` and `AdminAccessConfigDialog.SCREEN_MODULES` (union, deduped) preserving `group_name` and order. Insert into `approval_permission_registry` every entry from `APPROVAL_TYPES`, preserving level → `applicable_role`. All rows `is_active = true`. `ON CONFLICT (screen_key/permission_key) DO NOTHING`.

## New RPCs

- `list_screen_registry()` → active screens ordered by group + sort_order
- `list_approval_registry()` → active approvals
- `upsert_staff_screen_permission(_staff_id, _screen_key, _can_view, _can_edit, _notes)` — writes only that row, logs to `permission_change_log`
- `upsert_staff_approval_permission(_staff_id, _permission_key, _can_approve, _notes)`
- `upsert_admin_screen_permission(_admin_user_id, _screen_key, _can_view, _can_edit, _notes)`
- `register_screen(_key, _name, _group, _route, _sort)` — admin-only, for future new pages

Existing `get_user_permissions` / `get_admin_permissions` remain but are also filtered against `is_active = true` in the dialog rendering.

## Frontend

### New shared module

- `src/lib/permissions/registry.ts` — types + fetchers for the two registries
- `src/hooks/useScreenRegistry.ts`, `src/hooks/useApprovalRegistry.ts` — React Query + realtime subscription to registry tables
- `src/hooks/useStaffPermissions.ts(staffId)` — fetches staff mapping, subscribes to `staff_screen_permissions` and `staff_approval_permissions` filtered by `staff_id=eq.{id}`, exposes `canView(key)`, `canEdit(key)`, `canApprove(key)`, plus `lastUpdatedBy` / `lastUpdatedAt`
- `src/hooks/useMyPermissions.ts` — wraps `useStaffPermissions` for the currently logged-in user (resolves their `staff_id` from auth context)

### Configure Access dialogs (staff + admin)

Refactor `src/components/AccessConfigDialog.tsx` and `src/components/AdminAccessConfigDialog.tsx`:
- Remove hardcoded `SCREEN_MODULES` / `APPROVAL_TYPES` arrays.
- Render tabs from `useScreenRegistry()` / `useApprovalRegistry()` grouped by `group_name`.
- Load current toggles via `useStaffPermissions(staffMember.id)` (or admin equivalent) so subscription is live while dialog is open.
- On checkbox change: call the per-row upsert RPC immediately (optimistic UI), show inline `Saving…` / `Saved` / `Updated by <name> just now` chip near the tab header.
- Keep Notes textarea; its value is passed to each upsert call in the current batch.
- Save/Cancel buttons preserved; Save flushes any unsent edits, Cancel discards local pending state.
- Preserve `super_admin_only` disabling by reading the flag from `screen_registry` instead of the local array.
- Skip rendering any row whose registry entry is `is_active=false`.

### Live propagation to the logged-in user

- In `src/lib/auth.tsx`, expose `myPermissions` from `useMyPermissions()`.
- `AppSidebar.tsx` / `navigationItems.ts`: filter items with `myPermissions.canView(screenKey)` (admin/manager keep current full-access behavior — they short-circuit `canView` to true, preserving existing role config).
- Add `<PermissionRouteGuard screenKey="…">` wrapper in `src/pages/Index.tsx` around each routed component: when live subscription flips `canView` to false for the active screen, redirect to `/dashboard` with a toast "Access to this screen was just revoked".
- Action buttons that gate on approval permission read via `myPermissions.canApprove(permissionKey)`.

### Admin/Manager preservation

`useMyPermissions` returns `canView/canEdit/canApprove = true` unconditionally when `userRole === 'admin' | 'manager'` (matches current behavior). Only non-admin/manager staff are gated by the registry mapping. This ensures the existing admin and manager role configuration is preserved exactly.

## UI indicators

- Small badge next to each tab title: idle / `Saving…` / `Saved ✓` / `Updated by {name} · just now` (fed by realtime payload's `updated_by` join to `profiles`).
- No layout/style changes to cards, checkboxes, or footer.

## Rollout order

1. Migration (tables + GRANT + RLS + realtime publication + seed + RPCs).
2. Registry hooks + `useStaffPermissions` / `useMyPermissions`.
3. Refactor both Configure Access dialogs to registry-driven.
4. Wire `useMyPermissions` into sidebar + route guard + action buttons (admin/manager bypass preserved).
5. Verify: toggling a screen for a logged-in non-admin staff hides it in their sidebar within ~1s without reload; if they're on that screen, they get redirected.

## Technical notes

- Registries are cached with React Query (`staleTime: 5m`) and invalidated on realtime insert/update.
- Per-row upsert keeps writes minimal and log entries granular.
- Filter `postgres_changes` channels by `filter: 'staff_id=eq.<id>'` to avoid cross-tenant noise.
- All new RPCs are `SECURITY DEFINER` with `set search_path = public` and role checks via `has_role()`.
- No changes to `src/integrations/supabase/client.ts` or types file (regenerated post-migration).