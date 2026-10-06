# Make drarulmani375@gmail.com a full admin

## Current state (verified)
- The account exists in the auth system: `drarulmani375@gmail.com`, email confirmed 6 Oct 2026, user id `f4220e6b-62ce-4b75-836a-0f86f8dfdeb5`.
- It has **no staff record, no profile row, and no admin designation** — so it signs in as a plain user and sees no admin menus.
- Admins get full access automatically (super_admin/admin tiers need zero Configure Access setup, per `src/lib/accessLevels.ts`), so no per-screen permission rows are needed.

## Steps
1. **Create an active staff record** for this user with role `admin` (staff code `ADM430`, matching the earlier grant script that referenced this account), linked to their auth user id.
2. **Add the `admin` designation** in `user_designations` for this user id — this is the single source of truth that unlocks every admin menu and screen.
3. **Verify** the rows exist and the admin tier check (`hasFullAccess`) will resolve true for this account.

No code changes needed — this is a data-only fix, identical to how techteam@westmedhospitals.com and shivanss@gmail.com were made admins earlier.

## Technical details
- Tables touched: `public.staff` (insert), `public.user_designations` (insert).
- No RLS/migration changes; inserts run as data changes.
- Existing accounts, menus, and permissions are untouched.
