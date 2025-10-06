-- Add RLS policy to allow authenticated users to view staff information
-- This enables staff members to see other staff when filing complaints
CREATE POLICY "Authenticated users can view staff basic info"
ON public.staff
FOR SELECT
TO authenticated
USING (true);