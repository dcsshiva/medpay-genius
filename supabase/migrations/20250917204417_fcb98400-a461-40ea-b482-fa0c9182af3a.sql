-- Ensure all staff roles are properly supported in both enums
-- Check and update staff_role enum to include all roles from the dropdown
DO $$
DECLARE
    role_values text[] := ARRAY['admin', 'manager', 'nurse', 'doctor', 'technician', 'receptionist', 'pharmacist', 'cleaner', 'security'];
    role_val text;
BEGIN
    -- Add each role to staff_role enum if it doesn't exist
    FOREACH role_val IN ARRAY role_values
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = role_val 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'staff_role')
        ) THEN
            EXECUTE format('ALTER TYPE staff_role ADD VALUE %L', role_val);
        END IF;
    END LOOP;
END $$;

-- Also ensure user_role enum has all the basic roles needed for profiles mapping
DO $$
DECLARE
    user_role_values text[] := ARRAY['admin', 'manager', 'doctor', 'staff'];
    role_val text;
BEGIN
    -- Add each role to user_role enum if it doesn't exist
    FOREACH role_val IN ARRAY user_role_values
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = role_val 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
        ) THEN
            EXECUTE format('ALTER TYPE user_role ADD VALUE %L', role_val);
        END IF;
    END LOOP;
END $$;