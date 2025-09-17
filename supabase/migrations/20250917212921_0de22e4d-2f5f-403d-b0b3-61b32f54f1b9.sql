-- Add new status values to complaint_status enum
ALTER TYPE complaint_status ADD VALUE 'taken';
ALTER TYPE complaint_status ADD VALUE 'in_progress'; 
ALTER TYPE complaint_status ADD VALUE 'solved';

-- Add a column to track who is handling the complaint
ALTER TABLE public.complaints 
ADD COLUMN taken_care_by uuid REFERENCES public.staff(id),
ADD COLUMN taken_care_at timestamp with time zone,
ADD COLUMN action_notes text;