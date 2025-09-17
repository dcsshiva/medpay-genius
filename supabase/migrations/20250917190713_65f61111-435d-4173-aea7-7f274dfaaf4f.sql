-- Drop the existing get_user_payments function first
DROP FUNCTION IF EXISTS get_user_payments(text, uuid, text);

-- Recreate the get_user_payments RPC function without rate_per_visit references
CREATE OR REPLACE FUNCTION get_user_payments(_user_type text, _user_id uuid, _user_role text)
RETURNS TABLE (
  id uuid,
  period_start date,
  period_end date, 
  total_visits integer,
  total_amount numeric,
  paid_amount numeric,
  remaining_amount numeric,
  is_fully_paid boolean,
  payment_notes text,
  status text,
  manager_approved_by uuid,
  manager_approved_at timestamp with time zone,
  admin_approved_by uuid, 
  admin_approved_at timestamp with time zone,
  rejected_by uuid,
  rejected_at timestamp with time zone,
  rejection_reason text,
  doctor_id uuid,
  doctor_code text,
  doctor_name text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  -- Doctors can only see their own payments
  if _user_type = 'doctor' then
    return query
    select 
      p.id, p.period_start, p.period_end, p.total_visits,
      p.total_amount, p.paid_amount, p.remaining_amount, p.is_fully_paid,
      p.payment_notes, p.status::text, p.manager_approved_by, p.manager_approved_at,
      p.admin_approved_by, p.admin_approved_at, p.rejected_by, p.rejected_at,
      p.rejection_reason, p.doctor_id, d.doctor_code, 
      coalesce(prof.full_name, 'Doctor') as doctor_name
    from payments p
    join doctors d on p.doctor_id = d.id
    left join profiles prof on d.profile_id = prof.id
    where d.id = _user_id
    order by p.created_at desc;
  -- Admins and managers can see all payments  
  elsif _user_role in ('admin', 'manager') then
    return query
    select 
      p.id, p.period_start, p.period_end, p.total_visits,
      p.total_amount, p.paid_amount, p.remaining_amount, p.is_fully_paid,
      p.payment_notes, p.status::text, p.manager_approved_by, p.manager_approved_at,
      p.admin_approved_by, p.admin_approved_at, p.rejected_by, p.rejected_at,
      p.rejection_reason, p.doctor_id, d.doctor_code, 
      coalesce(prof.full_name, 'Doctor') as doctor_name
    from payments p
    join doctors d on p.doctor_id = d.id
    left join profiles prof on d.profile_id = prof.id
    order by p.created_at desc;
  end if;
end;
$$;