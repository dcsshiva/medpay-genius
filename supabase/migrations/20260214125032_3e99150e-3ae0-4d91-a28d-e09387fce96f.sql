ALTER TABLE public.complaints 
  ADD COLUMN incident_date date,
  ADD COLUMN incident_time time without time zone;