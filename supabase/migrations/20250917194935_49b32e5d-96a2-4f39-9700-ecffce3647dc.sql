-- Remove all tasks first (to avoid foreign key constraints)
DELETE FROM public.tasks;

-- Then remove all staff except doctors
DELETE FROM public.staff WHERE role != 'doctor';