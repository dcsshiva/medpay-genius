-- Fix get_manageable_staff to include super_admin
CREATE OR REPLACE FUNCTION public.get_manageable_staff(_requesting_user_id UUID)
RETURNS TABLE(
  id UUID,
  staff_code TEXT,
  full_name TEXT,
  role staff_role,
  department TEXT,
  is_active BOOLEAN,
  screen_access_count BIGINT,
  approval_permission_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_designation app_designation;
BEGIN
  -- Get the designation of the requesting user
  SELECT designation INTO requesting_designation
  FROM public.user_designations
  WHERE user_id = _requesting_user_id
  LIMIT 1;
  
  -- Super admins and admins can manage all staff
  IF requesting_designation IN ('super_admin'::app_designation, 'admin'::app_designation) THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.staff_code,
      s.full_name,
      s.role,
      s.department,
      s.is_active,
      COALESCE((SELECT COUNT(*) FROM public.user_screen_access WHERE staff_id = s.id), 0) as screen_access_count,
      COALESCE((SELECT COUNT(*) FROM public.user_approval_permissions WHERE staff_id = s.id), 0) as approval_permission_count
    FROM public.staff s
    WHERE s.is_active = true
    ORDER BY s.staff_code;
    
  -- Managers can manage non-admin/manager staff
  ELSIF requesting_designation = 'manager'::app_designation THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.staff_code,
      s.full_name,
      s.role,
      s.department,
      s.is_active,
      COALESCE((SELECT COUNT(*) FROM public.user_screen_access WHERE staff_id = s.id), 0) as screen_access_count,
      COALESCE((SELECT COUNT(*) FROM public.user_approval_permissions WHERE staff_id = s.id), 0) as approval_permission_count
    FROM public.staff s
    WHERE s.is_active = true
      AND s.user_id NOT IN (
        SELECT user_id FROM public.user_designations 
        WHERE designation IN ('admin'::app_designation, 'manager'::app_designation, 'super_admin'::app_designation)
      )
    ORDER BY s.staff_code;
  END IF;
  
  RETURN;
END;
$$;

-- Create get_admin_users function for admin access management
CREATE OR REPLACE FUNCTION public.get_admin_users(_requesting_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  screen_access_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_designation app_designation;
BEGIN
  -- Get the designation of the requesting user
  SELECT designation INTO requesting_designation
  FROM public.user_designations
  WHERE user_id = _requesting_user_id
  LIMIT 1;
  
  -- Only super_admins can view admin users
  IF requesting_designation = 'super_admin'::app_designation THEN
    RETURN QUERY
    SELECT 
      ud.user_id,
      au.email,
      COALESCE(s.full_name, p.full_name, au.email) as full_name,
      COALESCE((SELECT COUNT(*) FROM public.user_screen_access usa 
                JOIN public.staff st ON usa.staff_id = st.id 
                WHERE st.user_id = ud.user_id), 0) as screen_access_count
    FROM public.user_designations ud
    JOIN auth.users au ON ud.user_id = au.id
    LEFT JOIN public.staff s ON s.user_id = ud.user_id
    LEFT JOIN public.profiles p ON p.user_id = ud.user_id
    WHERE ud.designation IN ('admin'::app_designation, 'manager'::app_designation)
      AND ud.user_id != _requesting_user_id
    ORDER BY ud.designation, full_name;
  END IF;
  
  RETURN;
END;
$$;