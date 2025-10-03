-- Clear database for fresh start
-- This will delete doctors, staff (except admin/manager), visits, payments, and tasks
-- Manager accounts (rruben, rajkumar) will be preserved

-- Delete payment transactions first (foreign key dependency)
DELETE FROM payment_transactions;

-- Delete tasks
DELETE FROM tasks;

-- Unlink visits from payments before deleting
UPDATE visits SET processed_in_payment_id = NULL, is_processed = false, processed_at = NULL;

-- Now delete payments
DELETE FROM payments;

-- Delete visits
DELETE FROM visits;

-- Delete staff (preserve admin and manager roles) and their profiles
DELETE FROM profiles 
WHERE id IN (SELECT profile_id FROM staff WHERE role NOT IN ('admin', 'manager'));

DELETE FROM staff 
WHERE role NOT IN ('admin', 'manager');

-- Delete doctors and their profiles
DELETE FROM profiles 
WHERE id IN (SELECT profile_id FROM doctors);

DELETE FROM doctors;

-- Clean up any orphaned user_sessions
DELETE FROM user_sessions 
WHERE user_type IN ('doctor', 'staff') 
AND original_id NOT IN (
  SELECT id FROM doctors 
  UNION 
  SELECT id FROM staff WHERE role IN ('admin', 'manager')
);