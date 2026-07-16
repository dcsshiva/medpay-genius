-- Run manually against the WestMed Supabase project (chbntbekbgetbyyxapqh)
-- Makes reason_details optional on leave/permission applications so blank details
-- no longer trigger a NOT NULL violation. Existing rows are backfilled with '-'.

ALTER TABLE public.leave_permission_applications
  ALTER COLUMN reason_details DROP NOT NULL;

ALTER TABLE public.leave_permission_applications
  ALTER COLUMN reason_details SET DEFAULT '-';

UPDATE public.leave_permission_applications
  SET reason_details = '-'
  WHERE reason_details IS NULL OR btrim(reason_details) = '';
