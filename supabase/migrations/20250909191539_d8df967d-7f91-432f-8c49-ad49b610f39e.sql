-- First, let's create individual profiles for each doctor
-- We'll create new profiles and then update the doctor records

-- Create profile for DOC001 (Cardiology)
INSERT INTO public.profiles (user_id, full_name, role)
VALUES (
  (SELECT p.user_id FROM profiles p WHERE p.id = '95da466d-15b3-4332-b8db-0d09bd42e462'),
  'Dr. Prabakaran - Cardiologist',
  'doctor'
) RETURNING id;

-- Create profile for DOC002 (Neurology) 
INSERT INTO public.profiles (user_id, full_name, role)
VALUES (
  gen_random_uuid(), -- Temporary user_id, will need proper auth user
  'Dr. Neurologist',
  'doctor'
);

-- Create profile for DOC003 (Pediatrics)
INSERT INTO public.profiles (user_id, full_name, role) 
VALUES (
  gen_random_uuid(), -- Temporary user_id, will need proper auth user
  'Dr. Pediatrician',
  'doctor'
);

-- Create profile for DOC004 (Orthopedics)
INSERT INTO public.profiles (user_id, full_name, role)
VALUES (
  gen_random_uuid(), -- Temporary user_id, will need proper auth user  
  'Dr. Orthopedist',
  'doctor'
);

-- Now update doctor records to point to their individual profiles
-- First get the newly created profile IDs and update doctors

-- Update DOC002 to point to new neurology profile
UPDATE public.doctors 
SET profile_id = (
  SELECT id FROM profiles 
  WHERE full_name = 'Dr. Neurologist' 
  AND role = 'doctor' 
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE doctor_code = 'DOC002';

-- Update DOC003 to point to new pediatrics profile  
UPDATE public.doctors
SET profile_id = (
  SELECT id FROM profiles
  WHERE full_name = 'Dr. Pediatrician'
  AND role = 'doctor'
  ORDER BY created_at DESC
  LIMIT 1  
)
WHERE doctor_code = 'DOC003';

-- Update DOC004 to point to new orthopedics profile
UPDATE public.doctors
SET profile_id = (
  SELECT id FROM profiles
  WHERE full_name = 'Dr. Orthopedist' 
  AND role = 'doctor'
  ORDER BY created_at DESC
  LIMIT 1
)
WHERE doctor_code = 'DOC004';

-- Update DOC001's profile name to be more specific
UPDATE public.profiles 
SET full_name = 'Dr. Prabakaran - Cardiologist'
WHERE id = '95da466d-15b3-4332-b8db-0d09bd42e462';