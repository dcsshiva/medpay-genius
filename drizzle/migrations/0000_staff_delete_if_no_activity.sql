CREATE OR REPLACE FUNCTION public.get_staff_activity_summary(_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res jsonb;
BEGIN
  SELECT jsonb_build_object(
    'tasks', (SELECT count(*) FROM tasks WHERE assigned_to = _staff_id OR assigned_by = _staff_id),
    'complaints', (SELECT count(*) FROM complaints WHERE raised_by = _staff_id OR complaint_against = _staff_id OR submitted_to = _staff_id OR taken_care_by = _staff_id OR resolved_by = _staff_id),
    'leave_applications', (SELECT count(*) FROM leave_permission_applications WHERE applicant_id = _staff_id OR approver_id = _staff_id OR approved_by = _staff_id OR rejected_by = _staff_id),
    'appraisals', (SELECT count(*) FROM staff_appraisals WHERE staff_id = _staff_id),
    'daily_activities', (SELECT count(*) FROM staff_daily_activities WHERE staff_id = _staff_id),
    'payments', (SELECT count(*) FROM staff_payments WHERE staff_id = _staff_id),
    'payroll', (SELECT count(*) FROM staff_payroll WHERE staff_id = _staff_id),
    'warnings', (SELECT count(*) FROM staff_warnings WHERE staff_id = _staff_id),
    'salary_structure', (SELECT count(*) FROM staff_salary_structure WHERE staff_id = _staff_id)
  ) INTO res;

  RETURN res || jsonb_build_object(
    'total', (SELECT coalesce(sum(value::int), 0) FROM jsonb_each_text(res))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_activity_summary(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_staff_member(_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity jsonb;
  st record;
BEGIN
  IF NOT public.current_user_has_role(ARRAY['admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can delete staff records');
  END IF;

  SELECT * INTO st FROM staff WHERE id = _staff_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff member not found');
  END IF;

  activity := public.get_staff_activity_summary(_staff_id);
  IF (activity->>'total')::int > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff member has activity records and cannot be deleted', 'activity', activity);
  END IF;

  DELETE FROM notifications WHERE staff_id = _staff_id;
  DELETE FROM user_screen_access WHERE staff_id = _staff_id;
  DELETE FROM user_approval_permissions WHERE staff_id = _staff_id;
  DELETE FROM user_access_history WHERE staff_id = _staff_id;
  DELETE FROM staff_screen_permissions WHERE staff_id = _staff_id;
  DELETE FROM staff_approval_permissions WHERE staff_id = _staff_id;
  UPDATE navigation_analytics SET staff_id = NULL WHERE staff_id = _staff_id;

  IF st.user_id IS NOT NULL THEN
    DELETE FROM user_designations WHERE user_id = st.user_id;
  END IF;

  DELETE FROM staff WHERE id = _staff_id;

  RETURN jsonb_build_object('success', true, 'deleted_staff_code', st.staff_code, 'deleted_name', st.full_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_staff_member(uuid) TO authenticated, service_role;