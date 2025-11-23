-- Replace bank_processed checkbox with professional reconciliation status workflow

-- Update bank_advice_history table
ALTER TABLE bank_advice_history 
  DROP COLUMN IF EXISTS bank_processed CASCADE,
  DROP COLUMN IF EXISTS bank_processed_at CASCADE,
  DROP COLUMN IF EXISTS bank_processed_by CASCADE,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'in_process', 'completed', 'failed', 'partial')),
  ADD COLUMN IF NOT EXISTS bank_confirmation_date DATE,
  ADD COLUMN IF NOT EXISTS bank_reference_number TEXT,
  ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

-- Update quick_payment_bank_advice_history table
ALTER TABLE quick_payment_bank_advice_history 
  DROP COLUMN IF EXISTS bank_processed CASCADE,
  DROP COLUMN IF EXISTS bank_processed_at CASCADE,
  DROP COLUMN IF EXISTS bank_processed_by CASCADE,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'in_process', 'completed', 'failed', 'partial')),
  ADD COLUMN IF NOT EXISTS bank_confirmation_date DATE,
  ADD COLUMN IF NOT EXISTS bank_reference_number TEXT,
  ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

-- Update staff_payment_bank_advice_history table
ALTER TABLE staff_payment_bank_advice_history 
  DROP COLUMN IF EXISTS bank_processed CASCADE,
  DROP COLUMN IF EXISTS bank_processed_at CASCADE,
  DROP COLUMN IF EXISTS bank_processed_by CASCADE,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'in_process', 'completed', 'failed', 'partial')),
  ADD COLUMN IF NOT EXISTS bank_confirmation_date DATE,
  ADD COLUMN IF NOT EXISTS bank_reference_number TEXT,
  ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_advice_reconciliation_status ON bank_advice_history(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_quick_payment_advice_reconciliation_status ON quick_payment_bank_advice_history(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_staff_payment_advice_reconciliation_status ON staff_payment_bank_advice_history(reconciliation_status);