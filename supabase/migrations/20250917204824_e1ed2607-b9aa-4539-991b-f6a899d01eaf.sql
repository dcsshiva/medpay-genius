-- Fix the get_staff_task_counts function - cast bigint to integer
CREATE OR REPLACE FUNCTION public.get_staff_task_counts(_staff_id uuid)
RETURNS TABLE(pending_count integer, in_progress_count integer, completed_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  return query
  select 
    count(*) filter (where status in ('pending','overdue'))::integer as pending_count,
    count(*) filter (where status = 'in_progress')::integer as in_progress_count,
    count(*) filter (where status = 'completed')::integer as completed_count
  from public.tasks
  where assigned_to = _staff_id;
end;
$$;