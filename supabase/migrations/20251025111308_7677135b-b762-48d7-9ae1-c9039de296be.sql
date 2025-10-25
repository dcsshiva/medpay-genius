-- Update identity_data in auth.identities for doctor DOC0112
-- This completes the email change from drarulmani375@gmail.com to DOC0112@gmail.com
UPDATE auth.identities
SET identity_data = jsonb_set(
      identity_data,
      '{email}',
      '"DOC0112@gmail.com"'
    ),
    updated_at = now()
WHERE user_id = '958e506c-b6e4-4e22-be7b-a5533b8b8ff8'
  AND provider = 'email';