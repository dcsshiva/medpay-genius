-- Fix staff table security issue by adding proper profile relationship
-- Step 1: Add profile_id column to link staff to profiles
ALTER TABLE public.staff 
ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 2: Drop the flawed RLS policy
DROP POLICY IF EXISTS "Staff can view their own record" ON public.staff;

-- Step 3: Create secure RLS policy using proper relationship
CREATE POLICY "Staff can view their own record" 
ON public.staff 
FOR SELECT 
USING (profile_id IN (
  SELECT profiles.id 
  FROM public.profiles 
  WHERE profiles.user_id = auth.uid()
));

-- Step 4: Add policy for staff to update their own records
CREATE POLICY "Staff can update their own record" 
ON public.staff 
FOR UPDATE 
USING (profile_id IN (
  SELECT profiles.id 
  FROM public.profiles 
  WHERE profiles.user_id = auth.uid()
));

-- Step 5: Add unique constraint to ensure one staff record per profile
ALTER TABLE public.staff 
ADD CONSTRAINT staff_profile_id_unique UNIQUE (profile_id);