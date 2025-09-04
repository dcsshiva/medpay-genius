-- Insert demo staff members first
INSERT INTO public.staff (id, staff_code, username, password_hash, full_name, email, phone, role, department, is_active) VALUES 
  ('550e8400-e29b-41d4-a716-446655440005', 'NUR001', 'jessica.brown', 'demo_hash_1', 'Jessica Brown', 'jessica@westmed.com', '+1234567890', 'nurse', 'ICU', true),
  ('550e8400-e29b-41d4-a716-446655440006', 'NUR002', 'david.lee', 'demo_hash_2', 'David Lee', 'david@westmed.com', '+1234567891', 'nurse', 'Emergency', true),
  ('550e8400-e29b-41d4-a716-446655440007', 'NUR003', 'anna.garcia', 'demo_hash_3', 'Anna Garcia', 'anna@westmed.com', '+1234567892', 'nurse', 'Pediatrics', true),
  ('550e8400-e29b-41d4-a716-446655440008', 'TEC001', 'mark.tech', 'demo_hash_4', 'Mark Thompson', 'mark@westmed.com', '+1234567893', 'technician', 'Radiology', true)
ON CONFLICT (id) DO NOTHING;