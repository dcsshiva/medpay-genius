
CREATE TABLE public.quick_access_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mode text NOT NULL DEFAULT 'analytics' CHECK (mode IN ('analytics', 'manual')),
  manual_items jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default row
INSERT INTO public.quick_access_config (mode, manual_items, is_active) 
VALUES ('analytics', '[]', true);

-- Enable RLS
ALTER TABLE public.quick_access_config ENABLE ROW LEVEL SECURITY;

-- Read policy for all authenticated users
CREATE POLICY "Anyone authenticated can read quick access config" ON public.quick_access_config
  FOR SELECT USING (true);

-- Write policy for admin/super_admin only
CREATE POLICY "Admins can manage quick access config" ON public.quick_access_config
  FOR ALL USING (has_designation(auth.uid(), 'admin'::app_designation))
  WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Super admins can manage quick access config" ON public.quick_access_config
  FOR ALL USING (has_designation(auth.uid(), 'super_admin'::app_designation))
  WITH CHECK (has_designation(auth.uid(), 'super_admin'::app_designation));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_access_config;
