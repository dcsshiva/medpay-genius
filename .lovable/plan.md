# Fix empty sidebar in production + guarantee super_admin full access

## What I verified (this is the real cause, not a timing issue)

Checked the live database directly for `shivanss@gmail.com`:

- The staff row has `role = admin`, and `user_designations.designation = admin`.
- That user's 37 screen permissions (dashboard, masters, visits, settings, ...) all live in **`staff_screen_permissions`**, keyed by `staff.id`.
- The table **`admin_screen_permissions` is completely empty (0 rows)** across the whole database.
- `screen_registry` has 71 active screens; `sidebar_menu_config` hides nothing.

The auth code branches on designation: when the designation is `admin`, it loads permissions from `admin_screen_permissions` using the auth user id. That table is empty, so the permission map comes back empty, and the sidebar hook hides every screen that has no `can_view` permission row. Result: a sidebar with zero navigation items. This is a data/branching mismatch, not an auth-loading race — a loading guard alone would not fix it.

Preview vs. production differ only because the deployed bundle is an older build; both point at the same backend (`.env` has a single set of backend variables, and there is no separate production config in the repo). I will re-verify the deployed bundle's backend URL after the fix and report it.

## Part 1 — Fix the sidebar

1. **Permission loading (auth)**: load permissions from both sources and merge instead of picking one table by designation:
   - `staff_screen_permissions` keyed by the staff row id (the source that actually has data), and
   - `admin_screen_permissions` keyed by the auth user id, if any rows exist.
   A screen is viewable if either source grants it. Realtime subscriptions on both tables so Configure Access changes still apply live.
2. **Safety net**: if, after loading, a user with designation/role `admin` or `manager` ends up with an empty permission map, fall back to the legacy hardcoded role menu rather than showing an empty sidebar. Losing all navigation should never be a possible state for a privileged user.
3. **Loading guard**: the sidebar waits for auth `loading === false` and for the permission load to settle, showing a small skeleton in the nav area during that gap instead of rendering an empty list.

## Part 2 — super_admin needs zero configuration

- Keep and harden the hardcoded bypass: `canView`, `canEdit`, `canApprove` return `true` for `super_admin` before any permission lookup, and the sidebar hook already shows every registry screen (including `super_admin_only` ones) for super admins. I will add `canApprove` to the same bypass path and add a shared `isSuperAdmin` helper so no future check can bypass it.
- Brand-new screens added to `screen_registry` with zero permission rows will appear for super admins automatically — that already follows from the bypass plus the registry-driven sidebar.
- In User Access Management / Admin Access Management: super_admin users stay listed but are shown with a "Full access — no configuration needed" badge, and opening Configure Access for them renders all toggles checked and disabled, so nobody thinks unchecking restricts them.

## Part 3 — Current state for the record

- `src/lib/navigationItems.ts` is **no longer** fully hardcoded per role. The registry-driven migration is **already done**: `useNavigationItems()` reads active rows from `screen_registry`, filters them by `screenPermissions` from the auth context, and applies `super_admin_only`. The old hardcoded `getNavigationItems()` remains only as a fallback used when `screen_registry` returns zero rows.
- So Part 1's fix belongs in the **new registry-driven path** (auth permission loading + the sidebar's loading guard), not in the legacy hardcoded list.

## Technical notes

- Files touched: `src/lib/auth.tsx` (merged permission load, super_admin helper, approval bypass), `src/lib/navigationItems.ts` (privileged-empty fallback), `src/components/AppSidebar.tsx` (loading skeleton), `src/components/UserAccessManagement.tsx` / `AdminAccessManagement.tsx` / `AccessConfigDialog.tsx` (super_admin display state).
- No database migration required — existing `staff_screen_permissions` data is used as-is.
