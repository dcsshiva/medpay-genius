-- Update the existing admin@admin.com user to have admin role
UPDATE public.profiles 
SET role = 'admin'::user_role, full_name = 'System Administrator'
WHERE user_id = 'f89f488a-5bd2-4b38-a0af-a96d09061466';