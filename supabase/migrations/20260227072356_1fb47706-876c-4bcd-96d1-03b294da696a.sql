
-- 1. department_role_mapping table
CREATE TABLE public.department_role_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments_master(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles_master(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(department_id, role_id)
);

ALTER TABLE public.department_role_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage department role mappings" ON public.department_role_mapping
  FOR ALL TO authenticated
  USING (has_designation(auth.uid(), 'admin'::app_designation))
  WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Managers can manage department role mappings" ON public.department_role_mapping
  FOR ALL TO authenticated
  USING (has_designation(auth.uid(), 'manager'::app_designation))
  WITH CHECK (has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Anyone authenticated can view active mappings" ON public.department_role_mapping
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 2. role_appraisal_criteria table (Parameter Master)
CREATE TABLE public.role_appraisal_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles_master(id) ON DELETE CASCADE,
  criteria_name text NOT NULL,
  criteria_code text NOT NULL,
  max_score numeric NOT NULL DEFAULT 10,
  has_yes_no boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_appraisal_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role appraisal criteria" ON public.role_appraisal_criteria
  FOR ALL TO authenticated
  USING (has_designation(auth.uid(), 'admin'::app_designation))
  WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Managers can manage role appraisal criteria" ON public.role_appraisal_criteria
  FOR ALL TO authenticated
  USING (has_designation(auth.uid(), 'manager'::app_designation))
  WITH CHECK (has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Anyone authenticated can view active criteria" ON public.role_appraisal_criteria
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 3. staff_appraisal_criteria_scores table
CREATE TABLE public.staff_appraisal_criteria_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_id uuid NOT NULL REFERENCES public.staff_appraisals(id) ON DELETE CASCADE,
  criteria_id uuid NOT NULL REFERENCES public.role_appraisal_criteria(id) ON DELETE CASCADE,
  yes_no_value boolean,
  obtained_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_appraisal_criteria_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage criteria scores" ON public.staff_appraisal_criteria_scores
  FOR ALL TO authenticated
  USING (has_designation(auth.uid(), 'admin'::app_designation) OR has_designation(auth.uid(), 'manager'::app_designation))
  WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation) OR has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Staff can view their own criteria scores" ON public.staff_appraisal_criteria_scores
  FOR SELECT TO authenticated
  USING (appraisal_id IN (
    SELECT sa.id FROM staff_appraisals sa
    JOIN staff s ON sa.staff_id = s.id
    WHERE s.user_id = auth.uid()
  ));

-- 4. Seed: Map all existing roles to all existing departments
INSERT INTO public.department_role_mapping (department_id, role_id)
SELECT d.id, r.id
FROM public.departments_master d
CROSS JOIN public.roles_master r
WHERE d.is_active = true AND r.is_active = true
ON CONFLICT (department_id, role_id) DO NOTHING;
