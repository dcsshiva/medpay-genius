UPDATE auth.users
SET encrypted_password = crypt('Westmed@2677', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'drarulmani375@gmail.com';