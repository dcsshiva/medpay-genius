CREATE OR REPLACE FUNCTION public.is_staff_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = _user_id
      AND s.role::text = 'staff_manager'
      AND s.is_active = true
  )
$$;

CREATE POLICY "Staff managers can manage all tasks"
ON public.tasks FOR ALL TO authenticated
USING (public.is_staff_manager(auth.uid()))
WITH CHECK (public.is_staff_manager(auth.uid()));

CREATE POLICY "Staff managers can manage all complaints"
ON public.complaints FOR ALL TO authenticated
USING (public.is_staff_manager(auth.uid()))
WITH CHECK (public.is_staff_manager(auth.uid()));

CREATE POLICY "Staff managers can view all applications"
ON public.leave_permission_applications FOR SELECT TO authenticated
USING (public.is_staff_manager(auth.uid()));

CREATE POLICY "Staff managers can update applications"
ON public.leave_permission_applications FOR UPDATE TO authenticated
USING (public.is_staff_manager(auth.uid()))
WITH CHECK (public.is_staff_manager(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_available_managers()
RETURNS TABLE(id uuid, staff_code text, full_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    s.id,
    s.staff_code,
    s.full_name
  FROM public.staff s
  LEFT JOIN public.user_designations ud ON s.user_id = ud.user_id
  WHERE s.is_active = true
    AND (s.user_id IS NULL OR s.user_id <> auth.uid())
    AND (
      s.role::text IN ('admin', 'manager', 'staff_manager')
      OR ud.designation IN ('admin'::app_designation, 'manager'::app_designation, 'super_admin'::app_designation)
    )
  ORDER BY s.staff_code;
END;
$$;