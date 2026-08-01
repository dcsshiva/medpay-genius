-- Fix 1: app-downloads storage upload policy should use server-side role check, not user_metadata
DROP POLICY IF EXISTS "Only admins can upload app downloads" ON storage.objects;

CREATE POLICY "Only admins can upload app downloads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'app-downloads'
  AND has_designation(auth.uid(), 'admin')
);

-- Fix 2: remove broad staff read policy and ensure only admins, managers, super admins, and self can view staff
DROP POLICY IF EXISTS "Authenticated users can view staff basic info" ON public.staff;

-- Make sure the existing self-view policy covers non-admin staff reading their own record
DROP POLICY IF EXISTS "Staff can view their own record" ON public.staff;
CREATE POLICY "Staff can view their own record"
ON public.staff
FOR SELECT
TO public
USING (user_id = auth.uid());

-- Fix 3: remove broad vendor read policy; admins, managers, and super admins already have ALL policies
DROP POLICY IF EXISTS "Authenticated users can view active vendors" ON public.vendors;