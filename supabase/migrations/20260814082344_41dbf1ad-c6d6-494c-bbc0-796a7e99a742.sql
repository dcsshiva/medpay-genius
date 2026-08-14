CREATE OR REPLACE FUNCTION public.get_staff_auth_email(_username text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT email FROM public.staff
  WHERE lower(username) = lower(btrim(_username))
  ORDER BY is_active DESC
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_doctor_auth_email(_doctor_code text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT au.email
  FROM public.doctors d
  JOIN auth.users au ON d.user_id = au.id
  WHERE lower(d.doctor_code) = lower(btrim(_doctor_code))
  ORDER BY d.is_active DESC
  LIMIT 1;
$function$;

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
  uname text := lower(btrim(_username));
BEGIN
  SELECT * INTO staff_row
  FROM public.staff
  WHERE lower(username) = uname AND is_active = true
  LIMIT 1;

  IF staff_row.id IS NOT NULL THEN
    SELECT public.simple_hash(_password) INTO hashed;
    IF staff_row.password_hash = _password OR staff_row.password_hash = hashed THEN
      RETURN jsonb_build_object(
        'user_type', 'staff',
        'id', staff_row.id,
        'user_id', staff_row.user_id,
        'full_name', staff_row.full_name,
        'role', COALESCE(staff_row.role::text, 'staff')
      );
    ELSE
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  END IF;

  SELECT * INTO doctor_row
  FROM public.doctors
  WHERE lower(doctor_code) = uname AND is_active = true
  LIMIT 1;

  IF doctor_row.id IS NOT NULL THEN
    SELECT public.simple_hash(_password) INTO hashed;
    IF doctor_row.password_hash = hashed OR doctor_row.password_hash = _password THEN
      RETURN jsonb_build_object(
        'user_type', 'doctor',
        'id', doctor_row.id,
        'user_id', doctor_row.user_id,
        'full_name', COALESCE(doctor_row.full_name, 'Doctor'),
        'role', 'doctor'
      );
    ELSE
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  END IF;

  RETURN jsonb_build_object('error', 'not_found');
END;
$function$;