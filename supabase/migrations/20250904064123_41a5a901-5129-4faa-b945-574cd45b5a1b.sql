-- Insert demo staff members
INSERT INTO public.staff (id, staff_code, username, password_hash, full_name, email, phone, role, department, is_active) VALUES 
  ('550e8400-e29b-41d4-a716-446655440005', 'NUR001', 'jessica.brown', 'demo_hash_1', 'Jessica Brown', 'jessica@westmed.com', '+1234567890', 'nurse', 'ICU', true),
  ('550e8400-e29b-41d4-a716-446655440006', 'NUR002', 'david.lee', 'demo_hash_2', 'David Lee', 'david@westmed.com', '+1234567891', 'nurse', 'Emergency', true),
  ('550e8400-e29b-41d4-a716-446655440007', 'NUR003', 'anna.garcia', 'demo_hash_3', 'Anna Garcia', 'anna@westmed.com', '+1234567892', 'nurse', 'Pediatrics', true),
  ('550e8400-e29b-41d4-a716-446655440008', 'TEC001', 'mark.tech', 'demo_hash_4', 'Mark Thompson', 'mark@westmed.com', '+1234567893', 'technician', 'Radiology', true)
ON CONFLICT (id) DO NOTHING;

-- Insert demo visits with proper UUIDs
INSERT INTO public.visits (id, doctor_id, patient_id, patient_name, visit_date, visit_reason, visit_payment, patient_count, notes) VALUES 
  ('550e8400-e29b-41d4-a716-446655445001', 'd50e8400-e29b-41d4-a716-446655440001', 'P001', 'John Smith', '2025-09-01', 'Chest Pain Consultation', 750.00, 1, 'Patient reported chest discomfort, ECG normal'),
  ('550e8400-e29b-41d4-a716-446655445002', 'd50e8400-e29b-41d4-a716-446655440001', 'P002', 'Mary Johnson', '2025-09-01', 'Routine Cardiology Checkup', 750.00, 1, 'Follow-up visit, blood pressure stable'),
  ('550e8400-e29b-41d4-a716-446655445003', 'd50e8400-e29b-41d4-a716-446655440002', 'P003', 'Robert Davis', '2025-09-02', 'Headache Assessment', 800.00, 1, 'Migraine symptoms, prescribed medication'),
  ('550e8400-e29b-41d4-a716-446655445004', 'd50e8400-e29b-41d4-a716-446655440003', 'P004', 'Emily Wilson', '2025-09-02', 'Child Vaccination', 600.00, 1, 'Routine immunization schedule'),
  ('550e8400-e29b-41d4-a716-446655445005', 'd50e8400-e29b-41d4-a716-446655440003', 'P005', 'Tommy Brown', '2025-09-03', 'Fever and Cough', 600.00, 1, 'Common cold symptoms, rest recommended'),
  ('550e8400-e29b-41d4-a716-446655445006', 'd50e8400-e29b-41d4-a716-446655440004', 'P006', 'Lisa Garcia', '2025-09-03', 'Knee Pain', 700.00, 1, 'Joint examination, physiotherapy recommended'),
  ('550e8400-e29b-41d4-a716-446655445007', 'd50e8400-e29b-41d4-a716-446655440001', 'P007', 'Michael Chen', '2025-09-04', 'Hypertension Follow-up', 750.00, 1, 'Blood pressure monitoring, medication adjustment'),
  ('550e8400-e29b-41d4-a716-446655445008', 'd50e8400-e29b-41d4-a716-446655440002', 'P008', 'Sarah Martinez', '2025-09-04', 'Memory Concerns', 800.00, 1, 'Cognitive assessment scheduled')
ON CONFLICT (id) DO NOTHING;