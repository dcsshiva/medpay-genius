-- Phase 0: Security Foundation
-- Creating new designation system to replace profile-based roles

-- 1. Create app_designation enum
CREATE TYPE public.app_designation AS ENUM ('admin', 'manager', 'supervisor', 'doctor', 'staff');

-- 2. Create user_designations table
CREATE TABLE public.user_designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  designation public.app_designation NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, designation)
);

-- Enable RLS
ALTER TABLE public.user_designations ENABLE ROW LEVEL SECURITY;

-- 3. Create staff_categories table
CREATE TABLE public.staff_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_categories ENABLE ROW LEVEL SECURITY;

-- Pre-populate staff categories
INSERT INTO public.staff_categories (category_name, description, display_order) VALUES
  ('Nurse', 'Registered nurses and nursing staff', 1),
  ('Receptionist', 'Front desk and patient coordination', 2),
  ('Technician', 'Medical technicians and lab staff', 3),
  ('Pharmacist', 'Pharmacy and medication management', 4),
  ('Cleaner', 'Housekeeping and sanitation staff', 5),
  ('Security', 'Security and safety personnel', 6);

-- 4. Create has_designation() security definer function for RLS
CREATE OR REPLACE FUNCTION public.has_designation(_user_id UUID, _designation app_designation)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_designations
    WHERE user_id = _user_id
      AND designation = _designation
  )
$$;

-- 5. Apply RLS policies using the security definer function
-- Policy: Users can view their own designations
CREATE POLICY "Users can view their own designations"
ON public.user_designations
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can manage all designations
CREATE POLICY "Admins can manage all designations"
ON public.user_designations
FOR ALL
USING (public.has_designation(auth.uid(), 'admin'));

-- Policy: Anyone can view active staff categories
CREATE POLICY "Anyone can view active staff categories"
ON public.staff_categories
FOR SELECT
USING (is_active = true);

-- Policy: Only admins can manage staff categories
CREATE POLICY "Admins can manage staff categories"
ON public.staff_categories
FOR ALL
USING (public.has_designation(auth.uid(), 'admin'));

-- 6. Migrate existing data from profiles to user_designations
-- Migrate admin and manager profiles
INSERT INTO public.user_designations (user_id, designation)
SELECT user_id, role::text::app_designation
FROM public.profiles
WHERE role IN ('admin', 'manager')
  AND user_id IS NOT NULL
ON CONFLICT (user_id, designation) DO NOTHING;

-- Migrate doctors (profiles linked to doctors table)
INSERT INTO public.user_designations (user_id, designation)
SELECT p.user_id, 'doctor'::app_designation
FROM public.profiles p
INNER JOIN public.doctors d ON d.profile_id = p.id
WHERE p.user_id IS NOT NULL
ON CONFLICT (user_id, designation) DO NOTHING;

-- Migrate staff (profiles linked to staff table)
INSERT INTO public.user_designations (user_id, designation)
SELECT p.user_id, 'staff'::app_designation
FROM public.profiles p
INNER JOIN public.staff s ON s.profile_id = p.id
WHERE p.user_id IS NOT NULL
ON CONFLICT (user_id, designation) DO NOTHING;

-- 7. Create triggers for updated_at timestamps
CREATE TRIGGER update_user_designations_updated_at
  BEFORE UPDATE ON public.user_designations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_categories_updated_at
  BEFORE UPDATE ON public.staff_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();