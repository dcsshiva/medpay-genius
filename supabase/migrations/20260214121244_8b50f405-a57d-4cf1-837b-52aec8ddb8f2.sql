
-- Create sidebar_menu_config table
CREATE TABLE public.sidebar_menu_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id text NOT NULL UNIQUE,
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sidebar_menu_config ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed to know which items to show)
CREATE POLICY "Authenticated users can read menu config"
ON public.sidebar_menu_config
FOR SELECT
TO authenticated
USING (true);

-- Admins can manage menu config
CREATE POLICY "Admins can manage menu config"
ON public.sidebar_menu_config
FOR ALL
USING (has_designation(auth.uid(), 'admin'::app_designation))
WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation));

-- Super admins can manage menu config
CREATE POLICY "Super admins can manage menu config"
ON public.sidebar_menu_config
FOR ALL
USING (has_designation(auth.uid(), 'super_admin'::app_designation))
WITH CHECK (has_designation(auth.uid(), 'super_admin'::app_designation));
