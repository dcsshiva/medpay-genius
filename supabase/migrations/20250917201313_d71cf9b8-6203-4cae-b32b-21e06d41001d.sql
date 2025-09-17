-- Fix email mismatch for newly created staff
-- Update the staff record to have the correct Supabase auth email
UPDATE staff 
SET email = 'rruben.1758139251223@hospital.local' 
WHERE username = 'rruben' AND email = 'ruben@hospital.com';