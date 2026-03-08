
-- FIX #5: Website settings - drop public, add authenticated
DROP POLICY IF EXISTS "Anyone can view website settings" ON public.website_settings;

CREATE OR REPLACE VIEW public.website_settings_public
WITH (security_invoker = on) AS
  SELECT 
    id, hospital_name, logo_url, banner_url, phone, location,
    operating_hours, hero_headline, hero_tagline, is_active,
    created_at, updated_at
  FROM public.website_settings;

CREATE POLICY "Authenticated users can view website settings"
  ON public.website_settings FOR SELECT
  TO authenticated
  USING (is_active = true);

-- FIX #6: app_downloads user_metadata reference
DROP POLICY IF EXISTS "Only admins can manage app downloads" ON public.app_downloads;

CREATE POLICY "Only admins can manage app downloads"
  ON public.app_downloads FOR ALL
  TO authenticated
  USING (has_designation(auth.uid(), 'admin'::app_designation))
  WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation));

-- FIX #7: version_history permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert version history" ON public.version_history;
DROP POLICY IF EXISTS "Authenticated users can update version history" ON public.version_history;

CREATE POLICY "Admins can insert version history"
  ON public.version_history FOR INSERT
  TO authenticated
  WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Admins can update version history"
  ON public.version_history FOR UPDATE
  TO authenticated
  USING (has_designation(auth.uid(), 'admin'::app_designation))
  WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation));

-- FIX #8: Messages readable by doctors
DROP POLICY IF EXISTS "Staff users can read messages" ON public.messages;

CREATE POLICY "Staff and admins can read messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    has_designation(auth.uid(), 'admin'::app_designation)
    OR has_designation(auth.uid(), 'manager'::app_designation)
    OR has_designation(auth.uid(), 'staff'::app_designation)
  );
