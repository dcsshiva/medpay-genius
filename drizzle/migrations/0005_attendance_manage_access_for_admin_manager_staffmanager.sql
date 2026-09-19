DROP POLICY IF EXISTS "Admins and managers can manage daily activities" ON public.staff_daily_activities;

CREATE POLICY "Admins managers and staff managers manage daily activities"
ON public.staff_daily_activities
FOR ALL
USING (
  public.has_designation(auth.uid(), 'admin'::app_designation)
  OR public.has_designation(auth.uid(), 'super_admin'::app_designation)
  OR public.has_designation(auth.uid(), 'manager'::app_designation)
  OR public.is_staff_manager(auth.uid())
)
WITH CHECK (
  public.has_designation(auth.uid(), 'admin'::app_designation)
  OR public.has_designation(auth.uid(), 'super_admin'::app_designation)
  OR public.has_designation(auth.uid(), 'manager'::app_designation)
  OR public.is_staff_manager(auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_daily_activities TO authenticated;
GRANT ALL ON public.staff_daily_activities TO service_role;

CREATE OR REPLACE FUNCTION public.create_placeholder_staff_from_biometric(_biometric_code text, _full_name text, _biometric_device text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing uuid;
  v_id uuid;
  v_code text;
  v_username text;
  v_base text;
  v_name text;
  v_i int := 1;
BEGIN
  IF NOT (
    public.has_designation(auth.uid(), 'admin'::app_designation)
    OR public.has_designation(auth.uid(), 'super_admin'::app_designation)
    OR public.has_designation(auth.uid(), 'manager'::app_designation)
    OR public.is_staff_manager(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to create staff records';
  END IF;

  IF _biometric_code IS NULL OR btrim(_biometric_code) = '' THEN
    RAISE EXCEPTION 'Biometric code is required';
  END IF;

  SELECT id INTO v_existing FROM public.staff
   WHERE lower(btrim(biometric_code)) = lower(btrim(_biometric_code))
   LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  v_name := NULLIF(btrim(coalesce(_full_name, '')), '');
  IF v_name IS NULL THEN
    v_name := 'Unmapped ' || btrim(_biometric_code);
  END IF;

  v_code := 'BIO' || btrim(_biometric_code);
  WHILE EXISTS (SELECT 1 FROM public.staff WHERE lower(staff_code) = lower(v_code)) LOOP
    v_code := 'BIO' || btrim(_biometric_code) || '-' || v_i;
    v_i := v_i + 1;
  END LOOP;

  v_base := lower(regexp_replace(v_name, '[^a-zA-Z0-9]', '', 'g'));
  IF v_base = '' THEN v_base := 'bio' || btrim(_biometric_code); END IF;
  v_username := v_base;
  v_i := 1;
  WHILE EXISTS (SELECT 1 FROM public.staff WHERE lower(username) = lower(v_username)) LOOP
    v_i := v_i + 1;
    v_username := v_base || v_i::text;
  END LOOP;

  INSERT INTO public.staff (
    staff_code, username, password_hash, full_name, role,
    biometric_code, biometric_device, is_active
  ) VALUES (
    v_code, v_username, public.simple_hash('ChangeMe@123'), v_name, 'staff_nurse',
    btrim(_biometric_code), NULLIF(btrim(coalesce(_biometric_device, '')), ''), true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;