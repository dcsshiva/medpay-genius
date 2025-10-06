-- Add hospital bank details to website_settings table
ALTER TABLE website_settings 
ADD COLUMN hospital_bank_account_number text,
ADD COLUMN hospital_bank_account_holder_name text,
ADD COLUMN hospital_institution_address text,
ADD COLUMN hospital_institution_code text;

-- Set initial values for the active settings record
UPDATE website_settings 
SET 
  hospital_bank_account_number = '125001608553',
  hospital_bank_account_holder_name = 'WESTMED HEALTHCARE PRIVATE LIMITED',
  hospital_institution_address = 'ECR Road, 02, New Street, Pudupet, Lawspet, Puducherry, 605008',
  hospital_institution_code = 'ABC07112007'
WHERE is_active = true;