-- Remove all existing doctors and their associated profiles
DELETE FROM doctors;

-- Remove orphaned profiles (profiles without user_id that were created for doctors)
DELETE FROM profiles WHERE user_id IS NULL;