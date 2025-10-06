-- Drop profile_id column from doctors table (no longer needed)
ALTER TABLE public.doctors DROP COLUMN IF EXISTS profile_id;

-- Drop profile_id column from staff table (no longer needed)
ALTER TABLE public.staff DROP COLUMN IF EXISTS profile_id;