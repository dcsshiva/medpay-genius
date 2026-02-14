
-- Add new hospital-specific rating columns to staff_appraisals
ALTER TABLE public.staff_appraisals
  ADD COLUMN IF NOT EXISTS patient_care_rating integer,
  ADD COLUMN IF NOT EXISTS infection_control_rating integer,
  ADD COLUMN IF NOT EXISTS documentation_rating integer,
  ADD COLUMN IF NOT EXISTS attendance_reliability_rating integer,
  ADD COLUMN IF NOT EXISTS initiative_rating integer,
  ADD COLUMN IF NOT EXISTS training_participation_rating integer,
  ADD COLUMN IF NOT EXISTS appraisal_reason_id uuid REFERENCES public.appraisal_reasons(id),
  ADD COLUMN IF NOT EXISTS staff_acknowledgement boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS staff_comments text,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamp with time zone;

-- Add validation trigger for new rating columns (1-5 range)
CREATE OR REPLACE FUNCTION public.validate_appraisal_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.patient_care_rating IS NOT NULL AND (NEW.patient_care_rating < 1 OR NEW.patient_care_rating > 5) THEN
    RAISE EXCEPTION 'patient_care_rating must be between 1 and 5';
  END IF;
  IF NEW.infection_control_rating IS NOT NULL AND (NEW.infection_control_rating < 1 OR NEW.infection_control_rating > 5) THEN
    RAISE EXCEPTION 'infection_control_rating must be between 1 and 5';
  END IF;
  IF NEW.documentation_rating IS NOT NULL AND (NEW.documentation_rating < 1 OR NEW.documentation_rating > 5) THEN
    RAISE EXCEPTION 'documentation_rating must be between 1 and 5';
  END IF;
  IF NEW.attendance_reliability_rating IS NOT NULL AND (NEW.attendance_reliability_rating < 1 OR NEW.attendance_reliability_rating > 5) THEN
    RAISE EXCEPTION 'attendance_reliability_rating must be between 1 and 5';
  END IF;
  IF NEW.initiative_rating IS NOT NULL AND (NEW.initiative_rating < 1 OR NEW.initiative_rating > 5) THEN
    RAISE EXCEPTION 'initiative_rating must be between 1 and 5';
  END IF;
  IF NEW.training_participation_rating IS NOT NULL AND (NEW.training_participation_rating < 1 OR NEW.training_participation_rating > 5) THEN
    RAISE EXCEPTION 'training_participation_rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_appraisal_ratings_trigger
  BEFORE INSERT OR UPDATE ON public.staff_appraisals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appraisal_ratings();

-- RLS policy: Staff can update their own acknowledgement and comments
CREATE POLICY "Staff can acknowledge their own appraisals"
  ON public.staff_appraisals
  FOR UPDATE
  USING (staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()))
  WITH CHECK (staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()));
