-- Insert demo profiles first
INSERT INTO public.profiles (id, user_id, full_name, role) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', null, 'Dr. Sarah Wilson', 'doctor'),
  ('550e8400-e29b-41d4-a716-446655440002', null, 'Dr. Michael Chen', 'doctor'),
  ('550e8400-e29b-41d4-a716-446655440003', null, 'Dr. Emily Johnson', 'doctor'),
  ('550e8400-e29b-41d4-a716-446655440004', null, 'Dr. Robert Martinez', 'doctor'),
  ('550e8400-e29b-41d4-a716-446655440005', null, 'Nurse Jessica Brown', 'manager'),
  ('550e8400-e29b-41d4-a716-446655440006', null, 'Nurse David Lee', 'manager'),
  ('550e8400-e29b-41d4-a716-446655440007', null, 'Nurse Anna Garcia', 'manager'),
  ('550e8400-e29b-41d4-a716-446655440008', null, 'Tech Mark Thompson', 'manager');

-- Insert demo doctors
INSERT INTO public.doctors (id, profile_id, doctor_code, specialization, rate_per_visit, is_active) VALUES 
  ('d50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'DOC001', 'Cardiology', 750.00, true),
  ('d50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'DOC002', 'Neurology', 800.00, true),
  ('d50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'DOC003', 'Pediatrics', 600.00, true),
  ('d50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'DOC004', 'Orthopedics', 700.00, true);

-- Insert demo staff members
INSERT INTO public.staff (id, staff_code, username, password_hash, full_name, email, phone, role, department, is_active) VALUES 
  ('550e8400-e29b-41d4-a716-446655440005', 'NUR001', 'jessica.brown', 'demo_hash_1', 'Jessica Brown', 'jessica@westmed.com', '+1234567890', 'nurse', 'ICU', true),
  ('550e8400-e29b-41d4-a716-446655440006', 'NUR002', 'david.lee', 'demo_hash_2', 'David Lee', 'david@westmed.com', '+1234567891', 'nurse', 'Emergency', true),
  ('550e8400-e29b-41d4-a716-446655440007', 'NUR003', 'anna.garcia', 'demo_hash_3', 'Anna Garcia', 'anna@westmed.com', '+1234567892', 'nurse', 'Pediatrics', true),
  ('550e8400-e29b-41d4-a716-446655440008', 'TEC001', 'mark.tech', 'demo_hash_4', 'Mark Thompson', 'mark@westmed.com', '+1234567893', 'technician', 'Radiology', true);

-- Insert demo visits
INSERT INTO public.visits (id, doctor_id, patient_id, patient_name, visit_date, visit_reason, visit_payment, patient_count, notes) VALUES 
  ('v50e8400-e29b-41d4-a716-446655440001', 'd50e8400-e29b-41d4-a716-446655440001', 'P001', 'John Smith', '2025-09-01', 'Chest Pain Consultation', 750.00, 1, 'Patient reported chest discomfort, ECG normal'),
  ('v50e8400-e29b-41d4-a716-446655440002', 'd50e8400-e29b-41d4-a716-446655440001', 'P002', 'Mary Johnson', '2025-09-01', 'Routine Cardiology Checkup', 750.00, 1, 'Follow-up visit, blood pressure stable'),
  ('v50e8400-e29b-41d4-a716-446655440003', 'd50e8400-e29b-41d4-a716-446655440002', 'P003', 'Robert Davis', '2025-09-02', 'Headache Assessment', 800.00, 1, 'Migraine symptoms, prescribed medication'),
  ('v50e8400-e29b-41d4-a716-446655440004', 'd50e8400-e29b-41d4-a716-446655440003', 'P004', 'Emily Wilson', '2025-09-02', 'Child Vaccination', 600.00, 1, 'Routine immunization schedule'),
  ('v50e8400-e29b-41d4-a716-446655440005', 'd50e8400-e29b-41d4-a716-446655440003', 'P005', 'Tommy Brown', '2025-09-03', 'Fever and Cough', 600.00, 1, 'Common cold symptoms, rest recommended'),
  ('v50e8400-e29b-41d4-a716-446655440006', 'd50e8400-e29b-41d4-a716-446655440004', 'P006', 'Lisa Garcia', '2025-09-03', 'Knee Pain', 700.00, 1, 'Joint examination, physiotherapy recommended'),
  ('v50e8400-e29b-41d4-a716-446655440007', 'd50e8400-e29b-41d4-a716-446655440001', 'P007', 'Michael Chen', '2025-09-04', 'Hypertension Follow-up', 750.00, 1, 'Blood pressure monitoring, medication adjustment'),
  ('v50e8400-e29b-41d4-a716-446655440008', 'd50e8400-e29b-41d4-a716-446655440002', 'P008', 'Sarah Martinez', '2025-09-04', 'Memory Concerns', 800.00, 1, 'Cognitive assessment scheduled');

-- Insert demo tasks
INSERT INTO public.tasks (id, task_title, task_description, priority, status, assigned_to, assigned_by, due_date, notes) VALUES 
  ('t50e8400-e29b-41d4-a716-446655440001', 'Update Patient Records', 'Review and update patient medical records for September visits', 'high', 'pending', '550e8400-e29b-41d4-a716-446655440005', null, '2025-09-05 17:00:00+00', 'Priority task for ICU patients'),
  ('t50e8400-e29b-41d4-a716-446655440002', 'Equipment Maintenance Check', 'Perform routine maintenance on radiology equipment', 'medium', 'in_progress', '550e8400-e29b-41d4-a716-446655440008', null, '2025-09-06 12:00:00+00', 'Monthly maintenance schedule'),
  ('t50e8400-e29b-41d4-a716-446655440003', 'Staff Training Session', 'Conduct emergency response training for nursing staff', 'high', 'pending', '550e8400-e29b-41d4-a716-446655440006', null, '2025-09-07 09:00:00+00', 'Annual training requirement');

-- Insert demo messages
INSERT INTO public.messages (id, sender_id, sender_name, sender_role, content) VALUES 
  ('m50e8400-e29b-41d4-a716-446655440001', '615fd30d-7b8a-4977-a585-80b44faafb7f', 'Admin', 'admin', 'Good morning team! Please ensure all patient records are updated by end of day.'),
  ('m50e8400-e29b-41d4-a716-446655440002', '615fd30d-7b8a-4977-a585-80b44faafb7f', 'Admin', 'admin', 'Reminder: Staff meeting scheduled for tomorrow at 2 PM in Conference Room A.'),
  ('m50e8400-e29b-41d4-a716-446655440003', '615fd30d-7b8a-4977-a585-80b44faafb7f', 'Admin', 'admin', 'New safety protocols have been implemented. Please review the updated guidelines.');