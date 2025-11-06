-- ====================================================================
-- PHASE 1: SAFE ROLE SYSTEM CLEANUP & CONSOLIDATION
-- This migration safely consolidates user roles/designations
-- Making user_designations the single source of truth
-- ====================================================================

-- Step 1: BACKUP DATA - Ensure all user_designations exist before any changes
-- Migrate any missing designations from staff table
INSERT INTO public.user_designations (user_id, designation)
SELECT DISTINCT s.user_id, 
  CASE 
    WHEN s.role = 'admin' THEN 'admin'::app_designation
    WHEN s.role = 'manager' THEN 'manager'::app_designation
    ELSE 'staff'::app_designation
  END as designation
FROM public.staff s
WHERE s.user_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_designations ud 
    WHERE ud.user_id = s.user_id
  )
ON CONFLICT (user_id, designation) DO NOTHING;

-- Migrate any missing designations from doctors table
INSERT INTO public.user_designations (user_id, designation)
SELECT DISTINCT d.user_id, 'doctor'::app_designation
FROM public.doctors d
WHERE d.user_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_designations ud 
    WHERE ud.user_id = d.user_id
  )
ON CONFLICT (user_id, designation) DO NOTHING;

-- Step 2: CREATE CONSISTENCY TRIGGERS
-- Automatically create user_designations when staff is created
CREATE OR REPLACE FUNCTION public.sync_staff_designation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create designation if user_id is set and doesn't already exist
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.user_designations (user_id, designation)
    VALUES (
      NEW.user_id,
      CASE 
        WHEN NEW.role IN ('admin', 'manager') THEN NEW.role::text::app_designation
        ELSE 'staff'::app_designation
      END
    )
    ON CONFLICT (user_id, designation) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for staff insertions
DROP TRIGGER IF EXISTS sync_staff_designation_trigger ON public.staff;
CREATE TRIGGER sync_staff_designation_trigger
  AFTER INSERT ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_staff_designation();

-- Automatically create user_designations when doctor is created
CREATE OR REPLACE FUNCTION public.sync_doctor_designation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create designation if user_id is set and doesn't already exist
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.user_designations (user_id, designation)
    VALUES (NEW.user_id, 'doctor'::app_designation)
    ON CONFLICT (user_id, designation) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for doctor insertions
DROP TRIGGER IF EXISTS sync_doctor_designation_trigger ON public.doctors;
CREATE TRIGGER sync_doctor_designation_trigger
  AFTER INSERT ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_doctor_designation();

-- Step 3: PREVENT ORPHANED USER_DESIGNATIONS
-- Prevent deletion of user_designations if referenced user still exists
CREATE OR REPLACE FUNCTION public.prevent_user_designation_orphan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When deleting user_designations, ensure no active staff/doctor exists
  IF EXISTS (
    SELECT 1 FROM public.staff WHERE user_id = OLD.user_id
    UNION ALL
    SELECT 1 FROM public.doctors WHERE user_id = OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete user designation while active staff/doctor record exists';
  END IF;
  RETURN OLD;
END;
$$;

-- Trigger to prevent orphaned designations
DROP TRIGGER IF EXISTS prevent_designation_orphan_trigger ON public.user_designations;
CREATE TRIGGER prevent_designation_orphan_trigger
  BEFORE DELETE ON public.user_designations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_designation_orphan();

-- Step 4: ADD HELPFUL COMMENTS
COMMENT ON TABLE public.user_designations IS 
'SINGLE SOURCE OF TRUTH for user roles/designations. 
Do NOT use profiles.role or staff.role for authorization decisions.';

COMMENT ON COLUMN public.staff.role IS 
'DEPRECATED: For display purposes only. Use user_designations table for authorization.';

COMMENT ON FUNCTION public.has_designation(uuid, app_designation) IS 
'Primary authorization function. Checks user_designations table (single source of truth).';

-- Step 5: CREATE HELPER FUNCTION FOR USER PROFILE
CREATE OR REPLACE FUNCTION public.get_user_complete_profile(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  designation_val app_designation;
  profile_data jsonb;
BEGIN
  -- Get the user's primary designation
  SELECT designation INTO designation_val
  FROM public.user_designations
  WHERE user_id = _user_id
  LIMIT 1;

  IF designation_val IS NULL THEN
    RETURN jsonb_build_object('error', 'User designation not found');
  END IF;

  -- Get profile based on designation
  IF designation_val = 'doctor' THEN
    SELECT jsonb_build_object(
      'designation', designation_val,
      'user_id', d.user_id,
      'id', d.id,
      'code', d.doctor_code,
      'full_name', d.full_name,
      'specialization', d.specialization,
      'is_active', d.is_active,
      'bank_details', jsonb_build_object(
        'account_number', d.bank_account_number,
        'account_holder_name', d.account_holder_name,
        'bank_name', d.bank_name,
        'branch_name', d.branch_name,
        'ifsc_code', d.ifsc_code,
        'pan_number', d.pan_number
      )
    ) INTO profile_data
    FROM public.doctors d
    WHERE d.user_id = _user_id
    LIMIT 1;
  ELSE
    SELECT jsonb_build_object(
      'designation', designation_val,
      'user_id', s.user_id,
      'id', s.id,
      'code', s.staff_code,
      'full_name', s.full_name,
      'username', s.username,
      'role', s.role,
      'department', s.department,
      'is_active', s.is_active,
      'email', s.email,
      'phone', s.phone,
      'bank_details', jsonb_build_object(
        'account_number', s.bank_account_number,
        'account_holder_name', s.account_holder_name,
        'bank_name', s.bank_name,
        'branch_name', s.branch_name,
        'ifsc_code', s.ifsc_code
      )
    ) INTO profile_data
    FROM public.staff s
    WHERE s.user_id = _user_id
    LIMIT 1;
  END IF;

  RETURN COALESCE(profile_data, jsonb_build_object('error', 'Profile not found'));
END;
$$;

COMMENT ON FUNCTION public.get_user_complete_profile(uuid) IS 
'Returns complete user profile based on their designation. 
Single consolidated view of user data regardless of type (staff/doctor).';