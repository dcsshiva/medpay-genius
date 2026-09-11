CREATE TABLE IF NOT EXISTS public.shift_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  window_from time NOT NULL,
  window_to time NOT NULL,
  grace_minutes integer NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shift_definitions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shift_definitions TO authenticated;
GRANT ALL ON public.shift_definitions TO service_role;

ALTER TABLE public.shift_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read shifts"
ON public.shift_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers manage shifts"
ON public.shift_definitions FOR ALL TO authenticated
USING (
  public.has_designation(auth.uid(), 'admin')
  OR public.has_designation(auth.uid(), 'manager')
  OR public.has_designation(auth.uid(), 'super_admin')
  OR public.is_staff_manager(auth.uid())
)
WITH CHECK (
  public.has_designation(auth.uid(), 'admin')
  OR public.has_designation(auth.uid(), 'manager')
  OR public.has_designation(auth.uid(), 'super_admin')
  OR public.is_staff_manager(auth.uid())
);

CREATE TRIGGER update_shift_definitions_updated_at
BEFORE UPDATE ON public.shift_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.staff_daily_activities ADD COLUMN IF NOT EXISTS shift_name text;