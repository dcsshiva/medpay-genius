-- ============================================================================
-- Manual migration v2: delete_unpaid_visit RPC (relaxed rules)
-- ----------------------------------------------------------------------------
-- Run against the project's Postgres DB (https://chbntbekbgetbyyxapqh.supabase.co)
-- in Supabase SQL Editor. Not executed by the Lovable migration tool (external
-- Supabase instance).
--
-- Changes vs v1:
--   * Also allows deletion of a visit that is `is_processed = true` PROVIDED
--     every linked payment is still truly unpaid (never released, no releases
--     recorded, no bank advice generated, status not final-paid).
--   * When deletion is permitted:
--       - removes payment_visits links,
--       - recomputes totals on remaining payments,
--       - deletes any payment that becomes empty,
--       - deletes the visit.
--   * Refuses with a specific reason (payment id + why) when a linked payment
--     has already been released or advised.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_unpaid_visit(
  _visit_id uuid,
  _reason   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role             text;
  v_is_processed    boolean;
  v_doctor_id        uuid;
  v_visit_code       text;
  v_has_releases_tbl boolean;
  v_has_bank_advice  boolean;
  v_pay              record;
  v_release_count    integer;
  v_deleted_payments uuid[] := ARRAY[]::uuid[];
  v_updated_payments uuid[] := ARRAY[]::uuid[];
  v_pid              uuid;
  v_remaining        integer;
BEGIN
  -- Auth
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT public.get_user_role(auth.uid())::text INTO v_role;
  IF v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Only admin or manager can delete unpaid visits (role: %)', COALESCE(v_role, 'none')
      USING ERRCODE = '42501';
  END IF;

  -- Load visit (lock)
  SELECT v.is_processed, v.doctor_id, v.visit_code
    INTO v_is_processed, v_doctor_id, v_visit_code
  FROM public.visits v
  WHERE v.id = _visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % not found', _visit_id USING ERRCODE = 'P0002';
  END IF;

  -- Feature detection: payment_releases table + bank_advice_generated column
  v_has_releases_tbl := to_regclass('public.payment_releases') IS NOT NULL;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments' AND column_name='bank_advice_generated'
  ) INTO v_has_bank_advice;

  -- Validate every linked payment is still "truly unpaid"
  FOR v_pay IN
    SELECT p.*
    FROM public.payment_visits pv
    JOIN public.payments p ON p.id = pv.payment_id
    WHERE pv.visit_id = _visit_id
    FOR UPDATE OF p
  LOOP
    -- release_status must be one of unreleased states (or NULL)
    IF COALESCE(v_pay.release_status, 'not_started') NOT IN ('not_started', 'pending') THEN
      RAISE EXCEPTION 'Visit % is linked to payment % which is already % — cannot delete',
        v_visit_code, v_pay.id, v_pay.release_status
        USING ERRCODE = '22023';
    END IF;

    -- payment status must not be a finalised paid state
    IF v_pay.status::text IN ('paid', 'released', 'completed') THEN
      RAISE EXCEPTION 'Visit % is linked to payment % with status % — cannot delete',
        v_visit_code, v_pay.id, v_pay.status
        USING ERRCODE = '22023';
    END IF;

    -- bank advice generated?
    IF v_has_bank_advice THEN
      IF (row_to_json(v_pay)->>'bank_advice_generated')::boolean IS TRUE THEN
        RAISE EXCEPTION 'Visit % is linked to payment % whose bank advice has already been generated — cannot delete',
          v_visit_code, v_pay.id
          USING ERRCODE = '22023';
      END IF;
    END IF;

    -- any release rows?
    IF v_has_releases_tbl THEN
      EXECUTE 'SELECT count(*) FROM public.payment_releases WHERE payment_id = $1'
        INTO v_release_count USING v_pay.id;
      IF v_release_count > 0 THEN
        RAISE EXCEPTION 'Visit % is linked to payment % which has % release record(s) — cannot delete',
          v_visit_code, v_pay.id, v_release_count
          USING ERRCODE = '22023';
      END IF;
    END IF;
  END LOOP;

  -- Collect affected payment ids before we cut the links
  SELECT COALESCE(array_agg(DISTINCT payment_id), ARRAY[]::uuid[])
    INTO v_updated_payments
  FROM public.payment_visits
  WHERE visit_id = _visit_id;

  -- Remove links
  DELETE FROM public.payment_visits WHERE visit_id = _visit_id;

  -- Recompute totals / delete empty payments
  FOREACH v_pid IN ARRAY v_updated_payments LOOP
    SELECT count(*) INTO v_remaining
    FROM public.payment_visits WHERE payment_id = v_pid;

    IF v_remaining = 0 THEN
      DELETE FROM public.payments WHERE id = v_pid;
      v_deleted_payments := array_append(v_deleted_payments, v_pid);
    ELSE
      UPDATE public.payments p
      SET
        total_visits = v_remaining,
        total_amount = COALESCE((
          SELECT sum(COALESCE(v.visit_payment, 0) * COALESCE(v.patient_count, 1))
          FROM public.payment_visits pv
          JOIN public.visits v ON v.id = pv.visit_id
          WHERE pv.payment_id = v_pid
        ), 0),
        updated_at = now()
      WHERE p.id = v_pid;
    END IF;
  END LOOP;

  -- Strip deleted payments from the "updated" list
  IF array_length(v_deleted_payments, 1) IS NOT NULL THEN
    SELECT COALESCE(array_agg(x), ARRAY[]::uuid[])
      INTO v_updated_payments
    FROM unnest(v_updated_payments) x
    WHERE x <> ALL (v_deleted_payments);
  END IF;

  -- Finally delete the visit
  DELETE FROM public.visits WHERE id = _visit_id;

  RETURN jsonb_build_object(
    'success',            true,
    'visit_id',           _visit_id,
    'visit_code',         v_visit_code,
    'doctor_id',          v_doctor_id,
    'deleted_by',         auth.uid(),
    'role',               v_role,
    'reason',             _reason,
    'was_processed',      v_is_processed,
    'deleted_payment_ids', to_jsonb(v_deleted_payments),
    'updated_payment_ids', to_jsonb(v_updated_payments)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_unpaid_visit(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_unpaid_visit(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.delete_unpaid_visit(uuid, text) IS
  'Admin/manager-only. Deletes a visit that is either unprocessed OR processed but whose linked payment(s) have not been released, advised, or paid out. Recomputes payment totals; removes payments that become empty.';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
