-- Grant staff ADM430 (Arulmani Ayyamperumal, drarulmani375@gmail.com)
-- unrestricted view + edit on every active screen and every approval permission.
-- Idempotent: safe to re-run. Run in the external Supabase SQL Editor.

-- 1. All active screens -> can_view + can_edit
WITH me AS (
  SELECT id
  FROM public.staff
  WHERE staff_code = 'ADM430' OR email = 'drarulmani375@gmail.com'
  LIMIT 1
)
INSERT INTO public.staff_screen_permissions (staff_id, screen_key, can_view, can_edit)
SELECT me.id, r.screen_key, true, true
FROM me
CROSS JOIN public.screen_registry r
WHERE r.is_active = true
ON CONFLICT (staff_id, screen_key)
DO UPDATE SET can_view = true, can_edit = true, updated_at = now();

-- 2. All approval permissions -> granted
WITH me AS (
  SELECT id
  FROM public.staff
  WHERE staff_code = 'ADM430' OR email = 'drarulmani375@gmail.com'
  LIMIT 1
)
INSERT INTO public.staff_approval_permissions (staff_id, permission_key, can_approve)
SELECT me.id, p.permission_key, true
FROM me
CROSS JOIN public.approval_permission_registry p
ON CONFLICT (staff_id, permission_key)
DO UPDATE SET can_approve = true, updated_at = now();

-- 3. Mirror into admin_screen_permissions if this staff has an admin_users row
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'admin_users') THEN
    EXECUTE $sql$
      INSERT INTO public.admin_screen_permissions (admin_user_id, screen_key, can_view, can_edit)
      SELECT a.id, r.screen_key, true, true
      FROM public.admin_users a
      JOIN public.staff s ON s.user_id = a.user_id
      CROSS JOIN public.screen_registry r
      WHERE (s.staff_code = 'ADM430' OR s.email = 'drarulmani375@gmail.com')
        AND r.is_active = true
      ON CONFLICT (admin_user_id, screen_key)
      DO UPDATE SET can_view = true, can_edit = true;
    $sql$;
  END IF;
END $$;

-- Verify
SELECT
  (SELECT COUNT(*) FROM public.staff_screen_permissions sp
    JOIN public.staff s ON s.id = sp.staff_id
    WHERE s.staff_code = 'ADM430' AND sp.can_view AND sp.can_edit) AS screens_granted,
  (SELECT COUNT(*) FROM public.staff_approval_permissions ap
    JOIN public.staff s ON s.id = ap.staff_id
    WHERE s.staff_code = 'ADM430' AND ap.can_approve) AS approvals_granted;
