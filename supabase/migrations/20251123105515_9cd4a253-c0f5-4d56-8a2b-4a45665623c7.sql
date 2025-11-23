-- Create comprehensive TDS summary function for all payment types
CREATE OR REPLACE FUNCTION public.get_comprehensive_tds_summary(
  _start_date DATE,
  _end_date DATE
)
RETURNS TABLE(
  beneficiary_type TEXT,
  beneficiary_code TEXT,
  beneficiary_name TEXT,
  payment_type TEXT,
  total_payments BIGINT,
  total_gross_amount NUMERIC,
  total_tds_amount NUMERIC,
  total_net_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Doctor Cash Payments
  SELECT 
    'Doctor'::TEXT as beneficiary_type,
    d.doctor_code as beneficiary_code,
    COALESCE(d.full_name, 'Doctor') as beneficiary_name,
    'Cash'::TEXT as payment_type,
    COUNT(p.id)::BIGINT as total_payments,
    COALESCE(SUM(p.gross_amount), 0) as total_gross_amount,
    COALESCE(SUM(p.tds_amount), 0) as total_tds_amount,
    COALESCE(SUM(p.net_amount), 0) as total_net_amount
  FROM public.doctors d
  INNER JOIN public.payments p ON p.doctor_id = d.id
  WHERE p.cash_approval_status = 'approved'
    AND p.bank_advice_generated = true
    AND p.period_end BETWEEN _start_date AND _end_date
    AND d.is_active = true
  GROUP BY d.id, d.doctor_code, d.full_name
  HAVING COUNT(p.id) > 0
  
  UNION ALL
  
  -- Doctor Insurance Payments
  SELECT 
    'Doctor'::TEXT as beneficiary_type,
    d.doctor_code as beneficiary_code,
    COALESCE(d.full_name, 'Doctor') as beneficiary_name,
    'Insurance'::TEXT as payment_type,
    COUNT(p.id)::BIGINT as total_payments,
    COALESCE(SUM(p.gross_amount), 0) as total_gross_amount,
    COALESCE(SUM(p.tds_amount), 0) as total_tds_amount,
    COALESCE(SUM(p.net_amount), 0) as total_net_amount
  FROM public.doctors d
  INNER JOIN public.payments p ON p.doctor_id = d.id
  WHERE p.insurance_approval_status = 'approved'
    AND p.bank_advice_generated = true
    AND p.period_end BETWEEN _start_date AND _end_date
    AND d.is_active = true
  GROUP BY d.id, d.doctor_code, d.full_name
  HAVING COUNT(p.id) > 0
  
  UNION ALL
  
  -- Quick Payments
  SELECT 
    'Vendor'::TEXT as beneficiary_type,
    ''::TEXT as beneficiary_code,
    qp.name as beneficiary_name,
    COALESCE(qpt.type_name, 'Quick Payment')::TEXT as payment_type,
    COUNT(qp.id)::BIGINT as total_payments,
    COALESCE(SUM(qp.gross_amount), 0) as total_gross_amount,
    COALESCE(SUM(qp.tds_amount), 0) as total_tds_amount,
    COALESCE(SUM(qp.net_amount), 0) as total_net_amount
  FROM public.quick_payments qp
  LEFT JOIN public.quick_payment_types qpt ON qp.payment_type_id = qpt.id
  WHERE qp.bank_advice_generated = true
    AND qp.created_at::DATE BETWEEN _start_date AND _end_date
  GROUP BY qp.name, qpt.type_name
  HAVING COUNT(qp.id) > 0
  
  ORDER BY beneficiary_type, beneficiary_code, beneficiary_name;
END;
$$;