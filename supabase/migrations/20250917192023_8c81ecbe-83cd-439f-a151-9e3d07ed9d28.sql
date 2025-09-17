-- Fix the verify_user_login function to handle both plain text and hashed passwords
-- This allows demo credentials to work while still supporting proper hashing

CREATE OR REPLACE FUNCTION public.verify_user_login(_username text, _password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
declare
  staff_row public.staff%rowtype;
  doctor_row public.doctors%rowtype;
  hashed text;
  result jsonb := null;
begin
  -- Try staff first
  select * into staff_row
  from public.staff
  where username = _username and is_active = true
  limit 1;

  if staff_row.id is not null then
    -- Check both plain text (for demo) and hashed password
    select public.simple_hash(_password) into hashed;
    if staff_row.password_hash = _password OR staff_row.password_hash = hashed then
      result := jsonb_build_object(
        'user_type','staff',
        'id', staff_row.id,
        'full_name', coalesce(staff_row.full_name, _username),
        'role', coalesce(staff_row.role::text,'staff')
      );
      return result;
    else
      return jsonb_build_object('error','invalid_password');
    end if;
  end if;

  -- Then try doctor by doctor_code (accept password123 for demo)
  select * into doctor_row
  from public.doctors
  where doctor_code = _username and is_active = true
  limit 1;

  if doctor_row.id is not null then
    -- For doctors, accept password123 as demo password
    if _password = 'password123' then
      result := jsonb_build_object(
        'user_type','doctor',
        'id', doctor_row.id,
        'full_name', coalesce((select full_name from public.profiles where id = doctor_row.profile_id), 'Doctor'),
        'role','doctor'
      );
      return result;
    else
      return jsonb_build_object('error','invalid_password');
    end if;
  end if;

  return jsonb_build_object('error','not_found');
end;
$$;