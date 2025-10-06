-- Create user_guide_settings table for configurable content
CREATE TABLE IF NOT EXISTS public.user_guide_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean DEFAULT true,
  
  -- Role-specific welcome messages
  welcome_message_admin text DEFAULT 'Welcome to the Hospital Admin Dashboard. This guide will help you manage all aspects of the system.',
  welcome_message_manager text DEFAULT 'Welcome, Manager. Use this guide to manage staff, doctors, and oversee operations.',
  welcome_message_doctor text DEFAULT 'Welcome, Doctor. This guide will help you track visits and payments.',
  welcome_message_staff text DEFAULT 'Welcome, Staff member. This guide covers your daily tasks and responsibilities.',
  
  -- Contact & Support
  help_desk_contact text DEFAULT '+91 1234567890',
  help_desk_email text DEFAULT 'support@westmedhospital.com',
  help_desk_hours text DEFAULT 'Mon-Sat: 9 AM - 6 PM',
  
  -- Dynamic content (JSONB)
  faq_items jsonb DEFAULT '[]'::jsonb,
  tutorial_video_urls jsonb DEFAULT '{}'::jsonb,
  custom_notes jsonb DEFAULT '{}'::jsonb,
  announcement_text text,
  announcement_type text DEFAULT 'info',
  show_announcement boolean DEFAULT false,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_guide_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage user guide settings
CREATE POLICY "Admins can manage user guide settings"
  ON public.user_guide_settings
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- Anyone can view active user guide settings
CREATE POLICY "Anyone can view active user guide settings"
  ON public.user_guide_settings
  FOR SELECT
  USING (is_active = true);

-- Insert default settings
INSERT INTO public.user_guide_settings (is_active) VALUES (true);

-- Trigger to update updated_at
CREATE TRIGGER update_user_guide_settings_updated_at
  BEFORE UPDATE ON public.user_guide_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();