-- Confirm all existing staff user emails
-- This updates auth.users table to mark emails as confirmed for all staff
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email LIKE '%@hospital.local' 
  AND email_confirmed_at IS NULL;