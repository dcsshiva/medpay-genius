-- Add columns to track separate approval status for cash and insurance payments
-- This allows managers and admins to approve cash and insurance portions independently

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS cash_approval_status TEXT DEFAULT 'pending' CHECK (cash_approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS cash_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cash_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cash_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS insurance_approval_status TEXT DEFAULT 'pending' CHECK (insurance_approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS insurance_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS insurance_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS insurance_rejection_reason TEXT;

-- Add comment explaining the new workflow
COMMENT ON COLUMN public.payments.cash_approval_status IS 'Approval status for cash portion of payment';
COMMENT ON COLUMN public.payments.insurance_approval_status IS 'Approval status for insurance portion of payment';