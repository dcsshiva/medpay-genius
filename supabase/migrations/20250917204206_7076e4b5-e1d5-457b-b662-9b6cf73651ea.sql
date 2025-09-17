-- Check and update user_role enum to include 'staff'
-- First, let's see what values are currently in the enum
DO $$
BEGIN
    -- Add 'staff' to user_role enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'staff' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'staff';
    END IF;
END $$;