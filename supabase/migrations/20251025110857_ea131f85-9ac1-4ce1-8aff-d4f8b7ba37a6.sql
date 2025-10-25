-- Update email for doctor DOC0112 from drarulmani375@gmail.com to DOC0112@gmail.com
-- This updates the auth.users table directly
UPDATE auth.users
SET email = 'DOC0112@gmail.com',
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email}',
      '"DOC0112@gmail.com"'
    ),
    updated_at = now()
WHERE id = '958e506c-b6e4-4e22-be7b-a5533b8b8ff8';