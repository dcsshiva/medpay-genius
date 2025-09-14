-- Create the password hashing function first
CREATE OR REPLACE FUNCTION public.simple_hash(password text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT encode(digest(password, 'sha256'), 'hex');
$$;

-- Update existing staff records to use proper password hashing
UPDATE public.staff 
SET password_hash = public.simple_hash('password123')
WHERE password_hash IS NULL OR password_hash = 'password123';

-- Example: Add test staff with proper hashed passwords (only if they don't exist)
INSERT INTO public.staff (full_name, username, password_hash, role, department, staff_code, is_active)
SELECT 'Test Nurse', 'nurse1', public.simple_hash('password123'), 'nurse', 'General Ward', 'NURSE001', true
WHERE NOT EXISTS (SELECT 1 FROM public.staff WHERE username = 'nurse1');

INSERT INTO public.staff (full_name, username, password_hash, role, department, staff_code, is_active)
SELECT 'Test Technician', 'tech1', public.simple_hash('password123'), 'technician', 'Lab', 'TECH001', true
WHERE NOT EXISTS (SELECT 1 FROM public.staff WHERE username = 'tech1');