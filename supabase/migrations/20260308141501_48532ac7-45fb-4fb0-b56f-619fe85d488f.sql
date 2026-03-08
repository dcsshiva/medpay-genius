CREATE OR REPLACE FUNCTION public.get_doctor_hub_summaries(_filter_doctor_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  doctor_code text,
  full_name text,
  paid_amount numeric,
  unpaid_amount numeric,
  total_amount numeric,
  paid_count bigint,
  unpaid_visits_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.doctor_code,
    COALESCE(d.full_name, 'Doctor')::text AS full_name,
    COALESCE(paid.paid_amount, 0) AS paid_amount,
    COALESCE(unprocessed.amount, 0) + COALESCE(pending_pv.amount, 0) AS unpaid_amount,
    COALESCE(paid.paid_amount, 0) + COALESCE(unprocessed.amount, 0) + COALESCE(pending_pv.amount, 0) AS total_amount,
    COALESCE(paid.paid_count, 0) AS paid_count,
    COALESCE(unprocessed.visit_count, 0) + COALESCE(pending_pv.visit_count, 0) AS unpaid_visits_count
  FROM public.doctors d
  LEFT JOIN LATERAL (
    SELECT
      SUM(p.net_amount) AS paid_amount,
      COUNT(p.id) AS paid_count
    FROM public.payments p
    WHERE p.doctor_id = d.id
      AND p.bank_advice_generated = true
  ) paid ON true
  LEFT JOIN LATERAL (
    SELECT
      SUM(v.visit_payment) AS amount,
      COUNT(v.id) AS visit_count
    FROM public.visits v
    WHERE v.doctor_id = d.id
      AND v.is_processed = false
  ) unprocessed ON true
  LEFT JOIN LATERAL (
    SELECT
      SUM(v2.visit_payment) AS amount,
      COUNT(DISTINCT v2.id) AS visit_count
    FROM public.payment_visits pv
    JOIN public.visits v2 ON pv.visit_id = v2.id
    JOIN public.payments p2 ON pv.payment_id = p2.id
    WHERE p2.doctor_id = d.id
      AND p2.bank_advice_generated = false
      AND v2.is_processed = true
  ) pending_pv ON true
  WHERE
    CASE
      WHEN _filter_doctor_id IS NOT NULL THEN d.id = _filter_doctor_id
      ELSE d.is_active = true
    END
  ORDER BY d.doctor_code;
END;
$$;