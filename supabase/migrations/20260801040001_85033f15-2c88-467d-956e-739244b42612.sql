-- Add missing public landing-page columns to website_settings_public
ALTER TABLE public.website_settings_public
ADD COLUMN IF NOT EXISTS why_choose_us jsonb,
ADD COLUMN IF NOT EXISTS book_appointment_text text,
ADD COLUMN IF NOT EXISTS emergency_button_text text,
ADD COLUMN IF NOT EXISTS emergency_contact text,
ADD COLUMN IF NOT EXISTS years_of_service integer,
ADD COLUMN IF NOT EXISTS expert_doctors integer,
ADD COLUMN IF NOT EXISTS patients_served text,
ADD COLUMN IF NOT EXISTS patient_rating numeric,
ADD COLUMN IF NOT EXISTS emergency_care_description text,
ADD COLUMN IF NOT EXISTS specialist_care_description text,
ADD COLUMN IF NOT EXISTS health_checkups_description text,
ADD COLUMN IF NOT EXISTS about_paragraph_1 text,
ADD COLUMN IF NOT EXISTS about_paragraph_2 text,
ADD COLUMN IF NOT EXISTS copyright_text text;

-- Update the sync trigger to copy these columns too
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
      hero_headline, hero_tagline, why_choose_us, book_appointment_text,
      emergency_button_text, emergency_contact, years_of_service, expert_doctors,
      patients_served, patient_rating, emergency_care_description,
      specialist_care_description, health_checkups_description, about_paragraph_1,
      about_paragraph_2, copyright_text, is_active, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.hospital_name, NEW.logo_url, NEW.banner_url, NEW.phone, NEW.location,
      NEW.operating_hours, NEW.hero_headline, NEW.hero_tagline, NEW.why_choose_us,
      NEW.book_appointment_text, NEW.emergency_button_text, NEW.emergency_contact,
      NEW.years_of_service, NEW.expert_doctors, NEW.patients_served, NEW.patient_rating,
      NEW.emergency_care_description, NEW.specialist_care_description,
      NEW.health_checkups_description, NEW.about_paragraph_1, NEW.about_paragraph_2,
      NEW.copyright_text, NEW.is_active, NEW.created_at, NEW.updated_at
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
      why_choose_us = EXCLUDED.why_choose_us,
      book_appointment_text = EXCLUDED.book_appointment_text,
      emergency_button_text = EXCLUDED.emergency_button_text,
      emergency_contact = EXCLUDED.emergency_contact,
      years_of_service = EXCLUDED.years_of_service,
      expert_doctors = EXCLUDED.expert_doctors,
      patients_served = EXCLUDED.patients_served,
      patient_rating = EXCLUDED.patient_rating,
      emergency_care_description = EXCLUDED.emergency_care_description,
      specialist_care_description = EXCLUDED.specialist_care_description,
      health_checkups_description = EXCLUDED.health_checkups_description,
      about_paragraph_1 = EXCLUDED.about_paragraph_1,
      about_paragraph_2 = EXCLUDED.about_paragraph_2,
      copyright_text = EXCLUDED.copyright_text,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.website_settings_public (
      id, hospital_name, logo_url, banner_url, phone, location, operating_hours,
      hero_headline, hero_tagline, why_choose_us, book_appointment_text,
      emergency_button_text, emergency_contact, years_of_service, expert_doctors,
      patients_served, patient_rating, emergency_care_description,
      specialist_care_description, health_checkups_description, about_paragraph_1,
      about_paragraph_2, copyright_text, is_active, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.hospital_name, NEW.logo_url, NEW.banner_url, NEW.phone, NEW.location,
      NEW.operating_hours, NEW.hero_headline, NEW.hero_tagline, NEW.why_choose_us,
      NEW.book_appointment_text, NEW.emergency_button_text, NEW.emergency_contact,
      NEW.years_of_service, NEW.expert_doctors, NEW.patients_served, NEW.patient_rating,
      NEW.emergency_care_description, NEW.specialist_care_description,
      NEW.health_checkups_description, NEW.about_paragraph_1, NEW.about_paragraph_2,
      NEW.copyright_text, NEW.is_active, NEW.created_at, NEW.updated_at
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
      why_choose_us = EXCLUDED.why_choose_us,
      book_appointment_text = EXCLUDED.book_appointment_text,
      emergency_button_text = EXCLUDED.emergency_button_text,
      emergency_contact = EXCLUDED.emergency_contact,
      years_of_service = EXCLUDED.years_of_service,
      expert_doctors = EXCLUDED.expert_doctors,
      patients_served = EXCLUDED.patients_served,
      patient_rating = EXCLUDED.patient_rating,
      emergency_care_description = EXCLUDED.emergency_care_description,
      specialist_care_description = EXCLUDED.specialist_care_description,
      health_checkups_description = EXCLUDED.health_checkups_description,
      about_paragraph_1 = EXCLUDED.about_paragraph_1,
      about_paragraph_2 = EXCLUDED.about_paragraph_2,
      copyright_text = EXCLUDED.copyright_text,
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

-- Seed the public table from the current website_settings row
UPDATE public.website_settings_public
SET
  why_choose_us = s.why_choose_us,
  book_appointment_text = s.book_appointment_text,
  emergency_button_text = s.emergency_button_text,
  emergency_contact = s.emergency_contact,
  years_of_service = s.years_of_service,
  expert_doctors = s.expert_doctors,
  patients_served = s.patients_served,
  patient_rating = s.patient_rating,
  emergency_care_description = s.emergency_care_description,
  specialist_care_description = s.specialist_care_description,
  health_checkups_description = s.health_checkups_description,
  about_paragraph_1 = s.about_paragraph_1,
  about_paragraph_2 = s.about_paragraph_2,
  copyright_text = s.copyright_text
FROM public.website_settings s
WHERE website_settings_public.id = s.id;