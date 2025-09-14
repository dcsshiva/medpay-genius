-- Create a function to hash passwords (simplified for demo)
CREATE OR REPLACE FUNCTION public.simple_hash(password text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT encode(digest(password, 'sha256'), 'hex');
$$;

-- Update staff table to ensure password hashing and proper profile linking
-- First, let's create some test data for doctors and staff with usernames/passwords

-- Insert test profiles for doctors and staff
INSERT INTO public.profiles (id, user_id, full_name, role) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Dr. John Smith', 'doctor'),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Dr. Sarah Johnson', 'doctor'),
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Nurse Alice Brown', 'admin'),
  ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'Staff Bob Wilson', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Insert test doctors
INSERT INTO public.doctors (id, profile_id, specialization, doctor_code, rate_per_visit, is_active)
VALUES 
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Cardiology', 'DOC001', 1000.00, true),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'General Medicine', 'DOC002', 800.00, true)
ON CONFLICT (id) DO NOTHING;

-- Insert test staff with hashed passwords
INSERT INTO public.staff (id, profile_id, full_name, username, password_hash, role, department, staff_code, is_active)
VALUES 
  ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'Nurse Alice Brown', 'alice', public.simple_hash('password123'), 'nurse', 'General Ward', 'STAFF001', true),
  ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'Staff Bob Wilson', 'bob', public.simple_hash('password123'), 'technician', 'Lab', 'STAFF002', true)
ON CONFLICT (id) DO NOTHING;

-- Create some test visits for the doctors
INSERT INTO public.visits (id, doctor_id, patient_name, patient_id, visit_reason, visit_payment, payment_type, visit_date)
VALUES 
  ('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'Patient A', 'PAT001', 'Regular checkup', 1000.00, 'cash', '2024-01-15'),
  ('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'Patient B', 'PAT002', 'Follow-up', 1000.00, 'card', '2024-01-16'),
  ('880e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', 'Patient C', 'PAT003', 'Consultation', 800.00, 'cash', '2024-01-17')
ON CONFLICT (id) DO NOTHING;

-- Create test payments for doctors
INSERT INTO public.payments (id, doctor_id, period_start, period_end, total_visits, rate_per_visit, total_amount, status)
VALUES 
  ('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '2024-01-01', '2024-01-31', 2, 1000.00, 2000.00, 'pending'),
  ('990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '2024-01-01', '2024-01-31', 1, 800.00, 800.00, 'approved')
ON CONFLICT (id) DO NOTHING;

-- Create test tasks for staff
INSERT INTO public.tasks (id, assigned_to, task_title, task_description, priority, status, assigned_by)
VALUES 
  ('aa0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Patient Care Round', 'Complete morning patient care rounds', 'high', 'pending', '550e8400-e29b-41d4-a716-446655440003'),
  ('aa0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'Lab Sample Collection', 'Collect blood samples from patients', 'medium', 'in_progress', '550e8400-e29b-41d4-a716-446655440004')
ON CONFLICT (id) DO NOTHING;