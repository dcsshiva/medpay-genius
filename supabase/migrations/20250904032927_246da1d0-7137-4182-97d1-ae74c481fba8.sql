-- Make user_id optional in profiles table to allow system-created profiles
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Add a constraint to ensure either user_id exists OR it's a system-created profile
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_or_system_check 
CHECK (user_id IS NOT NULL OR (user_id IS NULL AND role = 'doctor'));