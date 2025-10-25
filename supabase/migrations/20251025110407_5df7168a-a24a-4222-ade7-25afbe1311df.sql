-- Remove admin designation for doctor DOC0112 (user_id: 958e506c-b6e4-4e22-be7b-a5533b8b8ff8)
-- Keep doctor profile intact but inactive
DELETE FROM public.user_designations
WHERE user_id = '958e506c-b6e4-4e22-be7b-a5533b8b8ff8'
  AND designation = 'admin';