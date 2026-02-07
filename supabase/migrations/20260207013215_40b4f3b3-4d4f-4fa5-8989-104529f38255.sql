CREATE POLICY "Managers can view all navigation analytics"
ON public.navigation_analytics
FOR SELECT
USING (has_designation(auth.uid(), 'manager'::app_designation));