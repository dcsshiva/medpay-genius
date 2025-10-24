-- Create enum for screen modules
CREATE TYPE screen_module AS ENUM (
  'dashboard',
  'visit_management',
  'payment_management',
  'cash_payments',
  'insurance_payments',
  'doctor_management',
  'staff_management',
  'task_management',
  'report_generation',
  'bank_advice_reports',
  'tds_reports',
  'user_login_reports',
  'staff_appraisal',
  'complaint_management',
  'master_data',
  'settings',
  'team_chat',
  'website_settings',
  'user_guide'
);

-- Create enum for approval types
CREATE TYPE approval_type AS ENUM (
  'cash_payment_manager',
  'cash_payment_admin',
  'insurance_payment_manager',
  'insurance_payment_admin',
  'payment_rejection',
  'bank_advice_generation',
  'staff_appraisal_approval',
  'complaint_resolution',
  'master_data_changes'
);

-- Create user_screen_access table
CREATE TABLE public.user_screen_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  screen_module screen_module NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID REFERENCES public.staff(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, screen_module)
);

-- Create user_approval_permissions table
CREATE TABLE public.user_approval_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  approval_type approval_type NOT NULL,
  can_approve BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES public.staff(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, approval_type)
);

-- Create user_access_history table for audit trail
CREATE TABLE public.user_access_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.staff(id),
  action_type TEXT NOT NULL, -- 'grant_screen', 'revoke_screen', 'grant_approval', 'revoke_approval'
  permission_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_screen_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_approval_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access_history ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check screen access
CREATE OR REPLACE FUNCTION public.has_screen_access(_user_id UUID, _screen screen_module, _require_edit BOOLEAN DEFAULT false)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_id_val UUID;
  has_access BOOLEAN;
BEGIN
  -- Get staff ID from user_id
  SELECT id INTO staff_id_val FROM public.staff WHERE user_id = _user_id AND is_active = true;
  
  IF staff_id_val IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has screen access
  IF _require_edit THEN
    SELECT can_edit INTO has_access 
    FROM public.user_screen_access 
    WHERE staff_id = staff_id_val AND screen_module = _screen;
  ELSE
    SELECT can_view INTO has_access 
    FROM public.user_screen_access 
    WHERE staff_id = staff_id_val AND screen_module = _screen;
  END IF;
  
  RETURN COALESCE(has_access, false);
END;
$$;

-- Create security definer function to check approval permission
CREATE OR REPLACE FUNCTION public.has_approval_permission(_user_id UUID, _approval_type approval_type)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_id_val UUID;
  has_permission BOOLEAN;
BEGIN
  -- Get staff ID from user_id
  SELECT id INTO staff_id_val FROM public.staff WHERE user_id = _user_id AND is_active = true;
  
  IF staff_id_val IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has approval permission
  SELECT can_approve INTO has_permission 
  FROM public.user_approval_permissions 
  WHERE staff_id = staff_id_val AND approval_type = _approval_type;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

-- Create function to get manageable staff list
CREATE OR REPLACE FUNCTION public.get_manageable_staff(_requesting_user_id UUID)
RETURNS TABLE(
  id UUID,
  staff_code TEXT,
  full_name TEXT,
  role staff_role,
  department TEXT,
  is_active BOOLEAN,
  screen_access_count BIGINT,
  approval_permission_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_designation app_designation;
BEGIN
  -- Get the designation of the requesting user
  SELECT designation INTO requesting_designation
  FROM public.user_designations
  WHERE user_id = _requesting_user_id
  LIMIT 1;
  
  -- Admins can manage all staff
  IF requesting_designation = 'admin'::app_designation THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.staff_code,
      s.full_name,
      s.role,
      s.department,
      s.is_active,
      COALESCE((SELECT COUNT(*) FROM public.user_screen_access WHERE staff_id = s.id), 0) as screen_access_count,
      COALESCE((SELECT COUNT(*) FROM public.user_approval_permissions WHERE staff_id = s.id), 0) as approval_permission_count
    FROM public.staff s
    WHERE s.is_active = true
    ORDER BY s.staff_code;
    
  -- Managers can manage non-admin/manager staff
  ELSIF requesting_designation = 'manager'::app_designation THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.staff_code,
      s.full_name,
      s.role,
      s.department,
      s.is_active,
      COALESCE((SELECT COUNT(*) FROM public.user_screen_access WHERE staff_id = s.id), 0) as screen_access_count,
      COALESCE((SELECT COUNT(*) FROM public.user_approval_permissions WHERE staff_id = s.id), 0) as approval_permission_count
    FROM public.staff s
    WHERE s.is_active = true
      AND s.user_id NOT IN (
        SELECT user_id FROM public.user_designations 
        WHERE designation IN ('admin'::app_designation, 'manager'::app_designation)
      )
    ORDER BY s.staff_code;
  END IF;
  
  RETURN;
END;
$$;

-- Create function to grant screen access
CREATE OR REPLACE FUNCTION public.grant_screen_access(
  _staff_id UUID,
  _screen_module screen_module,
  _can_view BOOLEAN,
  _can_edit BOOLEAN,
  _granted_by_user_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  granted_by_staff_id UUID;
  result JSONB;
BEGIN
  -- Get staff ID of the granting user
  SELECT id INTO granted_by_staff_id FROM public.staff WHERE user_id = _granted_by_user_id;
  
  -- Insert or update screen access
  INSERT INTO public.user_screen_access (staff_id, screen_module, can_view, can_edit, granted_by, notes)
  VALUES (_staff_id, _screen_module, _can_view, _can_edit, granted_by_staff_id, _notes)
  ON CONFLICT (staff_id, screen_module) 
  DO UPDATE SET 
    can_view = _can_view,
    can_edit = _can_edit,
    granted_by = granted_by_staff_id,
    granted_at = now(),
    notes = _notes,
    updated_at = now();
  
  -- Log the change
  INSERT INTO public.user_access_history (staff_id, changed_by, action_type, permission_type, new_value, notes)
  VALUES (
    _staff_id,
    granted_by_staff_id,
    'grant_screen',
    _screen_module::TEXT,
    jsonb_build_object('can_view', _can_view, 'can_edit', _can_edit),
    _notes
  );
  
  result := jsonb_build_object('success', true, 'screen_module', _screen_module);
  RETURN result;
END;
$$;

-- Create function to grant approval permission
CREATE OR REPLACE FUNCTION public.grant_approval_permission(
  _staff_id UUID,
  _approval_type approval_type,
  _can_approve BOOLEAN,
  _granted_by_user_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  granted_by_staff_id UUID;
  result JSONB;
BEGIN
  -- Get staff ID of the granting user
  SELECT id INTO granted_by_staff_id FROM public.staff WHERE user_id = _granted_by_user_id;
  
  -- Insert or update approval permission
  INSERT INTO public.user_approval_permissions (staff_id, approval_type, can_approve, granted_by, notes)
  VALUES (_staff_id, _approval_type, _can_approve, granted_by_staff_id, _notes)
  ON CONFLICT (staff_id, approval_type) 
  DO UPDATE SET 
    can_approve = _can_approve,
    granted_by = granted_by_staff_id,
    granted_at = now(),
    notes = _notes,
    updated_at = now();
  
  -- Log the change
  INSERT INTO public.user_access_history (staff_id, changed_by, action_type, permission_type, new_value, notes)
  VALUES (
    _staff_id,
    granted_by_staff_id,
    'grant_approval',
    _approval_type::TEXT,
    jsonb_build_object('can_approve', _can_approve),
    _notes
  );
  
  result := jsonb_build_object('success', true, 'approval_type', _approval_type);
  RETURN result;
END;
$$;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(_staff_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  screen_permissions JSONB;
  approval_permissions JSONB;
BEGIN
  -- Get screen access
  SELECT jsonb_agg(jsonb_build_object(
    'screen_module', screen_module,
    'can_view', can_view,
    'can_edit', can_edit,
    'granted_at', granted_at
  )) INTO screen_permissions
  FROM public.user_screen_access
  WHERE staff_id = _staff_id;
  
  -- Get approval permissions
  SELECT jsonb_agg(jsonb_build_object(
    'approval_type', approval_type,
    'can_approve', can_approve,
    'granted_at', granted_at
  )) INTO approval_permissions
  FROM public.user_approval_permissions
  WHERE staff_id = _staff_id;
  
  result := jsonb_build_object(
    'screen_access', COALESCE(screen_permissions, '[]'::jsonb),
    'approval_permissions', COALESCE(approval_permissions, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$;

-- Create RLS policies
-- user_screen_access policies
CREATE POLICY "Admins can manage all screen access"
ON public.user_screen_access
FOR ALL
USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Managers can manage non-admin/manager screen access"
ON public.user_screen_access
FOR ALL
USING (
  has_designation(auth.uid(), 'manager'::app_designation)
  AND staff_id NOT IN (
    SELECT s.id FROM public.staff s
    JOIN public.user_designations ud ON s.user_id = ud.user_id
    WHERE ud.designation IN ('admin'::app_designation, 'manager'::app_designation)
  )
);

CREATE POLICY "Staff can view their own screen access"
ON public.user_screen_access
FOR SELECT
USING (
  staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
);

-- user_approval_permissions policies
CREATE POLICY "Admins can manage all approval permissions"
ON public.user_approval_permissions
FOR ALL
USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Managers can manage limited approval permissions"
ON public.user_approval_permissions
FOR ALL
USING (
  has_designation(auth.uid(), 'manager'::app_designation)
  AND staff_id NOT IN (
    SELECT s.id FROM public.staff s
    JOIN public.user_designations ud ON s.user_id = ud.user_id
    WHERE ud.designation IN ('admin'::app_designation, 'manager'::app_designation)
  )
  AND approval_type NOT IN ('cash_payment_admin'::approval_type, 'insurance_payment_admin'::approval_type)
);

CREATE POLICY "Staff can view their own approval permissions"
ON public.user_approval_permissions
FOR SELECT
USING (
  staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
);

-- user_access_history policies
CREATE POLICY "Admins and managers can view access history"
ON public.user_access_history
FOR SELECT
USING (
  has_designation(auth.uid(), 'admin'::app_designation) 
  OR has_designation(auth.uid(), 'manager'::app_designation)
);

-- Create indexes for performance
CREATE INDEX idx_user_screen_access_staff_id ON public.user_screen_access(staff_id);
CREATE INDEX idx_user_screen_access_screen_module ON public.user_screen_access(screen_module);
CREATE INDEX idx_user_approval_permissions_staff_id ON public.user_approval_permissions(staff_id);
CREATE INDEX idx_user_approval_permissions_approval_type ON public.user_approval_permissions(approval_type);
CREATE INDEX idx_user_access_history_staff_id ON public.user_access_history(staff_id);
CREATE INDEX idx_user_access_history_created_at ON public.user_access_history(created_at DESC);