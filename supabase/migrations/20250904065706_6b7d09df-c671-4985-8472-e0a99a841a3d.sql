-- Insert comprehensive demo tasks assigned to various staff members
INSERT INTO public.tasks (id, task_title, task_description, priority, status, assigned_to, assigned_by, due_date, notes) VALUES 
  -- Nursing tasks
  ('t50e8400-e29b-41d4-a716-446655440004', 'Medication Inventory Check', 'Complete monthly medication inventory and report any shortages', 'high', 'pending', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440009', '2025-09-06 10:00:00+00', 'Due before weekend shift change'),
  ('t50e8400-e29b-41d4-a716-446655440005', 'Patient Care Documentation', 'Update patient care plans for ICU ward rounds', 'medium', 'in_progress', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440009', '2025-09-05 14:00:00+00', 'Focus on post-surgery patients'),
  ('t50e8400-e29b-41d4-a716-446655440006', 'Emergency Protocol Review', 'Review and update emergency response protocols for pediatric ward', 'high', 'completed', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440009', '2025-09-03 16:00:00+00', 'Completed ahead of schedule'),

  -- Reception tasks
  ('t50e8400-e29b-41d4-a716-446655440007', 'Appointment System Update', 'Update patient appointment scheduling system with new doctor availability', 'medium', 'pending', '550e8400-e29b-41d4-a716-44665544000b', '550e8400-e29b-41d4-a716-446655440009', '2025-09-07 09:00:00+00', 'Coordinate with IT department'),
  ('t50e8400-e29b-41d4-a716-446655440008', 'Patient Registration Training', 'Conduct training session for new patient registration procedures', 'low', 'in_progress', '550e8400-e29b-41d4-a716-44665544000c', '550e8400-e29b-41d4-a716-446655440009', '2025-09-08 11:00:00+00', 'Include insurance verification process'),

  -- Pharmacy tasks
  ('t50e8400-e29b-41d4-a716-446655440009', 'Drug Expiry Audit', 'Conduct quarterly audit of medication expiry dates and disposal', 'high', 'pending', '550e8400-e29b-41d4-a716-44665544000d', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-05 17:00:00+00', 'Critical for regulatory compliance'),
  ('t50e8400-e29b-41d4-a716-44665544000a', 'Prescription Verification System', 'Implement new electronic prescription verification protocol', 'medium', 'in_progress', '550e8400-e29b-41d4-a716-44665544000e', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-10 12:00:00+00', 'Test with controlled substances first'),

  -- Security tasks
  ('t50e8400-e29b-41d4-a716-44665544000b', 'Security System Maintenance', 'Monthly maintenance check of CCTV and access control systems', 'medium', 'pending', '550e8400-e29b-41d4-a716-44665544000f', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-06 08:00:00+00', 'Include backup generator test'),
  ('t50e8400-e29b-41d4-a716-44665544000c', 'Visitor Management Update', 'Update visitor registration system and train staff on new procedures', 'low', 'completed', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-02 10:00:00+00', 'Successfully implemented'),

  -- Housekeeping tasks
  ('t50e8400-e29b-41d4-a716-44665544000d', 'Deep Cleaning Schedule', 'Coordinate deep cleaning of all patient rooms and common areas', 'high', 'in_progress', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440009', '2025-09-05 06:00:00+00', 'Start with surgical suites'),
  ('t50e8400-e29b-41d4-a716-44665544000e', 'Infection Control Protocol', 'Implement enhanced infection control measures in all departments', 'high', 'pending', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440009', '2025-09-06 07:00:00+00', 'Follow WHO guidelines'),

  -- Laboratory tasks
  ('t50e8400-e29b-41d4-a716-44665544000f', 'Lab Equipment Calibration', 'Monthly calibration of blood analysis and chemistry equipment', 'high', 'pending', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-07 13:00:00+00', 'Required for accreditation'),
  ('t50e8400-e29b-41d4-a716-446655440015', 'Quality Control Testing', 'Run weekly quality control tests on all laboratory instruments', 'medium', 'in_progress', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-04 15:00:00+00', 'Document all results'),

  -- Medical Imaging tasks
  ('t50e8400-e29b-41d4-a716-446655440016', 'MRI Safety Protocol Update', 'Review and update MRI safety protocols and staff training materials', 'medium', 'pending', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-08 14:00:00+00', 'Include contrast agent procedures'),
  ('t50e8400-e29b-41d4-a716-446655440017', 'Digital Imaging Archive', 'Organize and archive digital imaging files for Q3 2025', 'low', 'completed', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-01 12:00:00+00', 'Archive completed successfully'),

  -- Management tasks
  ('t50e8400-e29b-41d4-a716-446655440018', 'Staff Performance Reviews', 'Conduct quarterly performance reviews for all department staff', 'medium', 'in_progress', '550e8400-e29b-41d4-a716-446655440009', null, '2025-09-12 16:00:00+00', 'Schedule individual meetings'),
  ('t50e8400-e29b-41d4-a716-446655440019', 'Budget Planning Meeting', 'Prepare quarterly budget reports and planning meeting materials', 'high', 'pending', '550e8400-e29b-41d4-a716-44665544000a', null, '2025-09-09 10:00:00+00', 'Include capital expenditure proposals')
ON CONFLICT (id) DO NOTHING;