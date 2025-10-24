-- Update get_available_managers to include staff with role IN ('admin','manager')
CREATE OR REPLACE FUNCTION public.get_available_managers()
 RETURNS TABLE(id uuid, staff_code text, full_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    s.id,
    s.staff_code,
    s.full_name
  FROM public.staff s
  LEFT JOIN public.user_designations ud ON s.user_id = ud.user_id
  WHERE s.is_active = true
    AND (
      s.role IN ('admin'::staff_role, 'manager'::staff_role)
      OR ud.designation IN ('admin'::app_designation, 'manager'::app_designation)
    )
  ORDER BY s.staff_code;
END;
$function$;