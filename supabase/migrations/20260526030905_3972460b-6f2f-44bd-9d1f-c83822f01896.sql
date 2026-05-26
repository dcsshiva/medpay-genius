
ALTER TABLE public.app_downloads
  ADD COLUMN IF NOT EXISTS min_required_version text,
  ADD COLUMN IF NOT EXISTS min_required_version_code integer,
  ADD COLUMN IF NOT EXISTS force_update_message text,
  ADD COLUMN IF NOT EXISTS force_update_for_roles text[] NOT NULL DEFAULT ARRAY['doctor']::text[];

-- Allow any authenticated user to read force-update info (currently SELECT only allows is_active=true rows; that works)
-- No new policy needed; existing "Anyone can view active app downloads" suffices.

-- Enable realtime for payments so doctors see live updates after admin reverts
ALTER TABLE public.payments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.payments';
  END IF;
END
$$;
