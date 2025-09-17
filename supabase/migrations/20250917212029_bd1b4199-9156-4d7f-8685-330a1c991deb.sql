-- Add suspect flag to payments table
ALTER TABLE public.payments 
ADD COLUMN is_suspect boolean NOT NULL DEFAULT false,
ADD COLUMN suspect_reason text,
ADD COLUMN marked_suspect_by uuid REFERENCES public.profiles(id),
ADD COLUMN marked_suspect_at timestamp with time zone;