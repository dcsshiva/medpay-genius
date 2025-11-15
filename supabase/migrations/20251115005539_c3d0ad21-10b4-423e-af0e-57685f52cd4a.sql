-- Add bank_processed column to track if payment was processed in bank
-- This allows tracking of which bank advice payments have been confirmed as processed

-- Add to bank_advice_history (doctor payments)
ALTER TABLE bank_advice_history 
ADD COLUMN IF NOT EXISTS bank_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bank_processed_by UUID REFERENCES profiles(id);

-- Add to quick_payment_bank_advice_history (quick payments)
ALTER TABLE quick_payment_bank_advice_history 
ADD COLUMN IF NOT EXISTS bank_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bank_processed_by UUID REFERENCES profiles(id);

-- Add to staff_payment_bank_advice_history (staff payments)
ALTER TABLE staff_payment_bank_advice_history 
ADD COLUMN IF NOT EXISTS bank_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bank_processed_by UUID REFERENCES profiles(id);

-- Add helpful comment
COMMENT ON COLUMN bank_advice_history.bank_processed IS 'Indicates if the payment advice has been processed in the bank system';
COMMENT ON COLUMN quick_payment_bank_advice_history.bank_processed IS 'Indicates if the payment advice has been processed in the bank system';
COMMENT ON COLUMN staff_payment_bank_advice_history.bank_processed IS 'Indicates if the payment advice has been processed in the bank system';