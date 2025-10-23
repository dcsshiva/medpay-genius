-- Add PAN number column to doctors table
ALTER TABLE doctors 
ADD COLUMN pan_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN doctors.pan_number IS 'Doctor''s Permanent Account Number for TDS processing';

-- Add validation constraint for Indian PAN format: AAAAA9999A (5 letters, 4 digits, 1 letter)
ALTER TABLE doctors
ADD CONSTRAINT pan_number_format 
CHECK (pan_number IS NULL OR pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$');