-- Grant managers full access to all master data tables
-- This adds RLS policies allowing managers to manage master data

-- Grant managers full access to roles_master
CREATE POLICY "Managers can manage roles"
ON public.roles_master
FOR ALL
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation));

-- Grant managers full access to departments_master
CREATE POLICY "Managers can manage departments"
ON public.departments_master
FOR ALL
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation));

-- Grant managers full access to leave_reasons_master
CREATE POLICY "Managers can manage leave reasons"
ON public.leave_reasons_master
FOR ALL
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation));

-- Grant managers full access to permission_reasons_master
CREATE POLICY "Managers can manage permission reasons"
ON public.permission_reasons_master
FOR ALL
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation));

-- Grant managers full access to visit_reasons
CREATE POLICY "Managers can manage visit reasons"
ON public.visit_reasons
FOR ALL
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation));

-- Grant managers full access to insurance_companies
CREATE POLICY "Managers can manage insurance companies"
ON public.insurance_companies
FOR ALL
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation));

-- Grant managers full access to appraisal_reasons
CREATE POLICY "Managers can manage appraisal reasons"
ON public.appraisal_reasons
FOR ALL
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation));

-- Grant managers full access to complaint_categories
CREATE POLICY "Managers can manage complaint categories"
ON public.complaint_categories
FOR ALL
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation));

-- Grant managers full access to quick_payment_types
CREATE POLICY "Managers can manage quick payment types"
ON public.quick_payment_types
FOR ALL
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation));

-- Grant managers full access to vendors
CREATE POLICY "Managers can manage vendors"
ON public.vendors
FOR ALL
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation));