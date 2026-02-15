
-- 1. Create appraisal_criteria_master table
CREATE TABLE public.appraisal_criteria_master (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criteria_name text NOT NULL,
  criteria_code text NOT NULL UNIQUE,
  description text,
  max_score integer NOT NULL DEFAULT 100,
  weight numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appraisal_criteria_master ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage appraisal criteria"
ON public.appraisal_criteria_master FOR ALL
USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Managers can manage appraisal criteria"
ON public.appraisal_criteria_master FOR ALL
USING (has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Anyone authenticated can view active criteria"
ON public.appraisal_criteria_master FOR SELECT
USING (is_active = true);

-- 2. Create staff_appraisal_scores table
CREATE TABLE public.staff_appraisal_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appraisal_id uuid NOT NULL REFERENCES public.staff_appraisals(id) ON DELETE CASCADE,
  criteria_id uuid NOT NULL REFERENCES public.appraisal_criteria_master(id),
  score_value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(appraisal_id, criteria_id)
);

-- Enable RLS
ALTER TABLE public.staff_appraisal_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as staff_appraisals)
CREATE POLICY "Admins can manage appraisal scores"
ON public.staff_appraisal_scores FOR ALL
USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Managers can manage appraisal scores"
ON public.staff_appraisal_scores FOR ALL
USING (has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Staff can view own appraisal scores"
ON public.staff_appraisal_scores FOR SELECT
USING (
  appraisal_id IN (
    SELECT sa.id FROM public.staff_appraisals sa
    JOIN public.staff s ON sa.staff_id = s.id
    WHERE s.user_id = auth.uid()
  )
);

-- 3. Seed initial criteria from the 11 hardcoded rating fields
INSERT INTO public.appraisal_criteria_master (criteria_name, criteria_code, description, display_order, weight) VALUES
('Punctuality', 'punctuality', 'Timeliness and adherence to schedule', 1, 1.0),
('Work Quality', 'work_quality', 'Quality and accuracy of work output', 2, 1.0),
('Teamwork', 'teamwork', 'Collaboration and team contribution', 3, 1.0),
('Communication', 'communication', 'Verbal and written communication skills', 4, 1.0),
('Professionalism', 'professionalism', 'Professional conduct and demeanor', 5, 1.0),
('Patient Care Quality', 'patient_care', 'Quality of patient care and empathy', 6, 1.0),
('Infection Control', 'infection_control', 'Compliance with infection control protocols', 7, 1.0),
('Documentation Accuracy', 'documentation', 'Accuracy and completeness of documentation', 8, 1.0),
('Attendance Reliability', 'attendance_reliability', 'Consistent attendance and dependability', 9, 1.0),
('Initiative', 'initiative', 'Initiative and problem-solving ability', 10, 1.0),
('Training Participation', 'training_participation', 'Participation in training and development', 11, 1.0);

-- 4. Updated_at trigger
CREATE TRIGGER update_appraisal_criteria_master_updated_at
BEFORE UPDATE ON public.appraisal_criteria_master
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
