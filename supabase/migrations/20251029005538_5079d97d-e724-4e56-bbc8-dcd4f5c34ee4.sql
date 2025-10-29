-- Add super_admin to app_designation enum
ALTER TYPE app_designation ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';