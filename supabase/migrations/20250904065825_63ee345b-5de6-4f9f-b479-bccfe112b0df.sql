-- Insert comprehensive demo tasks with proper UUID format
INSERT INTO public.tasks (id, task_title, task_description, priority, status, assigned_to, assigned_by, due_date, notes) VALUES 
  -- Nursing tasks
  ('550e8400-e29b-41d4-a716-446655449004', 'Medication Inventory Check', 'Complete monthly medication inventory and report any shortages', 'high', 'pending', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440009', '2025-09-06 10:00:00+00', 'Due before weekend shift change'),
  ('550e8400-e29b-41d4-a716-446655449005', 'Patient Care Documentation', 'Update patient care plans for ICU ward rounds', 'medium', 'in_progress', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440009', '2025-09-05 14:00:00+00', 'Focus on post-surgery patients'),
  ('550e8400-e29b-41d4-a716-446655449006', 'Emergency Protocol Review', 'Review and update emergency response protocols for pediatric ward', 'high', 'completed', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440009', '2025-09-03 16:00:00+00', 'Completed ahead of schedule'),

  -- Reception tasks  
  ('550e8400-e29b-41d4-a716-446655449007', 'Appointment System Update', 'Update patient appointment scheduling system with new doctor availability', 'medium', 'pending', '550e8400-e29b-41d4-a716-44665544000b', '550e8400-e29b-41d4-a716-446655440009', '2025-09-07 09:00:00+00', 'Coordinate with IT department'),
  ('550e8400-e29b-41d4-a716-446655449008', 'Patient Registration Training', 'Conduct training session for new patient registration procedures', 'low', 'in_progress', '550e8400-e29b-41d4-a716-44665544000c', '550e8400-e29b-41d4-a716-446655440009', '2025-09-08 11:00:00+00', 'Include insurance verification process'),

  -- Pharmacy tasks
  ('550e8400-e29b-41d4-a716-446655449009', 'Drug Expiry Audit', 'Conduct quarterly audit of medication expiry dates and disposal', 'high', 'pending', '550e8400-e29b-41d4-a716-44665544000d', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-05 17:00:00+00', 'Critical for regulatory compliance'),
  ('550e8400-e29b-41d4-a716-44665544900a', 'Prescription Verification System', 'Implement new electronic prescription verification protocol', 'medium', 'in_progress', '550e8400-e29b-41d4-a716-44665544000e', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-10 12:00:00+00', 'Test with controlled substances first'),

  -- Security tasks
  ('550e8400-e29b-41d4-a716-44665544900b', 'Security System Maintenance', 'Monthly maintenance check of CCTV and access control systems', 'medium', 'pending', '550e8400-e29b-41d4-a716-44665544000f', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-06 08:00:00+00', 'Include backup generator test'),
  ('550e8400-e29b-41d4-a716-44665544900c', 'Visitor Management Update', 'Update visitor registration system and train staff on new procedures', 'low', 'completed', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-02 10:00:00+00', 'Successfully implemented'),

  -- Housekeeping tasks
  ('550e8400-e29b-41d4-a716-44665544900d', 'Deep Cleaning Schedule', 'Coordinate deep cleaning of all patient rooms and common areas', 'high', 'in_progress', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440009', '2025-09-05 06:00:00+00', 'Start with surgical suites'),
  ('550e8400-e29b-41d4-a716-44665544900e', 'Infection Control Protocol', 'Implement enhanced infection control measures in all departments', 'high', 'pending', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440009', '2025-09-06 07:00:00+00', 'Follow WHO guidelines'),

  -- Laboratory tasks
  ('550e8400-e29b-41d4-a716-44665544900f', 'Lab Equipment Calibration', 'Monthly calibration of blood analysis and chemistry equipment', 'high', 'pending', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-07 13:00:00+00', 'Required for accreditation'),
  ('550e8400-e29b-41d4-a716-446655449015', 'Quality Control Testing', 'Run weekly quality control tests on all laboratory instruments', 'medium', 'in_progress', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-04 15:00:00+00', 'Document all results')
ON CONFLICT (id) DO NOTHING;