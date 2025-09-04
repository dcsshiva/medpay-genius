-- Reset admin user password to known value
-- First, let's create a fresh admin user setup
DO $$
BEGIN
    -- Update existing admin user password in auth.users
    UPDATE auth.users 
    SET encrypted_password = crypt('admin123', gen_salt('bf'))
    WHERE email = 'admin@admin.com';
    
    -- Ensure profile exists with correct role
    INSERT INTO profiles (user_id, full_name, role)
    VALUES ('615fd30d-7b8a-4977-a585-80b44faafb7f', 'Admin User', 'admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        full_name = 'Admin User',
        role = 'admin';
END $$;