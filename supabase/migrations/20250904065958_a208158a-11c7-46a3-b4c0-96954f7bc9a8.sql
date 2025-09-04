-- Add remaining demo tasks for complete coverage
INSERT INTO public.tasks (id, task_title, task_description, priority, status, assigned_to, assigned_by, due_date, notes) VALUES 
  -- Medical Imaging tasks
  ('550e8400-e29b-41d4-a716-446655449016', 'MRI Safety Protocol Update', 'Review and update MRI safety protocols and staff training materials', 'medium', 'pending', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-08 14:00:00+00', 'Include contrast agent procedures'),
  ('550e8400-e29b-41d4-a716-446655449017', 'Digital Imaging Archive', 'Organize and archive digital imaging files for Q3 2025', 'low', 'completed', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-01 12:00:00+00', 'Archive completed successfully'),

  -- Management tasks
  ('550e8400-e29b-41d4-a716-446655449018', 'Staff Performance Reviews', 'Conduct quarterly performance reviews for all department staff', 'medium', 'in_progress', '550e8400-e29b-41d4-a716-446655440009', null, '2025-09-12 16:00:00+00', 'Schedule individual meetings'),
  ('550e8400-e29b-41d4-a716-446655449019', 'Budget Planning Meeting', 'Prepare quarterly budget reports and planning meeting materials', 'high', 'pending', '550e8400-e29b-41d4-a716-44665544000a', null, '2025-09-09 10:00:00+00', 'Include capital expenditure proposals'),

  -- Additional operational tasks
  ('550e8400-e29b-41d4-a716-446655449020', 'Fire Safety Drill', 'Conduct monthly fire safety drill and evacuation procedures', 'high', 'pending', '550e8400-e29b-41d4-a716-44665544000f', '550e8400-e29b-41d4-a716-44665544000a', '2025-09-05 10:30:00+00', 'All departments must participate'),
  ('550e8400-e29b-41d4-a716-446655449021', 'Inventory Management System', 'Update hospital inventory management system with new suppliers', 'medium', 'pending', '550e8400-e29b-41d4-a716-44665544000b', '550e8400-e29b-41d4-a716-446655440009', '2025-09-11 13:00:00+00', 'Focus on medical supplies'),
  ('550e8400-e29b-41d4-a716-446655449022', 'Patient Satisfaction Survey', 'Conduct quarterly patient satisfaction survey and compile results', 'low', 'in_progress', '550e8400-e29b-41d4-a716-44665544000c', '550e8400-e29b-41d4-a716-446655440009', '2025-09-15 17:00:00+00', 'Include all departments')
ON CONFLICT (id) DO NOTHING;