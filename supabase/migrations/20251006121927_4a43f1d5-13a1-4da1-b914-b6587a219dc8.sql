-- Create enums for staff appraisal system
CREATE TYPE public.warning_type AS ENUM (
  'late_coming',
  'unauthorized_absence',
  'leaving_early',
  'excessive_absenteeism',
  'insubordination',
  'improper_mobile_use',
  'unprofessional_language',
  'gossip_rumors',
  'arguments_colleagues',
  'breach_confidentiality',
  'medication_errors',
  'hygiene_violations',
  'improper_documentation',
  'patient_neglect',
  'dress_code_violations',
  'misuse_hospital_property',
  'safety_protocol_failure',
  'sleeping_on_duty'
);

CREATE TYPE public.warning_severity AS ENUM (
  'verbal_warning',
  'written_warning',
  'final_warning',
  'suspension'
);

CREATE TYPE public.attendance_status AS ENUM (
  'present',
  'late',
  'absent',
  'half_day',
  'leave'
);

CREATE TYPE public.appraisal_rating AS ENUM (
  'excellent',
  'good',
  'satisfactory',
  'needs_improvement',
  'poor'
);

-- Create staff_appraisals table
CREATE TABLE public.staff_appraisals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  appraisal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  appraisal_period_start DATE NOT NULL,
  appraisal_period_end DATE NOT NULL,
  overall_rating appraisal_rating NOT NULL,
  punctuality_rating INTEGER NOT NULL CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  work_quality_rating INTEGER NOT NULL CHECK (work_quality_rating >= 1 AND work_quality_rating <= 5),
  teamwork_rating INTEGER NOT NULL CHECK (teamwork_rating >= 1 AND teamwork_rating <= 5),
  communication_rating INTEGER NOT NULL CHECK (communication_rating >= 1 AND communication_rating <= 5),
  professionalism_rating INTEGER NOT NULL CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  manager_comments TEXT,
  action_plan TEXT,
  next_review_date DATE,
  appraised_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff_warnings table
CREATE TABLE public.staff_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  warning_type warning_type NOT NULL,
  incident_date DATE NOT NULL,
  incident_time TIME,
  severity warning_severity NOT NULL,
  description TEXT NOT NULL,
  action_taken TEXT,
  witness_name TEXT,
  staff_response TEXT,
  follow_up_required BOOLEAN NOT NULL DEFAULT false,
  follow_up_date DATE,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  issued_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff_daily_activities table
CREATE TABLE public.staff_daily_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_start_time TIME,
  shift_end_time TIME,
  attendance_status attendance_status NOT NULL,
  tasks_completed JSONB DEFAULT '[]'::jsonb,
  patients_handled INTEGER,
  special_notes TEXT,
  supervisor_notes TEXT,
  recorded_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, activity_date)
);

-- Enable RLS on all tables
ALTER TABLE public.staff_appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_daily_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_appraisals
CREATE POLICY "Admins and managers can manage appraisals"
  ON public.staff_appraisals
  FOR ALL
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

CREATE POLICY "Staff can view their own appraisals"
  ON public.staff_appraisals
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM public.staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for staff_warnings
CREATE POLICY "Admins and managers can manage warnings"
  ON public.staff_warnings
  FOR ALL
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

CREATE POLICY "Staff can view their own warnings"
  ON public.staff_warnings
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM public.staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for staff_daily_activities
CREATE POLICY "Admins and managers can manage daily activities"
  ON public.staff_daily_activities
  FOR ALL
  USING (
    has_designation(auth.uid(), 'admin'::app_designation) OR 
    has_designation(auth.uid(), 'manager'::app_designation)
  );

CREATE POLICY "Staff can view their own activities"
  ON public.staff_daily_activities
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM public.staff WHERE user_id = auth.uid()
    )
  );

-- Triggers for updated_at columns
CREATE TRIGGER update_staff_appraisals_updated_at
  BEFORE UPDATE ON public.staff_appraisals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_warnings_updated_at
  BEFORE UPDATE ON public.staff_warnings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_daily_activities_updated_at
  BEFORE UPDATE ON public.staff_daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function: Get staff appraisal summary
CREATE OR REPLACE FUNCTION public.get_staff_appraisal_summary(_staff_id UUID)
RETURNS TABLE(
  total_appraisals BIGINT,
  latest_rating appraisal_rating,
  average_score NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_appraisals,
    (SELECT overall_rating FROM public.staff_appraisals 
     WHERE staff_id = _staff_id 
     ORDER BY appraisal_date DESC LIMIT 1) as latest_rating,
    ROUND(AVG((punctuality_rating + work_quality_rating + teamwork_rating + 
               communication_rating + professionalism_rating)::NUMERIC / 5.0), 2) as average_score
  FROM public.staff_appraisals
  WHERE staff_id = _staff_id;
END;
$$;

-- Helper function: Get staff warning count by severity
CREATE OR REPLACE FUNCTION public.get_staff_warning_count(_staff_id UUID, _severity warning_severity DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _severity IS NULL THEN
    RETURN (SELECT COUNT(*) FROM public.staff_warnings WHERE staff_id = _staff_id);
  ELSE
    RETURN (SELECT COUNT(*) FROM public.staff_warnings WHERE staff_id = _staff_id AND severity = _severity);
  END IF;
END;
$$;

-- Helper function: Get staff attendance percentage
CREATE OR REPLACE FUNCTION public.get_staff_attendance_percentage(_staff_id UUID, _start_date DATE, _end_date DATE)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  present_count INTEGER;
  total_days INTEGER;
BEGIN
  SELECT COUNT(*) INTO present_count
  FROM public.staff_daily_activities
  WHERE staff_id = _staff_id
    AND activity_date BETWEEN _start_date AND _end_date
    AND attendance_status IN ('present', 'late', 'half_day');
  
  SELECT COUNT(*) INTO total_days
  FROM public.staff_daily_activities
  WHERE staff_id = _staff_id
    AND activity_date BETWEEN _start_date AND _end_date;
  
  IF total_days = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((present_count::NUMERIC / total_days::NUMERIC) * 100, 2);
END;
$$;