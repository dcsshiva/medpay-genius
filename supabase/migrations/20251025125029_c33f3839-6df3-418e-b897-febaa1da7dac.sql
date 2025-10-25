-- Delete both auth users for Arulmani Ayyamperumal cleanup
DELETE FROM auth.users 
WHERE id IN (
  '171448a2-40c3-40e8-8433-4a7e668f2db6',
  '77fed227-6e60-4f72-8394-a8427aa976a3'
);

-- Clean up the staff record reference
UPDATE public.staff 
SET user_id = NULL 
WHERE id = '665ced7e-4964-447d-a650-25a659aa822c';