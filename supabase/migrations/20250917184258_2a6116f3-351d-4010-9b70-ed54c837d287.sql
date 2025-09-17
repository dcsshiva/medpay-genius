-- Create admin user in auth.users table
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'admin@westmed.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"System Administrator"}',
  false,
  'authenticated'
);

-- Create corresponding profile for the admin user
INSERT INTO public.profiles (
  user_id,
  full_name,
  role
) 
SELECT 
  au.id,
  'System Administrator',
  'admin'::user_role
FROM auth.users au 
WHERE au.email = 'admin@westmed.com';