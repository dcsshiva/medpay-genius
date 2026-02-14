
-- Staff salary structure table
CREATE TABLE public.staff_salary_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  basic_salary numeric NOT NULL DEFAULT 0,
  hra numeric NOT NULL DEFAULT 0,
  conveyance numeric NOT NULL DEFAULT 0,
  medical numeric NOT NULL DEFAULT 0,
  other_allowances numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id)
);

ALTER TABLE public.staff_salary_structure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage salary structures"
ON public.staff_salary_structure FOR ALL
USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Managers can manage salary structures"
ON public.staff_salary_structure FOR ALL
USING (has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Staff can view own salary structure"
ON public.staff_salary_structure FOR SELECT
USING (staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()));

-- Staff payroll table
CREATE TABLE public.staff_payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  payroll_month text NOT NULL, -- YYYY-MM format
  total_working_days integer NOT NULL DEFAULT 0,
  present_days integer NOT NULL DEFAULT 0,
  absent_days integer NOT NULL DEFAULT 0,
  late_days integer NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  basic_salary numeric NOT NULL DEFAULT 0,
  hra numeric NOT NULL DEFAULT 0,
  conveyance numeric NOT NULL DEFAULT 0,
  medical numeric NOT NULL DEFAULT 0,
  other_allowances numeric NOT NULL DEFAULT 0,
  gross_salary numeric NOT NULL DEFAULT 0,
  absent_deduction numeric NOT NULL DEFAULT 0,
  late_deduction numeric NOT NULL DEFAULT 0,
  other_deductions numeric NOT NULL DEFAULT 0,
  total_deductions numeric NOT NULL DEFAULT 0,
  overtime_pay numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  generated_by uuid,
  status text NOT NULL DEFAULT 'draft', -- draft, approved, paid
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, payroll_month)
);

ALTER TABLE public.staff_payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payroll"
ON public.staff_payroll FOR ALL
USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Managers can manage payroll"
ON public.staff_payroll FOR ALL
USING (has_designation(auth.uid(), 'manager'::app_designation));

CREATE POLICY "Staff can view own payroll"
ON public.staff_payroll FOR SELECT
USING (staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_staff_salary_structure_updated_at
BEFORE UPDATE ON public.staff_salary_structure
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_payroll_updated_at
BEFORE UPDATE ON public.staff_payroll
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
