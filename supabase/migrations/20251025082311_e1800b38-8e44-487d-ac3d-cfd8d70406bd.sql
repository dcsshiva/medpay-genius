-- Assign admin designations to the two users
-- Update drarulmani375@gmail.com from doctor to admin
UPDATE public.user_designations 
SET designation = 'admin'::app_designation,
    updated_at = now()
WHERE user_id = '958e506c-b6e4-4e22-be7b-a5533b8b8ff8';

-- Insert or update admin designation for shivanss@gmail.com
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_designations WHERE user_id = 'db153c07-9f73-4154-944f-614008ef8ea9') THEN
    UPDATE public.user_designations 
    SET designation = 'admin'::app_designation,
        updated_at = now()
    WHERE user_id = 'db153c07-9f73-4154-944f-614008ef8ea9';
  ELSE
    INSERT INTO public.user_designations (user_id, designation)
    VALUES ('db153c07-9f73-4154-944f-614008ef8ea9', 'admin'::app_designation);
  END IF;
END $$;

-- Create function to get doctor email by doctor code
CREATE OR REPLACE FUNCTION public.get_doctor_auth_email(_doctor_code text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT au.email 
  FROM public.doctors d
  JOIN auth.users au ON d.user_id = au.id
  WHERE d.doctor_code = _doctor_code 
  LIMIT 1;
$$;