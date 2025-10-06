-- Phase 1: Schema Transformation
-- This migration fixes the duplicate profile error and restructures the database

-- Step 1: Add new columns to doctors table
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Step 2: Add new columns to staff table
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_category_id UUID REFERENCES public.staff_categories(id);

-- Step 3: Migrate existing data - link doctors to auth.users
UPDATE public.doctors d
SET user_id = p.user_id,
    full_name = p.full_name
FROM public.profiles p
WHERE d.profile_id = p.id AND p.user_id IS NOT NULL;

-- Step 4: Migrate existing data - link staff to auth.users
UPDATE public.staff s
SET user_id = p.user_id
FROM public.profiles p
WHERE s.profile_id = p.id AND p.user_id IS NOT NULL;

-- Step 5: Drop the problematic handle_new_user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 6: Create prevent_dual_user_type trigger
CREATE OR REPLACE FUNCTION public.prevent_dual_user_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user_id already exists in doctors table
  IF EXISTS (SELECT 1 FROM public.doctors WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'User is already registered as a doctor';
  END IF;
  
  -- Check if user_id already exists in staff table
  IF EXISTS (SELECT 1 FROM public.staff WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'User is already registered as staff';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to doctors table
DROP TRIGGER IF EXISTS prevent_dual_user_type_doctors ON public.doctors;
CREATE TRIGGER prevent_dual_user_type_doctors
  BEFORE INSERT OR UPDATE OF user_id ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_dual_user_type();

-- Apply trigger to staff table
DROP TRIGGER IF EXISTS prevent_dual_user_type_staff ON public.staff;
CREATE TRIGGER prevent_dual_user_type_staff
  BEFORE INSERT OR UPDATE OF user_id ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_dual_user_type();

-- Step 7: Update RLS policies for doctors table
DROP POLICY IF EXISTS "Doctors can view their own record" ON public.doctors;
DROP POLICY IF EXISTS "Managers and admins can view all doctors" ON public.doctors;
DROP POLICY IF EXISTS "Admins can manage doctors" ON public.doctors;

CREATE POLICY "Doctors can view their own record"
  ON public.doctors
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Managers and admins can view all doctors"
  ON public.doctors
  FOR SELECT
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

CREATE POLICY "Admins can manage doctors"
  ON public.doctors
  FOR ALL
  USING (has_designation(auth.uid(), 'admin'::app_designation));

-- Step 8: Update RLS policies for staff table
DROP POLICY IF EXISTS "Admins can manage all staff" ON public.staff;
DROP POLICY IF EXISTS "Managers can view all staff" ON public.staff;
DROP POLICY IF EXISTS "Managers can update staff records" ON public.staff;
DROP POLICY IF EXISTS "Staff can view their own record" ON public.staff;
DROP POLICY IF EXISTS "Staff can update their own record" ON public.staff;

CREATE POLICY "Admins can manage all staff"
  ON public.staff
  FOR ALL
  USING (has_designation(auth.uid(), 'admin'::app_designation))
  WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Managers can view all staff"
  ON public.staff
  FOR SELECT
  USING (has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Managers can update staff records"
  ON public.staff
  FOR UPDATE
  USING (has_designation(auth.uid(), 'manager'::app_designation))
  WITH CHECK (has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Staff can view their own record"
  ON public.staff
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Staff can update their own record"
  ON public.staff
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Step 9: Update get_user_visits function
CREATE OR REPLACE FUNCTION public.get_user_visits(_user_type text, _user_id uuid, _user_role text)
RETURNS TABLE(
  id uuid, visit_date date, patient_count integer, patient_id text, 
  patient_name text, visit_payment numeric, payment_type text, 
  visit_reason text, notes text, doctor_id uuid, doctor_code text, 
  doctor_name text, is_processed boolean, processed_in_payment_id uuid, 
  processed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Doctors can only see their own visits
  IF _user_type = 'doctor' THEN
    RETURN QUERY
    SELECT 
      v.id, v.visit_date, v.patient_count, v.patient_id, v.patient_name,
      v.visit_payment, v.payment_type, v.visit_reason, v.notes, v.doctor_id,
      d.doctor_code, COALESCE(d.full_name, 'Doctor') as doctor_name,
      v.is_processed, v.processed_in_payment_id, v.processed_at
    FROM visits v
    JOIN doctors d ON v.doctor_id = d.id
    WHERE d.user_id = _user_id
    ORDER BY v.visit_date DESC;
  -- Admins and managers can see all visits  
  ELSIF _user_role IN ('admin', 'manager') THEN
    RETURN QUERY
    SELECT 
      v.id, v.visit_date, v.patient_count, v.patient_id, v.patient_name,
      v.visit_payment, v.payment_type, v.visit_reason, v.notes, v.doctor_id,
      d.doctor_code, COALESCE(d.full_name, 'Doctor') as doctor_name,
      v.is_processed, v.processed_in_payment_id, v.processed_at
    FROM visits v
    JOIN doctors d ON v.doctor_id = d.id
    ORDER BY v.visit_date DESC;
  END IF;
END;
$$;

-- Step 10: Update get_user_payments function
CREATE OR REPLACE FUNCTION public.get_user_payments(_user_type text, _user_id uuid, _user_role text)
RETURNS TABLE(
  id uuid, period_start date, period_end date, total_visits integer,
  total_amount numeric, paid_amount numeric, remaining_amount numeric, 
  is_fully_paid boolean, payment_notes text, status text, 
  manager_approved_by uuid, manager_approved_at timestamp with time zone,
  admin_approved_by uuid, admin_approved_at timestamp with time zone,
  rejected_by uuid, rejected_at timestamp with time zone, 
  rejection_reason text, doctor_id uuid, doctor_code text, doctor_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Doctors can only see their own payments
  IF _user_type = 'doctor' THEN
    RETURN QUERY
    SELECT 
      p.id, p.period_start, p.period_end, p.total_visits,
      p.total_amount, p.paid_amount, p.remaining_amount, p.is_fully_paid,
      p.payment_notes, p.status::text, p.manager_approved_by, p.manager_approved_at,
      p.admin_approved_by, p.admin_approved_at, p.rejected_by, p.rejected_at,
      p.rejection_reason, p.doctor_id, d.doctor_code, 
      COALESCE(d.full_name, 'Doctor') as doctor_name
    FROM payments p
    JOIN doctors d ON p.doctor_id = d.id
    WHERE d.user_id = _user_id
    ORDER BY p.created_at DESC;
  -- Admins and managers can see all payments  
  ELSIF _user_role IN ('admin', 'manager') THEN
    RETURN QUERY
    SELECT 
      p.id, p.period_start, p.period_end, p.total_visits,
      p.total_amount, p.paid_amount, p.remaining_amount, p.is_fully_paid,
      p.payment_notes, p.status::text, p.manager_approved_by, p.manager_approved_at,
      p.admin_approved_by, p.admin_approved_at, p.rejected_by, p.rejected_at,
      p.rejection_reason, p.doctor_id, d.doctor_code, 
      COALESCE(d.full_name, 'Doctor') as doctor_name
    FROM payments p
    JOIN doctors d ON p.doctor_id = d.id
    ORDER BY p.created_at DESC;
  END IF;
END;
$$;

-- Step 11: Update verify_user_login function to use new schema
CREATE OR REPLACE FUNCTION public.verify_user_login(_username text, _password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  staff_row public.staff%ROWTYPE;
  doctor_row public.doctors%ROWTYPE;
  hashed text;
  result jsonb := NULL;
BEGIN
  -- Try staff first
  SELECT * INTO staff_row
  FROM public.staff
  WHERE username = _username AND is_active = true
  LIMIT 1;

  IF staff_row.id IS NOT NULL THEN
    SELECT public.simple_hash(_password) INTO hashed;
    IF staff_row.password_hash = _password OR staff_row.password_hash = hashed THEN
      result := jsonb_build_object(
        'user_type', 'staff',
        'id', staff_row.user_id,
        'full_name', staff_row.full_name,
        'role', COALESCE(staff_row.role::text, 'staff')
      );
      RETURN result;
    ELSE
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  END IF;

  -- Then try doctor by doctor_code
  SELECT * INTO doctor_row
  FROM public.doctors
  WHERE doctor_code = _username AND is_active = true
  LIMIT 1;

  IF doctor_row.id IS NOT NULL THEN
    SELECT public.simple_hash(_password) INTO hashed;
    IF doctor_row.password_hash = hashed THEN
      result := jsonb_build_object(
        'user_type', 'doctor',
        'id', doctor_row.user_id,
        'full_name', COALESCE(doctor_row.full_name, 'Doctor'),
        'role', 'doctor'
      );
      RETURN result;
    ELSE
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  END IF;

  RETURN jsonb_build_object('error', 'not_found');
END;
$$;

-- Step 12: Update link_profile_to_user function (now deprecated but kept for backwards compatibility)
CREATE OR REPLACE FUNCTION public.link_profile_to_user(_user_type text, _original_id uuid, _auth_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function is now deprecated as we link directly to auth.users
  -- Kept for backwards compatibility
  IF _user_type = 'doctor' THEN
    UPDATE public.doctors
    SET user_id = _auth_user_id
    WHERE id = _original_id;
  ELSIF _user_type = 'staff' THEN
    UPDATE public.staff
    SET user_id = _auth_user_id
    WHERE id = _original_id;
  ELSE
    RAISE EXCEPTION 'Unknown user type: %', _user_type;
  END IF;
END;
$$;

-- Step 13: Update RLS policies for visits
DROP POLICY IF EXISTS "Doctors can view their own visits" ON public.visits;
DROP POLICY IF EXISTS "Managers and admins can view all visits" ON public.visits;
DROP POLICY IF EXISTS "Managers and admins can manage all visits" ON public.visits;

CREATE POLICY "Doctors can view their own visits"
  ON public.visits
  FOR SELECT
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Managers and admins can view all visits"
  ON public.visits
  FOR SELECT
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

CREATE POLICY "Managers and admins can manage all visits"
  ON public.visits
  FOR ALL
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

-- Step 14: Update RLS policies for payments
DROP POLICY IF EXISTS "Doctors can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Managers can view and approve payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;

CREATE POLICY "Doctors can view their own payments"
  ON public.payments
  FOR SELECT
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Managers can view and approve payments"
  ON public.payments
  FOR ALL
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

CREATE POLICY "Admins can manage all payments"
  ON public.payments
  FOR ALL
  USING (has_designation(auth.uid(), 'admin'::app_designation));

-- Step 15: Update RLS policies for tasks
DROP POLICY IF EXISTS "Staff can view their assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff can update their assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins and managers can manage all tasks" ON public.tasks;

CREATE POLICY "Staff can view their assigned tasks"
  ON public.tasks
  FOR SELECT
  USING (assigned_to IN (SELECT id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can update their assigned tasks"
  ON public.tasks
  FOR UPDATE
  USING (assigned_to IN (SELECT id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Admins and managers can manage all tasks"
  ON public.tasks
  FOR ALL
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

-- Step 16: Update RLS policies for complaints
DROP POLICY IF EXISTS "Admins can manage all complaints" ON public.complaints;
DROP POLICY IF EXISTS "Staff can create complaints" ON public.complaints;
DROP POLICY IF EXISTS "Staff can view their own complaints" ON public.complaints;

CREATE POLICY "Admins can manage all complaints"
  ON public.complaints
  FOR ALL
  USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Staff can create complaints"
  ON public.complaints
  FOR INSERT
  WITH CHECK (raised_by IN (SELECT id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Staff can view their own complaints"
  ON public.complaints
  FOR SELECT
  USING (raised_by IN (SELECT id FROM staff WHERE user_id = auth.uid()));

-- Step 17: Update RLS policies for messages
DROP POLICY IF EXISTS "Staff, managers, and admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Staff, managers, and admins can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Staff, managers, and admins can view all messages"
  ON public.messages
  FOR SELECT
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

CREATE POLICY "Staff, managers, and admins can create messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    (has_designation(auth.uid(), 'admin'::app_designation) OR 
     has_designation(auth.uid(), 'manager'::app_designation)) AND 
    sender_id = auth.uid()
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid());