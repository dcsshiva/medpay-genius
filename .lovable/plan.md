# Wire Configure Access into the rest of the app

Goal: close the loop so `staff_screen_permissions` / `admin_screen_permissions` (already written by Configure Access) actually drive what each user sees and can do. Remove the hardcoded role branches that currently ignore them.

Out of scope / do NOT touch: `AccessConfigDialog.tsx`, `AdminAccessConfigDialog.tsx`, `UserAccessManagement.tsx`, `AdminAccessManagement.tsx`, `user_screen_access` table.

---

## Step 1 — Seed registry + existing permissions (migration + insert, ships FIRST)

Two data operations, in order, before any code change.

**1a. Backfill `screen_registry`** with every id currently returned by `navigationItems.ts` across the four role branches. Group + sort using `MenuVisibilitySettings.tsx`'s existing `MENU_GROUPS` (Core / People / Visits / Payments / Bank Advice / Reports / Collaboration / System). Screens only present in super_admin get `super_admin_only = true` where appropriate; everything else is normal.

Also register the non-navigation action keys needed by Step 5:
- `admin-dashboard`, `doctor-dashboard`, `staff-dashboard` (dashboard variants)
- `doctor-management-reactivate`
- `doctor-hub-delete-unpaid-visit`

**1b. Backfill `staff_screen_permissions` + `admin_screen_permissions`** for every existing staff/doctor/admin, mirroring today's hardcoded gates so nobody loses access on deploy:

| Role today | `can_view` seeded for | `can_edit` seeded for |
|---|---|---|
| admin | full admin nav list + `admin-dashboard`, `doctor-dashboard` | doctor-management, doctor-management-reactivate, staff-management, doctor-hub-delete-unpaid-visit, and all edit-implying screens |
| manager | full manager nav list + `admin-dashboard` | doctor-management, staff-management, doctor-hub-delete-unpaid-visit |
| doctor | `doctor-hub` + `doctor-dashboard` | — |
| staff/nurse/etc. | base + leave-permission, tasks, complaints, chat, `staff-dashboard` | — |
| super_admin | seed nothing per-user — super_admin bypass stays in the query |

Idempotent inserts (`ON CONFLICT DO NOTHING`) so a re-run is safe.

## Step 2 — AuthContext exposes live `screenPermissions`

`src/lib/auth.tsx`:
- After designation resolves in all three auth paths (SIGNED_IN listener, `loadSession` real-session branch, custom `user_sessions` fallback), fetch the current user's rows from `staff_screen_permissions` (or `admin_screen_permissions` when the designation is admin/super_admin) joined with `screen_registry` (to drop rows whose `is_active = false`).
- Store as `screenPermissions: Record<string, { can_view: boolean; can_edit: boolean }>` on `AuthContextType`.
- Add a Realtime channel filtered to that user's id (mirrors `useStaffPermissions`) so toggles in Configure Access propagate app-wide with no reload. Tear it down on sign-out / user change.
- Super_admin short-circuit: return `{}` and let consumers treat `super_admin` as "always allowed" via a helper.

Export a helper `canView(key)` / `canEdit(key)` from the context that returns `true` unconditionally for super_admin, otherwise reads `screenPermissions`.

## Step 3 — Replace `navigationItems.ts` with a reactive hook

New file: `src/lib/navigationItems.ts` becomes a small module holding just:
- `SCREEN_ICONS: Record<screen_key, LucideIcon>` (icons don't live in DB)
- `useNavigationItems()` hook returning `{ items, loading }` where items = active `screen_registry` rows the user can view, mapped to `{ id: screen_key, label: screen_name, icon: SCREEN_ICONS[key] }`, sorted by `group_name` then `sort_order`, super_admin_only rows only for super_admins.
- A separate `useAllScreens()` hook that returns every active `screen_registry` row unfiltered — used only by `MenuVisibilitySettings.tsx`.

Migrate all 4 call sites:
1. **`Layout.tsx:43`** — swap `getNavigationItems({...})` for `useNavigationItems()`.
2. **`AppSidebar.tsx:96`** — same swap; drop the `useMemo` wrapper (hook already memoizes).
3. **`QuickAccessConfig.tsx:24`** — same swap; if it needs the user's *own* nav (for picking quick-access items), use `useNavigationItems()`; if it needs the full catalog, use `useAllScreens()`. (Will confirm on read during build.)
4. **`MenuVisibilitySettings.tsx:42`** — switch to `useAllScreens()`.

## Step 4 — Clean up `MenuVisibilitySettings.tsx`

- Delete the hardcoded `MENU_GROUPS` constant.
- Group by `screen_registry.group_name`, order by `sort_order`.
- Add a header comment:

```
// Two-layer visibility:
//   1. screen_registry.is_active  — global on/off, edited HERE (super_admin only).
//   2. staff_screen_permissions.can_view — per-user on/off, edited in Configure Access.
// A screen is shown to a user only when BOTH are true.
```

## Step 5 — Replace hardcoded role gates with permission checks

Using `canView` / `canEdit` from Step 2's AuthContext helper:

| File | Current gate | New gate |
|---|---|---|
| `Dashboard.tsx` | `userRole === 'admin'/'manager'/'doctor'` variant branching + `isStaffRole()` fallback | `canView('admin-dashboard')` → admin variant · `canView('doctor-dashboard')` → doctor variant · else staff dashboard |
| `DoctorManagement.tsx` | `['admin','manager'].includes(userRole)` + `userRole !== 'admin'` reactivate check | `canEdit('doctor-management')` for create/edit/delete · `canEdit('doctor-management-reactivate')` for reactivate |
| `StaffManagement.tsx` | role gate + create/reactivate check | `canView('staff-management')` (page) · `canEdit('staff-management')` (create/reactivate) |
| `DoctorHub.tsx` | `canDeleteUnpaid = userRole === 'admin' \|\| 'manager'` | `canEdit('doctor-hub-delete-unpaid-visit')` |
| `Settings.tsx` | Auth Sync tab trigger uses `userDesignation === 'super_admin'` (~L143) but content uses `userRole === 'admin'` (~L529) — mismatch, super_admin sees empty tab | Align both to a single `canView('settings-auth-sync')` check (register that key in Step 1) |

Super_admin continues to pass every check via the helper's short-circuit.

## Step 6 — Verify end-to-end

1. Admin unchecks a staff's View for a screen in Configure Access.
2. Within ~1 s (Realtime), that staff's sidebar drops the item; if they're on that route, they're redirected to `/dashboard`.
3. Re-check restores it live, no reload.
4. Super_admin sets `screen_registry.is_active = false` for a screen in Menu Visibility → the screen disappears for everyone including staff whose `can_view` is still true.
5. Super_admin never loses anything.

## Technical notes

- Hook must handle "not yet loaded" (return `items: []`, `loading: true`) so sidebar renders skeleton, not the wrong list.
- Route guard for step 6.2 lives in `Index.tsx`'s `activeTab` effect: if current `activeTab` maps to a screen_key the user can't view, redirect to `/dashboard`.
- The `screen_registry` icon lookup must include every id used across all 4 hardcoded role branches — enumerated in Step 1 seed.
- No changes to `user_screen_access` table.

## Files touched

- Migration: `screen_registry` seed rows + new keys (`admin-dashboard`, `doctor-dashboard`, `staff-dashboard`, `doctor-management-reactivate`, `doctor-hub-delete-unpaid-visit`, `settings-auth-sync`)
- Insert: backfill `staff_screen_permissions` / `admin_screen_permissions` for existing users
- `src/lib/auth.tsx` — add `screenPermissions`, `canView`, `canEdit`, Realtime subscription
- `src/lib/navigationItems.ts` — rewrite to `useNavigationItems` + `useAllScreens` + `SCREEN_ICONS`
- `src/components/Layout.tsx`, `AppSidebar.tsx`, `QuickAccessConfig.tsx`, `MenuVisibilitySettings.tsx` — migrate to hooks
- `src/components/MenuVisibilitySettings.tsx` — drop `MENU_GROUPS`, group by registry
- `src/components/Dashboard.tsx`, `DoctorManagement.tsx`, `StaffManagement.tsx`, `DoctorHub.tsx`, `Settings.tsx` — swap role checks for permission checks
- `src/pages/Index.tsx` — route guard on `activeTab`
