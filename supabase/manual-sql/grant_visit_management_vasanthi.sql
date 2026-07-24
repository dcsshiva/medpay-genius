-- Grant Visit Management (view + edit) to vasanthipartha175@gmail.com
-- Run in Supabase SQL editor against the production project.

INSERT INTO public.staff_screen_permissions (staff_id, screen_key, can_view, can_edit, updated_by)
SELECT s.id, 'visit_management', true, true, s.id
FROM public.staff s
WHERE lower(s.email) = 'vasanthipartha175@gmail.com'
ON CONFLICT (staff_id, screen_key)
DO UPDATE SET can_view = true, can_edit = true, updated_at = now();

-- Verify
SELECT s.email, p.screen_key, p.can_view, p.can_edit, p.updated_at
FROM public.staff_screen_permissions p
JOIN public.staff s ON s.id = p.staff_id
WHERE lower(s.email) = 'vasanthipartha175@gmail.com'
  AND p.screen_key = 'visit_management';
