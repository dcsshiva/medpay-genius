# Fix: `operator does not exist: staff_role = text`

## Root cause
`public.staff.role` is a Postgres enum (`staff_role`), not `text`. The helper `public.current_user_has_role(text[])` compares `role = ANY(_roles)` where `_roles` is `text[]` — Postgres refuses the comparison because there's no implicit cast between the enum and `text`.

## Fix
Cast the enum to text inside the helper. One-line change in `supabase/manual-sql/permission_registry.sql`:

```sql
CREATE OR REPLACE FUNCTION public.current_user_has_role(_roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
     WHERE user_id = auth.uid()
       AND role::text = ANY(_roles)   -- cast enum → text
       AND is_active = true
  );
$$;
```

Nothing else changes. Re-run the manual SQL file in the Supabase SQL editor; it's idempotent.
