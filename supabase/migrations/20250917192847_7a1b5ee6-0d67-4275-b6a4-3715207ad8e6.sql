-- Create profiles for staff users who don't have them and link them properly
-- This will fix the RLS policy issue for custom auth staff users

-- First, create a profile for Maria Garcia
INSERT INTO profiles (id, user_id, full_name, role)
VALUES (
  gen_random_uuid(),
  'staff_550e8400-e29b-41d4-a716-446655440011',
  'Maria Garcia',
  'cleaner'::user_role
) ON CONFLICT (user_id) DO NOTHING;

-- Update Maria's staff record to link to her profile
UPDATE staff 
SET profile_id = (
  SELECT id FROM profiles 
  WHERE user_id = 'staff_550e8400-e29b-41d4-a716-446655440011'
)
WHERE id = '550e8400-e29b-41d4-a716-446655440011';

-- Also create profiles for other staff who might need them
INSERT INTO profiles (id, user_id, full_name, role)
SELECT 
  gen_random_uuid(),
  'staff_' || s.id::text,
  s.full_name,
  CASE 
    WHEN s.role = 'nurse' THEN 'doctor'::user_role
    WHEN s.role = 'manager' THEN 'manager'::user_role
    ELSE 'doctor'::user_role  -- Default fallback
  END
FROM staff s
WHERE s.profile_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = 'staff_' || s.id::text
  );

-- Update staff records to link to their profiles
UPDATE staff 
SET profile_id = p.id
FROM profiles p
WHERE staff.profile_id IS NULL 
  AND p.user_id = 'staff_' || staff.id::text;