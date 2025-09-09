-- Create individual profiles for each doctor with unique user_ids
-- Since we need separate profiles, we'll create them with NULL user_id first

-- Create profile for DOC002 (Neurology) 
INSERT INTO public.profiles (user_id, full_name, role)
VALUES (
  NULL, -- No auth user yet
  'Dr. Neurologist',
  'doctor'
);

-- Create profile for DOC003 (Pediatrics)
INSERT INTO public.profiles (user_id, full_name, role) 
VALUES (
  NULL, -- No auth user yet
  'Dr. Pediatrician',
  'doctor'
);

-- Create profile for DOC004 (Orthopedics)
INSERT INTO public.profiles (user_id, full_name, role)
VALUES (
  NULL, -- No auth user yet
  'Dr. Orthopedist',
  'doctor'
);

-- Now update doctor records to point to their individual profiles
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