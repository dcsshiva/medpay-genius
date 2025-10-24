-- Create enums for application types and statuses
CREATE TYPE public.application_type AS ENUM ('leave', 'permission');
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

-- Create the leave_permission_applications table
CREATE TABLE public.leave_permission_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  application_type application_type NOT NULL,
  status application_status NOT NULL DEFAULT 'pending',
  approver_id UUID NOT NULL REFERENCES public.staff(id),
  reason_details TEXT NOT NULL,
  notes TEXT,
  
  -- Leave-specific fields
  leave_start_date DATE,
  leave_end_date DATE,
  leave_days NUMERIC,
  leave_reason TEXT,
  is_half_day BOOLEAN DEFAULT false,
  
  -- Permission-specific fields
  permission_date DATE,
  permission_start_time TIME,
  permission_end_time TIME,
  permission_duration_minutes INTEGER,
  permission_reason TEXT,
  
  -- Approval tracking
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.staff(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES public.staff(id),
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_permission_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view their own applications"
  ON public.leave_permission_applications
  FOR SELECT
  USING (
    applicant_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Approvers can view applications assigned to them"
  ON public.leave_permission_applications
  FOR SELECT
  USING (
    approver_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can create their own applications"
  ON public.leave_permission_applications
  FOR INSERT
  WITH CHECK (
    applicant_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Approvers can update applications assigned to them"
  ON public.leave_permission_applications
  FOR UPDATE
  USING (
    approver_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all applications"
  ON public.leave_permission_applications
  FOR ALL
  USING (
    has_designation(auth.uid(), 'admin'::app_designation)
  );

-- Create indexes for performance
CREATE INDEX idx_leave_perm_applicant ON public.leave_permission_applications(applicant_id);
CREATE INDEX idx_leave_perm_approver ON public.leave_permission_applications(approver_id);
CREATE INDEX idx_leave_perm_status ON public.leave_permission_applications(status);
CREATE INDEX idx_leave_perm_type ON public.leave_permission_applications(application_type);
CREATE INDEX idx_leave_perm_applicant_status ON public.leave_permission_applications(applicant_id, status);

-- Create updated_at trigger
CREATE TRIGGER update_leave_permission_applications_updated_at
  BEFORE UPDATE ON public.leave_permission_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Validation function for leave applications
CREATE OR REPLACE FUNCTION public.validate_leave_application(
  _applicant_id UUID,
  _start_date DATE,
  _end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overlapping_count INTEGER;
BEGIN
  -- Check if end date is before start date
  IF _end_date < _start_date THEN
    RETURN jsonb_build_object('valid', false, 'error', 'End date cannot be before start date');
  END IF;
  
  -- Check for overlapping pending or approved leave applications
  SELECT COUNT(*) INTO overlapping_count
  FROM public.leave_permission_applications
  WHERE applicant_id = _applicant_id
    AND application_type = 'leave'
    AND status IN ('pending', 'approved')
    AND (
      (leave_start_date <= _end_date AND leave_end_date >= _start_date)
    );
  
  IF overlapping_count > 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You already have a leave application for overlapping dates');
  END IF;
  
  -- All validations passed
  RETURN jsonb_build_object('valid', true, 'error', NULL);
END;
$$;

-- Validation function for permission applications
CREATE OR REPLACE FUNCTION public.validate_permission_application(
  _applicant_id UUID,
  _permission_date DATE,
  _start_time TIME,
  _end_time TIME,
  _duration_minutes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overlapping_count INTEGER;
BEGIN
  -- Check if duration is within allowed limits (0-120 minutes)
  IF _duration_minutes <= 0 OR _duration_minutes > 120 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Permission duration must be between 1 and 120 minutes');
  END IF;
  
  -- Check if end time is before start time
  IF _end_time <= _start_time THEN
    RETURN jsonb_build_object('valid', false, 'error', 'End time must be after start time');
  END IF;
  
  -- Check for overlapping pending or approved permission applications on the same date
  SELECT COUNT(*) INTO overlapping_count
  FROM public.leave_permission_applications
  WHERE applicant_id = _applicant_id
    AND application_type = 'permission'
    AND status IN ('pending', 'approved')
    AND permission_date = _permission_date
    AND (
      (permission_start_time < _end_time AND permission_end_time > _start_time)
    );
  
  IF overlapping_count > 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You already have a permission application for overlapping times on this date');
  END IF;
  
  -- All validations passed
  RETURN jsonb_build_object('valid', true, 'error', NULL);
END;
$$;