-- Selvantra HRMS — files attached to an administrator notification (the bell), e.g. a checklist to download.
-- files:     [{ "name": "Checklist.xlsx", "type": "<mime>", "size": 12345, "url"?: "/docs/…" }]  (listed with the
--            notification; url = a file shipped with the app in public/, instead of file_data)
-- file_data: [ "<base64>", … ]  same order as files; read only when the file is downloaded.
-- Both sit on the notification row, so they follow its RLS: only the recipient administrator can read them.
-- Safe to run more than once.
ALTER TABLE public.hr_notifications ADD COLUMN IF NOT EXISTS files jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.hr_notifications ADD COLUMN IF NOT EXISTS file_data jsonb NOT NULL DEFAULT '[]'::jsonb;
