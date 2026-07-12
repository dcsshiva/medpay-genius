-- ============================================================================
-- Manual migration: delete_unpaid_visit RPC
-- ----------------------------------------------------------------------------
-- Run this file against the project's Postgres database (canonical Supabase
-- URL: https://chbntbekbgetbyyxapqh.supabase.co) via SQL Editor or psql.
-- It is NOT executed by the Lovable migration tool because this project uses
-- an external Supabase instance.
--
-- Adds a SECURITY DEFINER function that allows an admin or manager to delete
-- a truly unpaid visit (never processed into a payment). Doctors and staff
-- cannot call it. The function refuses to delete any visit that is already
-- linked to a payment or has been processed.
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
  v_role         text;
  v_is_processed boolean;
  v_linked_count integer;
  v_doctor_id    uuid;
  v_visit_code   text;
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT public.get_user_role(auth.uid())::text INTO v_role;
  IF v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Only admin or manager can delete unpaid visits (role: %)', COALESCE(v_role, 'none')
      USING ERRCODE = '42501';
  END IF;

  -- Load the visit
  SELECT v.is_processed, v.doctor_id, v.visit_code
    INTO v_is_processed, v_doctor_id, v_visit_code
  FROM public.visits v
  WHERE v.id = _visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % not found', _visit_id USING ERRCODE = 'P0002';
  END IF;

  -- Refuse if the visit was ever processed into a payment run
  IF COALESCE(v_is_processed, false) = true THEN
    RAISE EXCEPTION 'Visit % has already been processed and cannot be deleted', v_visit_code
      USING ERRCODE = '22023';
  END IF;

  -- Refuse if the visit is linked to any payment (bank advice generated)
  SELECT count(*) INTO v_linked_count
  FROM public.payment_visits pv
  WHERE pv.visit_id = _visit_id;

  IF v_linked_count > 0 THEN
    RAISE EXCEPTION 'Visit % is linked to % payment(s) and cannot be deleted', v_visit_code, v_linked_count
      USING ERRCODE = '22023';
  END IF;

  -- Delete
  DELETE FROM public.visits WHERE id = _visit_id;

  RETURN jsonb_build_object(
    'success',    true,
    'visit_id',   _visit_id,
    'visit_code', v_visit_code,
    'doctor_id',  v_doctor_id,
    'deleted_by', auth.uid(),
    'role',       v_role,
    'reason',     _reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_unpaid_visit(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_unpaid_visit(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.delete_unpaid_visit(uuid, text) IS
  'Admin/manager-only. Deletes a visit that has never been processed and is not linked to any payment. Returns jsonb result.';
