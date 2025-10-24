-- Fix migration by dropping and recreating functions with updated parameter names

-- 1) Leave validation: drop old signature then create with desired param names
DROP FUNCTION IF EXISTS public.validate_leave_application(uuid, date, date);

CREATE FUNCTION public.validate_leave_application(
  _applicant_id uuid,
  _leave_start_date date,
  _leave_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  overlapping_count INTEGER;
BEGIN
  -- Check if end date is before start date
  IF _leave_end_date < _leave_start_date THEN
    RETURN jsonb_build_object('valid', false, 'error', 'End date cannot be before start date');
  END IF;
  
  -- Check for overlapping pending or approved leave applications
  SELECT COUNT(*) INTO overlapping_count
  FROM public.leave_permission_applications
  WHERE applicant_id = _applicant_id
    AND application_type = 'leave'
    AND status IN ('pending', 'approved')
    AND (
      (leave_start_date <= _leave_end_date AND leave_end_date >= _leave_start_date)
    );
  
  IF overlapping_count > 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You already have a leave application for overlapping dates');
  END IF;
  
  -- All validations passed
  RETURN jsonb_build_object('valid', true, 'error', NULL);
END;
$function$;

-- 2) Permission validation: drop old signature and recreate simplified version
DROP FUNCTION IF EXISTS public.validate_permission_application(uuid, date, time without time zone, time without time zone, integer);

CREATE FUNCTION public.validate_permission_application(
  _applicant_id uuid,
  _permission_date date,
  _duration_minutes integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  overlapping_count INTEGER;
BEGIN
  -- Check if duration is within allowed limits (1-120 minutes)
  IF _duration_minutes <= 0 OR _duration_minutes > 120 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Permission duration must be between 1 and 120 minutes');
  END IF;
  
  -- Since times are not provided by the client, enforce one permission per day
  SELECT COUNT(*) INTO overlapping_count
  FROM public.leave_permission_applications
  WHERE applicant_id = _applicant_id
    AND application_type = 'permission'
    AND status IN ('pending', 'approved')
    AND permission_date = _permission_date;
  
  IF overlapping_count > 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You already have a permission application on this date');
  END IF;
  
  -- All validations passed
  RETURN jsonb_build_object('valid', true, 'error', NULL);
END;
$function$;