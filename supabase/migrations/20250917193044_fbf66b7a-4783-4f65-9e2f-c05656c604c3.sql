-- RPC to get counts of tasks for a staff member (bypass RLS via SECURITY DEFINER)
create or replace function public.get_staff_task_counts(_staff_id uuid)
returns table(pending_count integer, in_progress_count integer, completed_count integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    count(*) filter (where status in ('pending','overdue')) as pending_count,
    count(*) filter (where status = 'in_progress') as in_progress_count,
    count(*) filter (where status = 'completed') as completed_count
  from public.tasks
  where assigned_to = _staff_id;
end;
$$;

-- RPC to get tasks for a staff member (fields used by UI)
create or replace function public.get_staff_tasks(_staff_id uuid)
returns table(
  id uuid,
  task_title text,
  task_description text,
  priority text,
  status text,
  due_date timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz,
  assigned_to_staff_code text,
  assigned_to_full_name text,
  assigned_to_role text,
  assigned_by_staff_code text,
  assigned_by_full_name text
)
language sql
security definer
set search_path = public
as $$
  select 
    t.id,
    t.task_title,
    t.task_description,
    t.priority::text,
    t.status::text,
    t.due_date,
    t.completed_at,
    t.notes,
    t.created_at,
    s_to.staff_code as assigned_to_staff_code,
    s_to.full_name  as assigned_to_full_name,
    s_to.role::text as assigned_to_role,
    s_by.staff_code as assigned_by_staff_code,
    s_by.full_name  as assigned_by_full_name
  from public.tasks t
  join public.staff s_to on t.assigned_to = s_to.id
  left join public.staff s_by on t.assigned_by = s_by.id
  where t.assigned_to = _staff_id
  order by t.created_at desc;
$$;