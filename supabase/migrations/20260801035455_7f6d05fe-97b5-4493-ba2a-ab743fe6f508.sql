DROP POLICY IF EXISTS "Managers and doctors can view payment transactions" ON public.payment_transactions;

CREATE POLICY "Managers and doctors can view own payment transactions"
ON public.payment_transactions
FOR SELECT
TO public
USING (
  -- Managers and admins can view all payment transactions
  get_user_role(auth.uid()) = ANY (ARRAY['manager'::user_role, 'admin'::user_role])
  OR
  -- Doctors can only view payment transactions linked to their own payments
  (
    get_user_role(auth.uid()) = 'doctor'::user_role
    AND EXISTS (
      SELECT 1
      FROM public.payments p
      JOIN public.doctors d ON d.id = p.doctor_id
      WHERE p.id = payment_transactions.payment_id
        AND d.user_id = auth.uid()
    )
  )
);

-- Restrict bank reconciliation proof downloads to admins/managers.
DROP POLICY IF EXISTS "Authenticated users can view reconciliation proofs" ON storage.objects;

CREATE POLICY "Admins and managers can view reconciliation proofs"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'bank-reconciliation-proofs'
  AND (
    has_designation(auth.uid(), 'admin')
    OR has_designation(auth.uid(), 'manager')
  )
);