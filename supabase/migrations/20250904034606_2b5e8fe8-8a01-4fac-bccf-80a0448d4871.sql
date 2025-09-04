-- Add new columns to visits table for enhanced visit tracking
ALTER TABLE public.visits 
ADD COLUMN patient_id TEXT,
ADD COLUMN patient_name TEXT NOT NULL DEFAULT '',
ADD COLUMN visit_payment NUMERIC(10,2),
ADD COLUMN visit_reason TEXT NOT NULL DEFAULT 'regular_checkup';

-- Add a check constraint for visit reason to ensure valid values
ALTER TABLE public.visits 
ADD CONSTRAINT visits_reason_check 
CHECK (visit_reason IN ('regular_checkup', 'surgery', 'follow_up', 'emergency', 'consultation'));