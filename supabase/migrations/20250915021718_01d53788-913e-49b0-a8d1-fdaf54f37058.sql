-- Create a SECURITY DEFINER function to verify username/password without exposing tables via RLS
create or replace function public.verify_user_login(_username text, _password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    select public.simple_hash(_password) into hashed;
    if staff_row.password_hash = hashed then
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

  -- Then try doctor by doctor_code (no password check for demo)
  select * into doctor_row
  from public.doctors
  where doctor_code = _username and is_active = true
  limit 1;

  if doctor_row.id is not null then
    result := jsonb_build_object(
      'user_type','doctor',
      'id', doctor_row.id,
      'full_name', coalesce((select full_name from public.profiles where id = doctor_row.profile_id), 'Doctor'),
      'role','doctor'
    );
    return result;
  end if;

  return jsonb_build_object('error','not_found');
end;
$$;

-- Ensure anon and authenticated clients can execute the function
grant execute on function public.verify_user_login(text, text) to anon, authenticated;