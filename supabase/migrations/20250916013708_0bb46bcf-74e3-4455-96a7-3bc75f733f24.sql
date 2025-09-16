-- Create secure RPC functions for data access without requiring anonymous auth

-- Function to get visits for custom auth sessions
create or replace function public.get_user_visits(_user_type text, _user_id uuid, _user_role text)
returns table (
  id uuid,
  visit_date date,
  patient_count integer,
  patient_id text,
  patient_name text,
  visit_payment numeric,
  payment_type text,
  visit_reason text,
  notes text,
  doctor_id uuid,
  doctor_code text,
  doctor_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Doctors can only see their own visits
  if _user_type = 'doctor' then
    return query
    select 
      v.id, v.visit_date, v.patient_count, v.patient_id, v.patient_name,
      v.visit_payment, v.payment_type, v.visit_reason, v.notes, v.doctor_id,
      d.doctor_code, coalesce(p.full_name, 'Doctor') as doctor_name
    from visits v
    join doctors d on v.doctor_id = d.id
    left join profiles p on d.profile_id = p.id
    where d.id = _user_id
    order by v.visit_date desc;
  -- Admins and managers can see all visits  
  elsif _user_role in ('admin', 'manager') then
    return query
    select 
      v.id, v.visit_date, v.patient_count, v.patient_id, v.patient_name,
      v.visit_payment, v.payment_type, v.visit_reason, v.notes, v.doctor_id,
      d.doctor_code, coalesce(p.full_name, 'Doctor') as doctor_name
    from visits v
    join doctors d on v.doctor_id = d.id
    left join profiles p on d.profile_id = p.id
    order by v.visit_date desc;
  end if;
end;
$$;

-- Function to get payments for custom auth sessions
create or replace function public.get_user_payments(_user_type text, _user_id uuid, _user_role text)
returns table (
  id uuid,
  period_start date,
  period_end date,
  total_visits integer,
  rate_per_visit numeric,
  total_amount numeric,
  paid_amount numeric,
  remaining_amount numeric,
  is_fully_paid boolean,
  payment_notes text,
  status text,
  manager_approved_by uuid,
  manager_approved_at timestamptz,
  admin_approved_by uuid,
  admin_approved_at timestamptz,
  rejected_by uuid,
  rejected_at timestamptz,
  rejection_reason text,
  doctor_id uuid,
  doctor_code text,
  doctor_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Doctors can only see their own payments
  if _user_type = 'doctor' then
    return query
    select 
      p.id, p.period_start, p.period_end, p.total_visits, p.rate_per_visit,
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
      p.id, p.period_start, p.period_end, p.total_visits, p.rate_per_visit,
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