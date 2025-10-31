-- Add super_admin RLS policies where missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'staff' AND policyname = 'Super admins can manage all staff'
  ) THEN
    CREATE POLICY "Super admins can manage all staff"
    ON public.staff
    FOR ALL
    USING (has_designation(auth.uid(), 'super_admin'::app_designation))
    WITH CHECK (has_designation(auth.uid(), 'super_admin'::app_designation));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'doctors' AND policyname = 'Super admins can manage doctors'
  ) THEN
    CREATE POLICY "Super admins can manage doctors"
    ON public.doctors
    FOR ALL
    USING (has_designation(auth.uid(), 'super_admin'::app_designation))
    WITH CHECK (has_designation(auth.uid(), 'super_admin'::app_designation));
  END IF;
END $$;