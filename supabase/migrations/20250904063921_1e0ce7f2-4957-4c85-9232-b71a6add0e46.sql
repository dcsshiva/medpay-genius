-- Insert demo doctors (using existing admin profile structure)
INSERT INTO public.doctors (id, profile_id, doctor_code, specialization, rate_per_visit, is_active) VALUES 
  ('d50e8400-e29b-41d4-a716-446655440001', (SELECT id FROM profiles WHERE user_id = '615fd30d-7b8a-4977-a585-80b44faafb7f'), 'DOC001', 'Cardiology', 750.00, true),
  ('d50e8400-e29b-41d4-a716-446655440002', (SELECT id FROM profiles WHERE user_id = '615fd30d-7b8a-4977-a585-80b44faafb7f'), 'DOC002', 'Neurology', 800.00, true),
  ('d50e8400-e29b-41d4-a716-446655440003', (SELECT id FROM profiles WHERE user_id = '615fd30d-7b8a-4977-a585-80b44faafb7f'), 'DOC003', 'Pediatrics', 600.00, true),
  ('d50e8400-e29b-41d4-a716-446655440004', (SELECT id FROM profiles WHERE user_id = '615fd30d-7b8a-4977-a585-80b44faafb7f'), 'DOC004', 'Orthopedics', 700.00, true)
ON CONFLICT (id) DO NOTHING;