-- Fix verify_user_login to return correct record IDs for doctors and staff
-- This ensures dashboard statistics work correctly by using the right identifiers

CREATE OR REPLACE FUNCTION public.verify_user_login(_username text, _password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  staff_row public.staff%ROWTYPE;
  doctor_row public.doctors%ROWTYPE;
  hashed text;
  result jsonb := NULL;
BEGIN
  -- Try staff first
  SELECT * INTO staff_row
  FROM public.staff
  WHERE username = _username AND is_active = true
  LIMIT 1;

  IF staff_row.id IS NOT NULL THEN
    SELECT public.simple_hash(_password) INTO hashed;
    IF staff_row.password_hash = _password OR staff_row.password_hash = hashed THEN
      result := jsonb_build_object(
        'user_type', 'staff',
        'id', staff_row.id,              -- Fixed: Return actual staff record ID
        'user_id', staff_row.user_id,    -- Include user_id for auth linking
        'full_name', staff_row.full_name,
        'role', COALESCE(staff_row.role::text, 'staff')
      );
      RETURN result;
    ELSE
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  END IF;

  -- Then try doctor by doctor_code
  SELECT * INTO doctor_row
  FROM public.doctors
  WHERE doctor_code = _username AND is_active = true
  LIMIT 1;

  IF doctor_row.id IS NOT NULL THEN
    SELECT public.simple_hash(_password) INTO hashed;
    IF doctor_row.password_hash = hashed THEN
      result := jsonb_build_object(
        'user_type', 'doctor',
        'id', doctor_row.id,              -- Fixed: Return actual doctor record ID
        'user_id', doctor_row.user_id,    -- Include user_id for auth linking
        'full_name', COALESCE(doctor_row.full_name, 'Doctor'),
        'role', 'doctor'
      );
      RETURN result;
    ELSE
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  END IF;

  RETURN jsonb_build_object('error', 'not_found');
END;
$function$;