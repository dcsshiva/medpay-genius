CREATE TABLE public.email_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  digest_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_notification_recipients TO authenticated;
GRANT ALL ON public.email_notification_recipients TO service_role;

ALTER TABLE public.email_notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notification recipients"
ON public.email_notification_recipients
FOR ALL
TO authenticated
USING (public.has_designation(auth.uid(), 'admin'::app_designation) OR public.has_designation(auth.uid(), 'super_admin'::app_designation))
WITH CHECK (public.has_designation(auth.uid(), 'admin'::app_designation) OR public.has_designation(auth.uid(), 'super_admin'::app_designation));

CREATE TRIGGER update_email_notification_recipients_updated_at
BEFORE UPDATE ON public.email_notification_recipients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.email_notification_recipients (email, label)
VALUES ('drarulmani375@gmail.com', 'Dr. Arulmani'), ('deepanjr10@gmail.com', 'Deepan')
ON CONFLICT (email) DO NOTHING;