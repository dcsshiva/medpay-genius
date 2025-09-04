-- Clear all existing data from tables
-- Delete in order to avoid foreign key constraint violations

-- Clear payment transactions first (references payments)
DELETE FROM payment_transactions;

-- Clear payments (references doctors)
DELETE FROM payments;

-- Clear visits (references doctors)
DELETE FROM visits;

-- Clear tasks (references staff)
DELETE FROM tasks;

-- Clear complaints (references staff)
DELETE FROM complaints;

-- Clear doctors (references profiles)
DELETE FROM doctors;

-- Clear staff (no foreign key dependencies)
DELETE FROM staff;

-- Clear profiles last (referenced by doctors)
DELETE FROM profiles;