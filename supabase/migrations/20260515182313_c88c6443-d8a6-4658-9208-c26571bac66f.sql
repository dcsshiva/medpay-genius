
-- 1) Soft-delete columns on history tables
ALTER TABLE public.bank_advice_history
  ADD COLUMN IF NOT EXISTS is_reverted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reverted_by uuid,
  ADD COLUMN IF NOT EXISTS reverted_at timestamptz,
  ADD COLUMN IF NOT EXISTS revert_reason text;

ALTER TABLE public.quick_payment_bank_advice_history
  ADD COLUMN IF NOT EXISTS is_reverted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reverted_by uuid,
  ADD COLUMN IF NOT EXISTS reverted_at timestamptz,
  ADD COLUMN IF NOT EXISTS revert_reason text;

ALTER TABLE public.staff_payment_bank_advice_history
  ADD COLUMN IF NOT EXISTS is_reverted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reverted_by uuid,
  ADD COLUMN IF NOT EXISTS reverted_at timestamptz,
  ADD COLUMN IF NOT EXISTS revert_reason text;

-- 2) Audit log
CREATE TABLE IF NOT EXISTS public.bank_advice_revert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  history_id uuid NOT NULL,
  payment_source text NOT NULL,
  filename text NOT NULL,
  payment_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_count integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  reverted_by uuid NOT NULL,
  reverted_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_advice_revert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and managers can view revert log" ON public.bank_advice_revert_log;
CREATE POLICY "Admins and managers can view revert log"
  ON public.bank_advice_revert_log FOR SELECT
  USING (
    has_designation(auth.uid(), 'admin'::app_designation)
    OR has_designation(auth.uid(), 'manager'::app_designation)
  );

DROP POLICY IF EXISTS "Admins can insert revert log" ON public.bank_advice_revert_log;
CREATE POLICY "Admins can insert revert log"
  ON public.bank_advice_revert_log FOR INSERT
  WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation));

-- 3) Revert RPC
CREATE OR REPLACE FUNCTION public.revert_bank_advice(
  p_history_id uuid,
  p_source text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_filename text;
  v_payment_ids jsonb;
  v_payment_count integer;
  v_total_amount numeric;
  v_recon_status text;
  v_is_reverted boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_designation(v_caller, 'admin'::app_designation) THEN
    RAISE EXCEPTION 'Only admins can revert bank advice';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  IF p_source NOT IN ('doctor', 'quick_payment', 'staff_payment') THEN
    RAISE EXCEPTION 'Invalid payment source: %', p_source;
  END IF;

  -- Load history row + clear payment flags per source
  IF p_source = 'doctor' THEN
    SELECT filename, payment_ids, payment_count, total_amount, reconciliation_status, is_reverted
      INTO v_filename, v_payment_ids, v_payment_count, v_total_amount, v_recon_status, v_is_reverted
      FROM public.bank_advice_history WHERE id = p_history_id;
  ELSIF p_source = 'quick_payment' THEN
    SELECT filename, payment_ids, payment_count, total_net_amount, reconciliation_status, is_reverted
      INTO v_filename, v_payment_ids, v_payment_count, v_total_amount, v_recon_status, v_is_reverted
      FROM public.quick_payment_bank_advice_history WHERE id = p_history_id;
  ELSE
    SELECT filename, payment_ids, payment_count, total_amount, reconciliation_status, is_reverted
      INTO v_filename, v_payment_ids, v_payment_count, v_total_amount, v_recon_status, v_is_reverted
      FROM public.staff_payment_bank_advice_history WHERE id = p_history_id;
  END IF;

  IF v_filename IS NULL THEN
    RAISE EXCEPTION 'Bank advice record not found';
  END IF;

  IF v_is_reverted THEN
    RAISE EXCEPTION 'This bank advice has already been reverted';
  END IF;

  IF v_recon_status IS NOT NULL AND v_recon_status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Cannot revert a bank advice whose reconciliation status is %', v_recon_status;
  END IF;

  -- Reset bank_advice_generated flags on the underlying payments
  IF p_source = 'doctor' THEN
    UPDATE public.payments
       SET bank_advice_generated = false,
           bank_advice_generated_at = NULL,
           bank_advice_generated_by = NULL,
           updated_at = now()
     WHERE id::text IN (SELECT jsonb_array_elements_text(v_payment_ids));

    UPDATE public.bank_advice_history
       SET is_reverted = true,
           reverted_by = v_caller,
           reverted_at = now(),
           revert_reason = p_reason,
           updated_at = now()
     WHERE id = p_history_id;

  ELSIF p_source = 'quick_payment' THEN
    UPDATE public.quick_payments
       SET bank_advice_generated = false,
           bank_advice_generated_at = NULL,
           bank_advice_generated_by = NULL,
           updated_at = now()
     WHERE id::text IN (SELECT jsonb_array_elements_text(v_payment_ids));

    UPDATE public.quick_payment_bank_advice_history
       SET is_reverted = true,
           reverted_by = v_caller,
           reverted_at = now(),
           revert_reason = p_reason,
           updated_at = now()
     WHERE id = p_history_id;

  ELSE
    UPDATE public.staff_payments
       SET bank_advice_generated = false,
           bank_advice_generated_at = NULL,
           bank_advice_generated_by = NULL,
           updated_at = now()
     WHERE id::text IN (SELECT jsonb_array_elements_text(v_payment_ids));

    UPDATE public.staff_payment_bank_advice_history
       SET is_reverted = true,
           reverted_by = v_caller,
           reverted_at = now(),
           revert_reason = p_reason,
           updated_at = now()
     WHERE id = p_history_id;
  END IF;

  INSERT INTO public.bank_advice_revert_log (
    history_id, payment_source, filename, payment_ids,
    payment_count, total_amount, reverted_by, reason
  ) VALUES (
    p_history_id, p_source, v_filename, COALESCE(v_payment_ids, '[]'::jsonb),
    COALESCE(v_payment_count, 0), COALESCE(v_total_amount, 0), v_caller, p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'filename', v_filename,
    'payment_count', v_payment_count,
    'total_amount', v_total_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.revert_bank_advice(uuid, text, text) TO authenticated;
