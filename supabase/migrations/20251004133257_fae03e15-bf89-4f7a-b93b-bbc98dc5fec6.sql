-- Create website_settings table for storing all editable landing page content
CREATE TABLE public.website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Information
  phone TEXT,
  emergency_contact TEXT,
  location TEXT,
  operating_hours TEXT,
  
  -- Services
  emergency_care_description TEXT,
  specialist_care_description TEXT,
  health_checkups_description TEXT,
  
  -- About Section
  about_paragraph_1 TEXT,
  about_paragraph_2 TEXT,
  
  -- Why Choose Us (JSON array of objects with title and description)
  why_choose_us JSONB DEFAULT '[]'::jsonb,
  
  -- Hero Section
  hero_headline TEXT,
  hero_tagline TEXT,
  book_appointment_text TEXT DEFAULT 'Book Appointment',
  emergency_button_text TEXT DEFAULT 'Emergency Contact',
  
  -- Branding
  hospital_name TEXT DEFAULT 'WestMed Hospital',
  logo_url TEXT,
  banner_url TEXT,
  
  -- Statistics
  years_of_service INTEGER DEFAULT 25,
  expert_doctors INTEGER DEFAULT 50,
  patients_served TEXT DEFAULT '50K+',
  patient_rating NUMERIC(2,1) DEFAULT 4.9,
  
  -- Footer
  copyright_text TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Only one active settings record allowed
CREATE UNIQUE INDEX unique_active_settings ON public.website_settings(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can view website settings"
  ON public.website_settings
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage website settings"
  ON public.website_settings
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Create trigger to update updated_at
CREATE TRIGGER update_website_settings_updated_at
  BEFORE UPDATE ON public.website_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO public.website_settings (
  phone,
  emergency_contact,
  location,
  operating_hours,
  emergency_care_description,
  specialist_care_description,
  health_checkups_description,
  about_paragraph_1,
  about_paragraph_2,
  why_choose_us,
  hero_headline,
  hero_tagline,
  copyright_text
) VALUES (
  '+1 (555) 123-4567',
  '911 or +1 (555) 999-8888',
  '123 Medical Center Drive, Healthcare City, HC 12345',
  'Monday - Friday: 8:00 AM - 8:00 PM, Saturday: 9:00 AM - 5:00 PM, Sunday: Closed',
  '24/7 emergency care with state-of-the-art facilities and experienced medical professionals ready to handle any critical situation.',
  'Our team of specialist doctors provides expert care across multiple medical disciplines including cardiology, neurology, orthopedics, and more.',
  'Comprehensive health screening packages designed to detect potential health issues early and keep you in optimal health.',
  'WestMed Hospital has been serving the community for over 25 years with dedication to providing exceptional healthcare services. Our state-of-the-art facility combines advanced medical technology with compassionate care.',
  'We believe in treating not just the illness, but the whole person. Our multidisciplinary team works together to ensure every patient receives personalized, comprehensive care in a comfortable environment.',
  '[
    {"title": "Expert Medical Team", "description": "Board-certified specialists with years of experience"},
    {"title": "Advanced Technology", "description": "State-of-the-art medical equipment and facilities"},
    {"title": "Patient-Centered Care", "description": "Compassionate approach focused on your wellbeing"}
  ]'::jsonb,
  'Your Health, Our Priority',
  'Providing exceptional healthcare services with compassion and expertise',
  '© 2024 WestMed Hospital. All rights reserved.'
);

-- Create storage bucket for website assets (logo, banner)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'website-assets',
  'website-assets',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Storage RLS policies
CREATE POLICY "Public can view website assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'website-assets');

CREATE POLICY "Admins can upload website assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'website-assets' 
    AND get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update website assets"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'website-assets' 
    AND get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can delete website assets"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'website-assets' 
    AND get_user_role(auth.uid()) = 'admin'
  );