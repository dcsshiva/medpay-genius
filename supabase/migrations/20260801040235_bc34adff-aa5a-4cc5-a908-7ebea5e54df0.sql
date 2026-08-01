-- 1. Drop the permissive insert policy that allowed any authenticated user to send messages
DROP POLICY IF EXISTS "Staff users can send messages" ON public.messages;

-- 2. Create a trigger function that stamps the sender's real name and role from staff
CREATE OR REPLACE FUNCTION public.stamp_message_sender_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  staff_record record;
BEGIN
  -- Look up the staff record for the sender; this is safe because staff has a self-read policy.
  SELECT full_name, role INTO staff_record
  FROM public.staff
  WHERE user_id = NEW.sender_id
  LIMIT 1;

  IF staff_record IS NOT NULL THEN
    NEW.sender_name := staff_record.full_name;
    NEW.sender_role := staff_record.role;
  ELSE
    -- Fallback: clear any forged role/name if no staff record exists for this user.
    NEW.sender_name := NULL;
    NEW.sender_role := NULL;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.stamp_message_sender_identity() TO authenticated;

-- 3. Attach the trigger to INSERT and UPDATE
DROP TRIGGER IF EXISTS stamp_message_sender_identity ON public.messages;
CREATE TRIGGER stamp_message_sender_identity
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.stamp_message_sender_identity();

-- 4. Make sure the remaining INSERT policy is in place and restrictive
-- (It already exists and requires admin/manager/staff designation + sender_id = auth.uid())
DROP POLICY IF EXISTS "Staff, managers, and admins can create messages" ON public.messages;
CREATE POLICY "Staff, managers, and admins can create messages"
ON public.messages
FOR INSERT
TO public
WITH CHECK (
  sender_id = auth.uid()
  AND (
    has_designation(auth.uid(), 'admin')
    OR has_designation(auth.uid(), 'manager')
    OR has_designation(auth.uid(), 'staff')
  )
);

-- 5. Ensure UPDATE policy cannot change sender identity
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO public
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());