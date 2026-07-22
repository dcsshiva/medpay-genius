# Fix: `relation "public.user_roles" does not exist`

## Root cause
`supabase/manual-sql/permission_registry.sql` references a `public.user_roles` table in its RLS policies (lines 124, 133, 142, 150). That table does not exist in the westmed production project — roles are stored on `public.staff.role` (values like `admin`, `manager`, `super_admin`, etc.), keyed by `staff.user_id`. So every RLS policy that tries to look up the caller's role fails, and the whole script aborts.

## Fix
Update the RLS policies in `supabase/manual-sql/permission_registry.sql` to resolve the caller's role via `public.staff` instead of `public.user_roles`. Introduce a small `SECURITY DEFINER` helper so we don't repeat the sub-select and don't risk RLS recursion on `staff`.

### Changes in `supabase/manual-sql/permission_registry.sql`

1. Add near the top of section 7 (RPCs), before the policies use it:

   ```sql
   CREATE OR REPLACE FUNCTION public.current_user_has_role(_roles text[])
   RETURNS boolean
   LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
     SELECT EXISTS (
       SELECT 1 FROM public.staff
        WHERE user_id = auth.uid()
          AND role = ANY(_roles)
          AND is_active = true
     );
   $$;
   GRANT EXECUTE ON FUNCTION public.current_user_has_role(text[])
     TO authenticated, anon, service_role;
   ```

2. Replace every `EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN (...))` block in the four policies with:
   - `ssp_read_own_or_admin` → `public.current_user_has_role(ARRAY['admin','manager','super_admin'])`
   - `sap_read_own_or_admin` → same array
   - `asp_read_self_or_super` → `public.current_user_has_role(ARRAY['admin','super_admin'])`
   - `log_read_admin` → `public.current_user_has_role(ARRAY['admin','manager','super_admin'])`

3. No other changes: registries, GRANTs, RPCs, realtime publication, and seed data stay exactly as they are. The manual-sql file remains idempotent (safe to re-run).

## What to do next
- I'll edit the SQL file only. No app/TypeScript changes.
- After the edit, re-run the file in the production Supabase SQL editor. It should complete without the `user_roles` error.

## Not doing
- Not creating a `user_roles` table — the app already uses `staff.role` as the source of truth; adding a parallel table would fork role storage.
- Not modifying any component, hook, or RPC behavior.
