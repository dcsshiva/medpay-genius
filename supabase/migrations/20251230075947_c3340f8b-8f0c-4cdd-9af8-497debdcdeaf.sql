-- Add payment mode columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'bank';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cheque_number TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cheque_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cheque_bank_name TEXT;

-- Add payment mode columns to quick_payments table
ALTER TABLE quick_payments ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'bank';
ALTER TABLE quick_payments ADD COLUMN IF NOT EXISTS cheque_number TEXT;
ALTER TABLE quick_payments ADD COLUMN IF NOT EXISTS cheque_date DATE;
ALTER TABLE quick_payments ADD COLUMN IF NOT EXISTS cheque_bank_name TEXT;

-- Add payment mode column to bank_advice_history table
ALTER TABLE bank_advice_history ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'bank';

-- Add payment mode column to quick_payment_bank_advice_history table
ALTER TABLE quick_payment_bank_advice_history ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'bank';

-- Add payment mode column to staff_payment_bank_advice_history table (for staff payments)
ALTER TABLE staff_payment_bank_advice_history ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'bank';

-- Add comment for documentation
COMMENT ON COLUMN payments.payment_mode IS 'Payment mode: bank, cash, or cheque';
COMMENT ON COLUMN quick_payments.payment_mode IS 'Payment mode: bank, cash, or cheque';