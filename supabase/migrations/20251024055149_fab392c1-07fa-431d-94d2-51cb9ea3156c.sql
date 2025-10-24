-- Function to get available managers and admins for leave/permission approval
CREATE OR REPLACE FUNCTION public.get_available_managers()
RETURNS TABLE(
  id UUID,
  staff_code TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    s.id,
    s.staff_code,
    s.full_name
  FROM public.staff s
  INNER JOIN public.user_designations ud ON s.user_id = ud.user_id
  WHERE s.is_active = true
    AND ud.designation IN ('admin'::app_designation, 'manager'::app_designation)
  ORDER BY s.staff_code;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_available_managers() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_available_managers() IS 
  'Returns list of active staff members with admin or manager designation for leave/permission approval';