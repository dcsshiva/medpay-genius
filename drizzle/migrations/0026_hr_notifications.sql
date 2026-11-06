-- WestMed Payroll System — notifications for administrators (the bell in the admin header).
-- A notification is a task for one administrator account (recipient_email): a title, a short
-- description, the steps to follow, the staff it concerns, and the screen to open to do it.
-- The recipient opens it from the bell, follows the steps and marks it done.
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS public.hr_notifications (
  id bigserial PRIMARY KEY,
  recipient_email text NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,   -- ["Open Staff Master", "Find …", …]
  items jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{ "code": "2100246", "name": "GAYATHIRI", "detail": "…" }]
  screen text,                                -- admin tab to open: staff, planner, ledger, …
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  done_at timestamptz,
  done_by text
);
CREATE INDEX IF NOT EXISTS hr_notifications_recipient ON public.hr_notifications (lower(recipient_email), done_at);
ALTER TABLE public.hr_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hr_notifications FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.hr_notifications TO authenticated;
GRANT USAGE ON SEQUENCE public.hr_notifications_id_seq TO authenticated;
-- an administrator sees and updates only the notifications sent to their own account
DROP POLICY IF EXISTS "hr notifications own" ON public.hr_notifications;
CREATE POLICY "hr notifications own" ON public.hr_notifications FOR SELECT TO authenticated
  USING (public.hr_is_admin(auth.uid()) AND lower(recipient_email) = lower(coalesce(auth.jwt()->>'email', '')));
DROP POLICY IF EXISTS "hr notifications own update" ON public.hr_notifications;
CREATE POLICY "hr notifications own update" ON public.hr_notifications FOR UPDATE TO authenticated
  USING (public.hr_is_admin(auth.uid()) AND lower(recipient_email) = lower(coalesce(auth.jwt()->>'email', '')))
  WITH CHECK (public.hr_is_admin(auth.uid()) AND lower(recipient_email) = lower(coalesce(auth.jwt()->>'email', '')));
-- any administrator can send one to an administrator
DROP POLICY IF EXISTS "hr notifications send" ON public.hr_notifications;
CREATE POLICY "hr notifications send" ON public.hr_notifications FOR INSERT TO authenticated
  WITH CHECK (public.hr_is_admin(auth.uid()));
