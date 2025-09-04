-- Create staff_roles enum
CREATE TYPE staff_role AS ENUM ('admin', 'manager', 'nurse', 'doctor', 'technician', 'receptionist', 'pharmacist', 'cleaner', 'security');

-- Create task_status enum  
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'overdue');

-- Create complaint_status enum
CREATE TYPE complaint_status AS ENUM ('open', 'in_review', 'resolved', 'closed');

-- Create staff table for authentication and management
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_code TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role staff_role NOT NULL DEFAULT 'nurse',
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_title TEXT NOT NULL,
  task_description TEXT,
  assigned_to UUID NOT NULL REFERENCES public.staff(id),
  assigned_by UUID REFERENCES public.staff(id),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status task_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_title TEXT NOT NULL,
  complaint_description TEXT NOT NULL,
  raised_by UUID NOT NULL REFERENCES public.staff(id),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'equipment', 'facility', 'workload', 'policy', 'safety', 'other')),
  status complaint_status NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  resolved_by UUID REFERENCES public.staff(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Create policies for staff table
CREATE POLICY "Admins can manage all staff" 
ON public.staff 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = (
      SELECT id FROM public.staff 
      WHERE id IN (
        SELECT p.id FROM public.profiles p 
        WHERE p.user_id = auth.uid() AND p.role = 'admin'
      )
    )
  )
);

CREATE POLICY "Staff can view their own record" 
ON public.staff 
FOR SELECT 
USING (id IN (
  SELECT p.id FROM public.profiles p 
  WHERE p.user_id = auth.uid()
));

-- Create policies for tasks table
CREATE POLICY "Admins and managers can manage all tasks" 
ON public.tasks 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Staff can view their assigned tasks" 
ON public.tasks 
FOR SELECT 
USING (assigned_to IN (
  SELECT s.id FROM public.staff s 
  JOIN public.profiles p ON s.id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Staff can update their assigned tasks" 
ON public.tasks 
FOR UPDATE 
USING (assigned_to IN (
  SELECT s.id FROM public.staff s 
  JOIN public.profiles p ON s.id = p.id 
  WHERE p.user_id = auth.uid()
));

-- Create policies for complaints table
CREATE POLICY "Admins can manage all complaints" 
ON public.complaints 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Staff can create complaints" 
ON public.complaints 
FOR INSERT 
WITH CHECK (raised_by IN (
  SELECT s.id FROM public.staff s 
  JOIN public.profiles p ON s.id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Staff can view their own complaints" 
ON public.complaints 
FOR SELECT 
USING (raised_by IN (
  SELECT s.id FROM public.staff s 
  JOIN public.profiles p ON s.id = p.id 
  WHERE p.user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_staff_username ON public.staff(username);
CREATE INDEX idx_staff_role ON public.staff(role);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_complaints_raised_by ON public.complaints(raised_by);
CREATE INDEX idx_complaints_status ON public.complaints(status);

-- Add triggers for updated_at columns
CREATE TRIGGER update_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();