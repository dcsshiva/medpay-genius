-- Fix staff login demo credentials
-- Update password hashes to 'password123' for demo accounts that should work

UPDATE staff SET password_hash = 'password123' 
WHERE username IN ('nurse1', 'maria.cleaning') OR staff_code IN ('NURSE001', 'CLN001', 'DOC0001');

-- Also make sure we have DOC0001 user
INSERT INTO staff (id, staff_code, username, password_hash, full_name, role, department, is_active)
VALUES (
  gen_random_uuid(),
  'DOC0001', 
  'DOC0001', 
  'password123', 
  'Dr. John Smith', 
  'doctor'::staff_role, 
  'General Medicine', 
  true
) ON CONFLICT (staff_code) DO UPDATE SET 
  password_hash = 'password123',
  username = 'DOC0001';