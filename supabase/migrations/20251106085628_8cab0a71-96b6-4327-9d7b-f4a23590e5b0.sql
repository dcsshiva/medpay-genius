-- Create has_designation function to check user designation
-- This allows checking designations without requiring a staff record
CREATE OR REPLACE FUNCTION public.has_designation(_user_id uuid, _designation app_designation)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_designations
    WHERE user_id = _user_id
      AND designation = _designation
  )
$$;