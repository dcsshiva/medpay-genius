-- Add complaint_against column to complaints table
ALTER TABLE public.complaints
ADD COLUMN complaint_against uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_complaints_complaint_against ON public.complaints(complaint_against);

-- Add comment to explain the column
COMMENT ON COLUMN public.complaints.complaint_against IS 'The staff member that this complaint is about';