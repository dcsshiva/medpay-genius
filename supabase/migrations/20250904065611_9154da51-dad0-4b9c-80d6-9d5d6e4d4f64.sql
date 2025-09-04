-- Insert additional staff members with various roles
INSERT INTO public.staff (id, staff_code, username, password_hash, full_name, email, phone, role, department, is_active) VALUES 
  -- Managers
  ('550e8400-e29b-41d4-a716-446655440009', 'MGR001', 'sarah.manager', 'demo_hash_5', 'Sarah Williams', 'sarah.williams@westmed.com', '+1234567894', 'manager', 'Administration', true),
  ('550e8400-e29b-41d4-a716-44665544000a', 'MGR002', 'john.supervisor', 'demo_hash_6', 'John Davis', 'john.davis@westmed.com', '+1234567895', 'manager', 'Operations', true),
  
  -- Receptionists  
  ('550e8400-e29b-41d4-a716-44665544000b', 'REC001', 'mary.reception', 'demo_hash_7', 'Mary Clark', 'mary.clark@westmed.com', '+1234567896', 'receptionist', 'Front Desk', true),
  ('550e8400-e29b-41d4-a716-44665544000c', 'REC002', 'lisa.front', 'demo_hash_8', 'Lisa Johnson', 'lisa.johnson@westmed.com', '+1234567897', 'receptionist', 'Front Desk', true),
  
  -- Pharmacists
  ('550e8400-e29b-41d4-a716-44665544000d', 'PHM001', 'robert.pharmacy', 'demo_hash_9', 'Robert Miller', 'robert.miller@westmed.com', '+1234567898', 'pharmacist', 'Pharmacy', true),
  ('550e8400-e29b-41d4-a716-44665544000e', 'PHM002', 'jennifer.meds', 'demo_hash_10', 'Jennifer Taylor', 'jennifer.taylor@westmed.com', '+1234567899', 'pharmacist', 'Pharmacy', true),
  
  -- Security
  ('550e8400-e29b-41d4-a716-44665544000f', 'SEC001', 'mike.security', 'demo_hash_11', 'Michael Brown', 'michael.brown@westmed.com', '+1234567800', 'security', 'Security', true),
  ('550e8400-e29b-41d4-a716-446655440010', 'SEC002', 'david.guard', 'demo_hash_12', 'David Wilson', 'david.wilson@westmed.com', '+1234567801', 'security', 'Security', true),
  
  -- Cleaning Staff
  ('550e8400-e29b-41d4-a716-446655440011', 'CLN001', 'maria.cleaning', 'demo_hash_13', 'Maria Garcia', 'maria.garcia@westmed.com', '+1234567802', 'cleaner', 'Housekeeping', true),
  ('550e8400-e29b-41d4-a716-446655440012', 'CLN002', 'carlos.maintenance', 'demo_hash_14', 'Carlos Rodriguez', 'carlos.rodriguez@westmed.com', '+1234567803', 'cleaner', 'Housekeeping', true),
  
  -- More Technicians
  ('550e8400-e29b-41d4-a716-446655440013', 'TEC002', 'alex.lab', 'demo_hash_15', 'Alex Johnson', 'alex.johnson@westmed.com', '+1234567804', 'technician', 'Laboratory', true),
  ('550e8400-e29b-41d4-a716-446655440014', 'TEC003', 'sophie.imaging', 'demo_hash_16', 'Sophie Anderson', 'sophie.anderson@westmed.com', '+1234567805', 'technician', 'Medical Imaging', true)
ON CONFLICT (id) DO NOTHING;