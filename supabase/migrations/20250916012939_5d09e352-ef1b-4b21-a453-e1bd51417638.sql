-- 1) Ensure pgcrypto is available and in the extensions schema
create extension if not exists pgcrypto with schema extensions;

-- 2) Fix simple_hash to use extensions.digest with explicit casting
create or replace function public.simple_hash(password text)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select encode(extensions.digest(password::bytea, 'sha256'), 'hex');
$$;

-- 3) Harden verify_user_login search_path (keeps same behavior)
create or replace function public.verify_user_login(_username text, _password text)
 returns jsonb
 language plpgsql
 security definer
 set search_path = public, extensions
as $function$
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
$function$;

-- 4) New function to bind the authenticated (anonymous) user to the profile used in RLS
create or replace function public.link_profile_to_user(_user_type text, _original_id uuid, _auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile_id uuid;
begin
  if _user_type = 'doctor' then
    select profile_id into target_profile_id from public.doctors where id = _original_id;
  elsif _user_type = 'staff' then
    select profile_id into target_profile_id from public.staff where id = _original_id;
  else
    raise exception 'Unknown user type: %', _user_type;
  end if;

  if target_profile_id is null then
    raise exception 'Profile not found for % %', _user_type, _original_id;
  end if;

  update public.profiles
    set user_id = _auth_user_id
  where id = target_profile_id;
end;
$$;