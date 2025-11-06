-- Migration: Grant managers access to staff and visit management
-- This migration adds RLS policies and auto-grants permissions for managers

-- Step 1: Add RLS policies for managers to access visits table
-- Allow managers to view all visits
CREATE POLICY "Managers can view all visits"
ON visits
FOR SELECT
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation));

-- Allow managers to manage visits (insert, update, delete)
CREATE POLICY "Managers can manage visits"
ON visits
FOR ALL
TO authenticated
USING (has_designation(auth.uid(), 'manager'::app_designation))
WITH CHECK (has_designation(auth.uid(), 'manager'::app_designation));

-- Step 2: Grant default screen access to existing managers
-- Grant staff_management access to all existing managers
INSERT INTO user_screen_access (staff_id, screen_module, can_view, can_edit, granted_by, notes)
SELECT 
  s.id,
  'staff_management',
  true,
  true,
  NULL, -- System grant
  'Auto-granted default manager permission'
FROM staff s
JOIN user_designations ud ON ud.user_id = s.user_id
WHERE ud.designation = 'manager'
  AND NOT EXISTS (
    SELECT 1 FROM user_screen_access usa
    WHERE usa.staff_id = s.id AND usa.screen_module = 'staff_management'
  );

-- Grant visit_management access to all existing managers
INSERT INTO user_screen_access (staff_id, screen_module, can_view, can_edit, granted_by, notes)
SELECT 
  s.id,
  'visit_management',
  true,
  true,
  NULL,
  'Auto-granted default manager permission'
FROM staff s
JOIN user_designations ud ON ud.user_id = s.user_id
WHERE ud.designation = 'manager'
  AND NOT EXISTS (
    SELECT 1 FROM user_screen_access usa
    WHERE usa.staff_id = s.id AND usa.screen_module = 'visit_management'
  );

-- Step 3: Create function to auto-grant permissions to new managers
CREATE OR REPLACE FUNCTION grant_default_manager_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
BEGIN
  -- Only run if the new designation is 'manager'
  IF NEW.designation = 'manager' THEN
    -- Get the staff_id for this user
    SELECT id INTO v_staff_id
    FROM staff
    WHERE user_id = NEW.user_id;
    
    IF v_staff_id IS NOT NULL THEN
      -- Grant staff management access
      INSERT INTO user_screen_access (staff_id, screen_module, can_view, can_edit, notes)
      VALUES (v_staff_id, 'staff_management', true, true, 'Auto-granted default manager permission')
      ON CONFLICT (staff_id, screen_module) DO NOTHING;
      
      -- Grant visit management access
      INSERT INTO user_screen_access (staff_id, screen_module, can_view, can_edit, notes)
      VALUES (v_staff_id, 'visit_management', true, true, 'Auto-granted default manager permission')
      ON CONFLICT (staff_id, screen_module) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger to auto-grant permissions
DROP TRIGGER IF EXISTS auto_grant_manager_permissions ON user_designations;
CREATE TRIGGER auto_grant_manager_permissions
AFTER INSERT ON user_designations
FOR EACH ROW
EXECUTE FUNCTION grant_default_manager_permissions();

-- Add helpful comment
COMMENT ON FUNCTION grant_default_manager_permissions() IS 
'Automatically grants staff_management and visit_management screen access when a new manager designation is created';