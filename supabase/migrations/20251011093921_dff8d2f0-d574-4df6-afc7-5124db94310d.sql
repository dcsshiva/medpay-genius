-- Create enum types if needed
-- Tables for Master Data Management

-- Table 1: Visit Reasons
CREATE TABLE public.visit_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_name TEXT NOT NULL UNIQUE,
  reason_code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: Insurance Companies
CREATE TABLE public.insurance_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL UNIQUE,
  company_code TEXT,
  contact_number TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 3: Appraisal Reasons
CREATE TABLE public.appraisal_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_name TEXT NOT NULL UNIQUE,
  reason_code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 4: Complaint Categories
CREATE TABLE public.complaint_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  category_code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pre-populate Visit Reasons
INSERT INTO public.visit_reasons (reason_name, reason_code, display_order) VALUES
  ('Regular Checkup', 'regular_checkup', 1),
  ('Emergency', 'emergency', 2),
  ('Follow-up', 'follow_up', 3),
  ('Consultation', 'consultation', 4),
  ('Surgery', 'surgery', 5),
  ('Diagnostic Test', 'diagnostic_test', 6);

-- Pre-populate Insurance Companies (23 companies)
INSERT INTO public.insurance_companies (company_name, display_order) VALUES
  ('Star Health & Allied Insurance', 1),
  ('Niva Bupa', 2),
  ('Care Health Insurance', 3),
  ('Aditya Birla Health Insurance', 4),
  ('ManipalCigna Health Insurance', 5),
  ('HDFC ERGO Health Insurance', 6),
  ('ICICI Lombard', 7),
  ('Bajaj Allianz', 8),
  ('Reliance General Insurance', 9),
  ('Tata AIG', 10),
  ('Cholamandalam MS General Insurance', 11),
  ('Future Generali India Insurance', 12),
  ('Go Digit General Insurance', 13),
  ('IFFCO Tokio General Insurance', 14),
  ('Liberty General Insurance', 15),
  ('Magma HDI General Insurance', 16),
  ('National Insurance Company', 17),
  ('SBI General Insurance', 18),
  ('The New India Assurance Company', 19),
  ('The Oriental Insurance Company', 20),
  ('United India Insurance Company', 21),
  ('Universal Sompo General Insurance', 22),
  ('Zuno General Insurance', 23);

-- Pre-populate Appraisal Reasons
INSERT INTO public.appraisal_reasons (reason_name, reason_code, display_order) VALUES
  ('Annual Performance Review', 'annual_review', 1),
  ('Probation Review', 'probation_review', 2),
  ('Promotion Assessment', 'promotion_assessment', 3),
  ('Mid-Year Review', 'mid_year_review', 4),
  ('Special Achievement', 'special_achievement', 5),
  ('Improvement Plan', 'improvement_plan', 6);

-- Pre-populate Complaint Categories
INSERT INTO public.complaint_categories (category_name, category_code, display_order) VALUES
  ('General', 'general', 1),
  ('Service Quality', 'service_quality', 2),
  ('Staff Behavior', 'staff_behavior', 3),
  ('Facility Issues', 'facility_issues', 4),
  ('Billing Issues', 'billing_issues', 5),
  ('Medical Care', 'medical_care', 6);

-- Enable RLS on all tables
ALTER TABLE public.visit_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Visit Reasons
CREATE POLICY "Admins can manage visit reasons" ON public.visit_reasons
  FOR ALL USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Anyone can view active visit reasons" ON public.visit_reasons
  FOR SELECT USING (is_active = true);

-- RLS Policies for Insurance Companies
CREATE POLICY "Admins can manage insurance companies" ON public.insurance_companies
  FOR ALL USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Anyone can view active insurance companies" ON public.insurance_companies
  FOR SELECT USING (is_active = true);

-- RLS Policies for Appraisal Reasons
CREATE POLICY "Admins can manage appraisal reasons" ON public.appraisal_reasons
  FOR ALL USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Anyone can view active appraisal reasons" ON public.appraisal_reasons
  FOR SELECT USING (is_active = true);

-- RLS Policies for Complaint Categories
CREATE POLICY "Admins can manage complaint categories" ON public.complaint_categories
  FOR ALL USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Anyone can view active complaint categories" ON public.complaint_categories
  FOR SELECT USING (is_active = true);

-- Add updated_at triggers for all tables
CREATE TRIGGER update_visit_reasons_updated_at
  BEFORE UPDATE ON public.visit_reasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_companies_updated_at
  BEFORE UPDATE ON public.insurance_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appraisal_reasons_updated_at
  BEFORE UPDATE ON public.appraisal_reasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_complaint_categories_updated_at
  BEFORE UPDATE ON public.complaint_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();