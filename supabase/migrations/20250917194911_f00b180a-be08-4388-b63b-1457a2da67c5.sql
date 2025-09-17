-- Remove all staff except doctors
DELETE FROM public.staff WHERE role != 'doctor';

-- Remove all tasks
DELETE FROM public.tasks;