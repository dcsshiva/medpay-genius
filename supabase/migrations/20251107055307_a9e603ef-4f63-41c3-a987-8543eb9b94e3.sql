-- Insert master_data access for all managers who don't have it yet
INSERT INTO public.user_screen_access (staff_id, screen_module, can_view, can_edit, notes)
SELECT 
  s.id as staff_id,
  'master_data'::screen_module,
  true as can_view,
  true as can_edit,
  'Auto-granted for manager role' as notes
FROM public.staff s
WHERE s.role = 'manager'
  AND s.is_active = true
  AND NOT EXISTS (
    SELECT 1 
    FROM public.user_screen_access usa 
    WHERE usa.staff_id = s.id 
    AND usa.screen_module = 'master_data'
  );

-- Create or replace function to automatically grant master_data access to managers
CREATE OR REPLACE FUNCTION public.grant_manager_master_access()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being set to manager, grant master_data access
  IF NEW.role = 'manager' AND (OLD.role IS NULL OR OLD.role != 'manager') THEN
    INSERT INTO public.user_screen_access (staff_id, screen_module, can_view, can_edit, notes)
    VALUES (NEW.id, 'master_data'::screen_module, true, true, 'Auto-granted for manager role')
    ON CONFLICT (staff_id, screen_module) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on staff table
DROP TRIGGER IF EXISTS auto_grant_manager_master_access ON public.staff;
CREATE TRIGGER auto_grant_manager_master_access
  AFTER INSERT OR UPDATE OF role
  ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_manager_master_access();