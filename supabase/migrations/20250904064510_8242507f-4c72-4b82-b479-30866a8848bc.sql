-- Insert demo staff members first
INSERT INTO public.staff (id, staff_code, username, password_hash, full_name, email, phone, role, department, is_active) VALUES 
  ('550e8400-e29b-41d4-a716-446655440005', 'NUR001', 'jessica.brown', 'demo_hash_1', 'Jessica Brown', 'jessica@westmed.com', '+1234567890', 'nurse', 'ICU', true),
  ('550e8400-e29b-41d4-a716-446655440006', 'NUR002', 'david.lee', 'demo_hash_2', 'David Lee', 'david@westmed.com', '+1234567891', 'nurse', 'Emergency', true),
  ('550e8400-e29b-41d4-a716-446655440007', 'NUR003', 'anna.garcia', 'demo_hash_3', 'Anna Garcia', 'anna@westmed.com', '+1234567892', 'nurse', 'Pediatrics', true),
  ('550e8400-e29b-41d4-a716-446655440008', 'TEC001', 'mark.tech', 'demo_hash_4', 'Mark Thompson', 'mark@westmed.com', '+1234567893', 'technician', 'Radiology', true)
ON CONFLICT (id) DO NOTHING;

-- Insert demo visits with only regular_checkup (default value)
INSERT INTO public.visits (id, doctor_id, patient_id, patient_name, visit_date, visit_payment, patient_count, notes) VALUES 
  ('550e8400-e29b-41d4-a716-446655441001', 'd50e8400-e29b-41d4-a716-446655440001', 'P001', 'John Smith', '2025-09-01', 750.00, 1, 'Cardiology consultation - chest discomfort, ECG normal'),
  ('550e8400-e29b-41d4-a716-446655441002', 'd50e8400-e29b-41d4-a716-446655440001', 'P002', 'Mary Johnson', '2025-09-01', 750.00, 1, 'Cardiology follow-up - blood pressure stable'),
  ('550e8400-e29b-41d4-a716-446655441003', 'd50e8400-e29b-41d4-a716-446655440002', 'P003', 'Robert Davis', '2025-09-02', 800.00, 1, 'Neurology consultation - migraine symptoms, medication prescribed'),
  ('550e8400-e29b-41d4-a716-446655441004', 'd50e8400-e29b-41d4-a716-446655440003', 'P004', 'Emily Wilson', '2025-09-02', 600.00, 1, 'Pediatrics - routine immunization schedule'),
  ('550e8400-e29b-41d4-a716-446655441005', 'd50e8400-e29b-41d4-a716-446655440003', 'P005', 'Tommy Brown', '2025-09-03', 600.00, 1, 'Pediatrics - fever and cough, rest recommended'),
  ('550e8400-e29b-41d4-a716-446655441006', 'd50e8400-e29b-41d4-a716-446655440004', 'P006', 'Lisa Garcia', '2025-09-03', 700.00, 1, 'Orthopedics - knee pain, physiotherapy recommended'),
  ('550e8400-e29b-41d4-a716-446655441007', 'd50e8400-e29b-41d4-a716-446655440001', 'P007', 'Michael Chen', '2025-09-04', 750.00, 1, 'Cardiology - hypertension follow-up, medication adjustment'),
  ('550e8400-e29b-41d4-a716-446655441008', 'd50e8400-e29b-41d4-a716-446655440002', 'P008', 'Sarah Martinez', '2025-09-04', 800.00, 1, 'Neurology - memory concerns, cognitive assessment scheduled')
ON CONFLICT (id) DO NOTHING;