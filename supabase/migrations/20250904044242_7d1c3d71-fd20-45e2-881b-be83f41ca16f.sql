-- Create a profile for the existing admin user
INSERT INTO public.profiles (user_id, full_name, role)
VALUES ('615fd30d-7b8a-4977-a585-80b44faafb7f', 'admin', 'admin')
ON CONFLICT (user_id) DO NOTHING;