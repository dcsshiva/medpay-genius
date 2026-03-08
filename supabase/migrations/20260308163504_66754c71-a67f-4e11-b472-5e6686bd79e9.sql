
-- Add DELETE policy: users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Add DELETE policy: admins/managers can delete any message (moderation)
CREATE POLICY "Admins and managers can delete any message"
ON public.messages
FOR DELETE
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('admin'::user_role, 'manager'::user_role)
);
