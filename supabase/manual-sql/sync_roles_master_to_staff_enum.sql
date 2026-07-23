-- Fix: "Email already registered" error when creating staff with a role
-- whose code (e.g. 'data_entry') is not in the staff role enum.
--
-- Root cause: create-user edge fn creates the auth user first. Then the
-- client inserts into public.staff with role = formData.role (e.g. 'data_entry').
-- If that value is not in the staff_role enum, the staff insert fails, leaving the
-- auth user orphaned. Every subsequent attempt with the same email then
-- returns "already registered" from Supabase Auth.
--
-- Run this once in the production Supabase SQL editor.

-- 1) Backfill: add every active roles_master.role_code that is missing
--    from the staff_role enum.
DO $$
DECLARE
  r record;
  code text;
BEGIN
  FOR r IN
    SELECT DISTINCT role_code
    FROM public.roles_master
    WHERE is_active = true
      AND role_code IS NOT NULL
      AND btrim(role_code) <> ''
  LOOP
    code := lower(regexp_replace(btrim(r.role_code), '\s+', '_', 'g'));
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'staff_role' AND e.enumlabel = code
    ) THEN
      EXECUTE format('ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS %L', code);
    END IF;
  END LOOP;
END $$;

-- 2) Auto-sync: whenever a role is added or its code is changed in
--    roles_master, make sure the enum value exists.
CREATE OR REPLACE FUNCTION public.sync_role_to_staff_enum()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  IF NEW.role_code IS NULL OR btrim(NEW.role_code) = '' THEN
    RETURN NEW;
  END IF;
  code := lower(regexp_replace(btrim(NEW.role_code), '\s+', '_', 'g'));
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'staff_role' AND e.enumlabel = code
  ) THEN
    EXECUTE format('ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS %L', code);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_role_to_staff_enum ON public.roles_master;
CREATE TRIGGER trg_sync_role_to_staff_enum
AFTER INSERT OR UPDATE OF role_code ON public.roles_master
FOR EACH ROW EXECUTE FUNCTION public.sync_role_to_staff_enum();

-- 3) Optional cleanup: list auth users that were created but never got
--    a staff row (orphans from previous failed attempts). Review before
--    deleting. Uncomment to inspect:
--
-- SELECT u.id, u.email, u.created_at
-- FROM auth.users u
-- LEFT JOIN public.staff s ON s.user_id = u.id
-- LEFT JOIN public.doctors d ON d.user_id = u.id
-- WHERE s.id IS NULL AND d.id IS NULL
-- ORDER BY u.created_at DESC;
