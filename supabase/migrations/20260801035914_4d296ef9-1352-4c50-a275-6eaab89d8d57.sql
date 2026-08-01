-- 1. Replace the view with a real table so it can have its own RLS policy
DROP VIEW IF EXISTS public.website_settings_public;

CREATE TABLE public.website_settings_public (
  id uuid PRIMARY KEY,
  hospital_name text,
  logo_url text,
  banner_url text,
  phone text,
  location text,
  operating_hours text,
  hero_headline text,
  hero_tagline text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

GRANT SELECT ON public.website_settings_public TO anon;
GRANT SELECT ON public.website_settings_public TO authenticated;
GRANT ALL ON public.website_settings_public TO service_role;
ALTER TABLE public.website_settings_public ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active website settings"
ON public.website_settings_public
FOR SELECT
TO public
USING (is_active = true);

-- 2. Restrict website_settings SELECT to admin/manager
DROP POLICY IF EXISTS "Authenticated users can view website settings" ON public.website_settings;

CREATE POLICY "Admins and managers can view website settings"
ON public.website_settings
FOR SELECT
TO public
USING (
  is_active = true
  AND (
    has_designation(auth.uid(), 'admin')
    OR has_designation(auth.uid(), 'manager')
  )
);

-- 3. Sync public table from website_settings
CREATE OR REPLACE FUNCTION public.sync_website_settings_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.website_settings_public (
      id, hospital_name, logo_url, banner_url, phone, location, operating_hours,
      hero_headline, hero_tagline, is_active, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.hospital_name, NEW.logo_url, NEW.banner_url, NEW.phone, NEW.location,
      NEW.operating_hours, NEW.hero_headline, NEW.hero_tagline, NEW.is_active,
      NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      hospital_name = EXCLUDED.hospital_name,
      logo_url = EXCLUDED.logo_url,
      banner_url = EXCLUDED.banner_url,
      phone = EXCLUDED.phone,
      location = EXCLUDED.location,
      operating_hours = EXCLUDED.operating_hours,
      hero_headline = EXCLUDED.hero_headline,
      hero_tagline = EXCLUDED.hero_tagline,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.website_settings_public (
      id, hospital_name, logo_url, banner_url, phone, location, operating_hours,
      hero_headline, hero_tagline, is_active, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.hospital_name, NEW.logo_url, NEW.banner_url, NEW.phone, NEW.location,
      NEW.operating_hours, NEW.hero_headline, NEW.hero_tagline, NEW.is_active,
      NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      hospital_name = EXCLUDED.hospital_name,
      logo_url = EXCLUDED.logo_url,
      banner_url = EXCLUDED.banner_url,
      phone = EXCLUDED.phone,
      location = EXCLUDED.location,
      operating_hours = EXCLUDED.operating_hours,
      hero_headline = EXCLUDED.hero_headline,
      hero_tagline = EXCLUDED.hero_tagline,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.website_settings_public WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_website_settings_public ON public.website_settings;
CREATE TRIGGER sync_website_settings_public
AFTER INSERT OR UPDATE OR DELETE ON public.website_settings
FOR EACH ROW
EXECUTE FUNCTION public.sync_website_settings_public();

GRANT EXECUTE ON FUNCTION public.sync_website_settings_public() TO authenticated;

-- 4. Seed the public table from current website_settings
INSERT INTO public.website_settings_public (
  id, hospital_name, logo_url, banner_url, phone, location, operating_hours,
  hero_headline, hero_tagline, is_active, created_at, updated_at
)
SELECT
  id, hospital_name, logo_url, banner_url, phone, location, operating_hours,
  hero_headline, hero_tagline, is_active, created_at, updated_at
FROM public.website_settings
ON CONFLICT (id) DO UPDATE SET
  hospital_name = EXCLUDED.hospital_name,
  logo_url = EXCLUDED.logo_url,
  banner_url = EXCLUDED.banner_url,
  phone = EXCLUDED.phone,
  location = EXCLUDED.location,
  operating_hours = EXCLUDED.operating_hours,
  hero_headline = EXCLUDED.hero_headline,
  hero_tagline = EXCLUDED.hero_tagline,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

-- 5. Trigger function to keep updated_at current on public table
CREATE OR REPLACE FUNCTION public.update_website_settings_public_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_website_settings_public_updated_at ON public.website_settings_public;
CREATE TRIGGER update_website_settings_public_updated_at
BEFORE UPDATE ON public.website_settings_public
FOR EACH ROW
EXECUTE FUNCTION public.update_website_settings_public_updated_at();

GRANT EXECUTE ON FUNCTION public.update_website_settings_public_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_website_settings_public_updated_at() TO service_role;