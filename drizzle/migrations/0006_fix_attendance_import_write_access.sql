GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff_daily_activities TO authenticated;
GRANT ALL ON TABLE public.staff_daily_activities TO service_role;

ALTER TABLE public.staff_daily_activities
  DROP CONSTRAINT IF EXISTS staff_daily_activities_recorded_by_fkey;