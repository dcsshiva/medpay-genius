-- WestMed Payroll System — fewer server requests when the app opens (src/hrms/listCache.js).
--  • hr_data_versions: one row per shared list, stamped by statement-level triggers whenever the
--    list changes. The app keeps the lists on the device and asks hr_data_version_stamps() — one
--    small call — which of them changed since it last downloaded them.
--  • hr_attendance_stats_many(): the Overview trend figures for several pay cycles in one call
--    (was one call per cycle). Administrators only, like hr_attendance_stats.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.hr_data_versions (
  name text PRIMARY KEY,
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_data_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hr_data_versions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.hr_touch_data_version() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.hr_data_versions (name, changed_at) VALUES (TG_TABLE_NAME, clock_timestamp())
  ON CONFLICT (name) DO UPDATE SET changed_at = clock_timestamp();
  RETURN NULL;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hr_units','hr_departments','hr_designations','hr_shifts','hr_holidays',
                           'hr_task_templates','hr_settings','hr_staff'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS hr_touch_data_version ON public.%I', t);
    EXECUTE format('CREATE TRIGGER hr_touch_data_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.%I '
                   'FOR EACH STATEMENT EXECUTE FUNCTION public.hr_touch_data_version()', t);
    INSERT INTO public.hr_data_versions (name) VALUES (t) ON CONFLICT (name) DO NOTHING;
  END LOOP;
END $$;

-- { "hr_units": "2026-11-15T…", … } for organisation members; null for anyone else
CREATE OR REPLACE FUNCTION public.hr_data_version_stamps() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_org_member(auth.uid())
              THEN (SELECT jsonb_object_agg(name, changed_at) FROM public.hr_data_versions) END
$$;
REVOKE EXECUTE ON FUNCTION public.hr_data_version_stamps() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_data_version_stamps() TO authenticated;

-- _ranges: [{ "key": "2026-11", "start": "2026-10-26", "end": "2026-11-25" }, …]
CREATE OR REPLACE FUNCTION public.hr_attendance_stats_many(_ranges jsonb)
RETURNS TABLE (cycle_key text, present bigint, working bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r->>'key',
         count(a.*) FILTER (WHERE a.status = 'P'),
         count(a.*) FILTER (WHERE a.status NOT IN ('WO', 'H') AND NOT EXISTS (SELECT 1 FROM public.hr_holidays h WHERE h.date = a.date))
  FROM jsonb_array_elements(_ranges) r
  LEFT JOIN public.hr_attendance a ON a.date BETWEEN (r->>'start')::date AND (r->>'end')::date
  WHERE public.hr_is_admin(auth.uid())
  GROUP BY r->>'key'
$$;
REVOKE EXECUTE ON FUNCTION public.hr_attendance_stats_many(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_attendance_stats_many(jsonb) TO authenticated;
