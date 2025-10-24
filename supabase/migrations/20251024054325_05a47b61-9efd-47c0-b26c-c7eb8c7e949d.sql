-- Create roles_master table
CREATE TABLE public.roles_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL,
  role_code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed roles_master with existing roles
INSERT INTO public.roles_master (role_name, role_code, description, display_order) VALUES
  ('Admin', 'admin', 'System administrator with full access', 1),
  ('Manager', 'manager', 'Department manager with supervisory access', 2),
  ('Nurse', 'nurse', 'Nursing staff', 3),
  ('Doctor', 'doctor', 'Medical doctor', 4),
  ('Technician', 'technician', 'Medical technician', 5),
  ('Receptionist', 'receptionist', 'Front desk receptionist', 6),
  ('Pharmacist', 'pharmacist', 'Pharmacy staff', 7),
  ('Cleaner', 'cleaner', 'Cleaning staff', 8),
  ('Security', 'security', 'Security personnel', 9);

-- Create departments_master table
CREATE TABLE public.departments_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_name TEXT NOT NULL,
  department_code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed departments_master
INSERT INTO public.departments_master (department_name, department_code, description, display_order) VALUES
  ('Emergency', 'emergency', 'Emergency department', 1),
  ('ICU', 'icu', 'Intensive Care Unit', 2),
  ('Cardiology', 'cardiology', 'Heart and cardiovascular department', 3),
  ('Neurology', 'neurology', 'Neurological department', 4),
  ('Orthopedics', 'orthopedics', 'Bone and joint department', 5),
  ('Pediatrics', 'pediatrics', 'Children department', 6),
  ('Radiology', 'radiology', 'Imaging department', 7),
  ('Laboratory', 'laboratory', 'Lab testing department', 8),
  ('Pharmacy', 'pharmacy', 'Pharmacy department', 9),
  ('Administration', 'administration', 'Administrative department', 10);

-- Create leave_reasons_master table
CREATE TABLE public.leave_reasons_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_name TEXT NOT NULL,
  reason_code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed leave_reasons_master
INSERT INTO public.leave_reasons_master (reason_name, reason_code, description, display_order) VALUES
  ('Sick Leave', 'sick_leave', 'Medical illness or health issues', 1),
  ('Casual Leave', 'casual_leave', 'Personal or casual leave', 2),
  ('Annual Leave', 'annual_leave', 'Yearly vacation leave', 3),
  ('Emergency Leave', 'emergency_leave', 'Urgent personal emergency', 4),
  ('Maternity Leave', 'maternity_leave', 'Maternity leave for mothers', 5),
  ('Paternity Leave', 'paternity_leave', 'Paternity leave for fathers', 6),
  ('Unpaid Leave', 'unpaid_leave', 'Leave without pay', 7),
  ('Other', 'other', 'Other reasons', 8);

-- Create permission_reasons_master table
CREATE TABLE public.permission_reasons_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_name TEXT NOT NULL,
  reason_code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed permission_reasons_master
INSERT INTO public.permission_reasons_master (reason_name, reason_code, description, display_order) VALUES
  ('Personal Work', 'personal_work', 'Personal errands or work', 1),
  ('Medical Appointment', 'medical_appointment', 'Doctor or medical appointment', 2),
  ('Family Emergency', 'family_emergency', 'Family-related emergency', 3),
  ('Official Work', 'official_work', 'Hospital-related official work', 4),
  ('Bank Work', 'bank_work', 'Banking or financial errands', 5),
  ('Other', 'other', 'Other reasons', 6);

-- Create indexes for performance
CREATE INDEX idx_roles_master_active ON public.roles_master(is_active);
CREATE INDEX idx_roles_master_display_order ON public.roles_master(display_order);
CREATE INDEX idx_departments_master_active ON public.departments_master(is_active);
CREATE INDEX idx_departments_master_display_order ON public.departments_master(display_order);
CREATE INDEX idx_leave_reasons_master_active ON public.leave_reasons_master(is_active);
CREATE INDEX idx_leave_reasons_master_display_order ON public.leave_reasons_master(display_order);
CREATE INDEX idx_permission_reasons_master_active ON public.permission_reasons_master(is_active);
CREATE INDEX idx_permission_reasons_master_display_order ON public.permission_reasons_master(display_order);

-- Enable RLS
ALTER TABLE public.roles_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_reasons_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_reasons_master ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles_master
CREATE POLICY "Admins can manage roles" ON public.roles_master
  FOR ALL USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Anyone can view active roles" ON public.roles_master
  FOR SELECT USING (is_active = true);

-- RLS Policies for departments_master
CREATE POLICY "Admins can manage departments" ON public.departments_master
  FOR ALL USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Anyone can view active departments" ON public.departments_master
  FOR SELECT USING (is_active = true);

-- RLS Policies for leave_reasons_master
CREATE POLICY "Admins can manage leave reasons" ON public.leave_reasons_master
  FOR ALL USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Anyone can view active leave reasons" ON public.leave_reasons_master
  FOR SELECT USING (is_active = true);

-- RLS Policies for permission_reasons_master
CREATE POLICY "Admins can manage permission reasons" ON public.permission_reasons_master
  FOR ALL USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Anyone can view active permission reasons" ON public.permission_reasons_master
  FOR SELECT USING (is_active = true);

-- Triggers for updated_at
CREATE TRIGGER update_roles_master_updated_at
  BEFORE UPDATE ON public.roles_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_master_updated_at
  BEFORE UPDATE ON public.departments_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_reasons_master_updated_at
  BEFORE UPDATE ON public.leave_reasons_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permission_reasons_master_updated_at
  BEFORE UPDATE ON public.permission_reasons_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();