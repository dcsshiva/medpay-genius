-- =============================================================================
-- Configure Access: Dynamic Registry + Realtime Permissions
-- Run this once against the production Supabase project
-- (https://chbntbekbgetbyyxapqh.supabase.co) via SQL editor.
--
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING throughout.
-- Preserves existing admin/manager role configuration — admin & manager
-- roles are always treated as full-access at the app layer.
-- =============================================================================

-- ---------- 1. Registries ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.screen_registry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_key      text UNIQUE NOT NULL,
  screen_name     text NOT NULL,
  group_name      text NOT NULL DEFAULT 'General',
  route_path      text,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      int NOT NULL DEFAULT 0,
  super_admin_only boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approval_permission_registry (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key   text UNIQUE NOT NULL,
  permission_name  text NOT NULL,
  applicable_role  text NOT NULL DEFAULT 'manager', -- manager | admin | any
  group_name       text NOT NULL DEFAULT 'Approvals',
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------- 2. Staff / Admin permission mapping ----------------------------

CREATE TABLE IF NOT EXISTS public.staff_screen_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    uuid NOT NULL,
  screen_key  text NOT NULL,
  can_view    boolean NOT NULL DEFAULT false,
  can_edit    boolean NOT NULL DEFAULT false,
  updated_by  uuid,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, screen_key)
);

CREATE TABLE IF NOT EXISTS public.staff_approval_permissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id       uuid NOT NULL,
  permission_key text NOT NULL,
  can_approve    boolean NOT NULL DEFAULT false,
  updated_by     uuid,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.admin_screen_permissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id  uuid NOT NULL,
  screen_key     text NOT NULL,
  can_view       boolean NOT NULL DEFAULT false,
  can_edit       boolean NOT NULL DEFAULT false,
  updated_by     uuid,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id, screen_key)
);

CREATE TABLE IF NOT EXISTS public.permission_change_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id       uuid,
  admin_user_id  uuid,
  target_type    text NOT NULL,     -- 'screen' | 'approval' | 'admin_screen'
  target_key     text NOT NULL,
  old_value      jsonb,
  new_value      jsonb,
  notes          text,
  changed_by     uuid,
  changed_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------- 3. GRANTs -------------------------------------------------------

GRANT SELECT ON public.screen_registry TO authenticated, anon;
GRANT ALL    ON public.screen_registry TO service_role;

GRANT SELECT ON public.approval_permission_registry TO authenticated, anon;
GRANT ALL    ON public.approval_permission_registry TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_screen_permissions   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_approval_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_screen_permissions   TO authenticated;
GRANT SELECT, INSERT                 ON public.permission_change_log      TO authenticated;
GRANT ALL ON public.staff_screen_permissions, public.staff_approval_permissions,
             public.admin_screen_permissions, public.permission_change_log TO service_role;

-- ---------- 4. RLS ----------------------------------------------------------

ALTER TABLE public.screen_registry              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_permission_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_screen_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_approval_permissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_screen_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_change_log        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "screen_registry_read"  ON public.screen_registry;
CREATE POLICY "screen_registry_read"  ON public.screen_registry
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "approval_registry_read" ON public.approval_permission_registry;
CREATE POLICY "approval_registry_read" ON public.approval_permission_registry
  FOR SELECT USING (true);

-- Staff permission rows: staff can read their own; admin/manager can read all.
-- Writes handled through security-definer RPCs, so no direct write policy.
DROP POLICY IF EXISTS "ssp_read_own_or_admin" ON public.staff_screen_permissions;
CREATE POLICY "ssp_read_own_or_admin" ON public.staff_screen_permissions
  FOR SELECT USING (
    -- own row (staff.user_id = auth.uid())
    staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid()
                 AND ur.role IN ('admin','manager','super_admin'))
  );

DROP POLICY IF EXISTS "sap_read_own_or_admin" ON public.staff_approval_permissions;
CREATE POLICY "sap_read_own_or_admin" ON public.staff_approval_permissions
  FOR SELECT USING (
    staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid()
                 AND ur.role IN ('admin','manager','super_admin'))
  );

DROP POLICY IF EXISTS "asp_read_self_or_super" ON public.admin_screen_permissions;
CREATE POLICY "asp_read_self_or_super" ON public.admin_screen_permissions
  FOR SELECT USING (
    admin_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid()
                 AND ur.role IN ('admin','super_admin'))
  );

DROP POLICY IF EXISTS "log_read_admin" ON public.permission_change_log;
CREATE POLICY "log_read_admin" ON public.permission_change_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin','manager','super_admin'))
  );

-- ---------- 5. Realtime publication ----------------------------------------

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.screen_registry;              EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_permission_registry; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_screen_permissions;     EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_approval_permissions;   EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_screen_permissions;     EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

ALTER TABLE public.staff_screen_permissions   REPLICA IDENTITY FULL;
ALTER TABLE public.staff_approval_permissions REPLICA IDENTITY FULL;
ALTER TABLE public.admin_screen_permissions   REPLICA IDENTITY FULL;

-- ---------- 6. Seed data (matches current hardcoded lists) -----------------

INSERT INTO public.screen_registry (screen_key, screen_name, group_name, sort_order, super_admin_only) VALUES
  ('dashboard',                        'Dashboard',                 'Main',          10, false),
  ('user_guide',                       'User Guide',                'Help',          20, false),
  ('visit_management',                 'Visit Management',          'Management',    30, false),
  ('payment_management',               'Payment Management',        'Management',    40, false),
  ('doctor_management',                'Doctor Management',         'Management',    50, false),
  ('staff_management',                 'Staff Management',          'Management',    60, true),
  ('task_management',                  'Task Management',           'Management',    70, false),
  ('staff_appraisal',                  'Staff Appraisal',           'Management',    80, false),
  ('appraisals',                       'Staff Appraisals Management','Management',   90, false),
  ('complaint_management',             'Complaint Management',      'Management',   100, false),
  ('leave_permission',                 'Leave & Permission',        'Management',   110, false),
  ('leave_approvals',                  'Leave Approvals',           'Management',   120, false),
  ('payment_hub',                      'Payment Hub',               'Payments',     200, false),
  ('cash_payments',                    'Cash Payments',             'Payments',     210, false),
  ('insurance_payments',               'Insurance Payments',        'Payments',     220, false),
  ('quick_payment',                    'Quick Payment',             'Payments',     230, false),
  ('bank_advice_generation',           'Bank Advice (Legacy)',      'Bank Advice',  300, false),
  ('bank_advice_generation_beta',      'Bank Advice (Beta)',        'Bank Advice',  310, false),
  ('bank_advice_history',              'Bank Advice History',       'Bank Advice',  320, false),
  ('bank_advice_records',              'Bank Advice Records',       'Bank Advice',  330, false),
  ('bank_advice_payment_report',       'BA Payment Report',         'Bank Advice',  340, false),
  ('quick_payment_bank_advice_report', 'Quick Payment BA Report',   'Bank Advice',  350, false),
  ('report_generation',                'Report Generation',         'Reports',      400, false),
  ('bank_advice_reports',              'Bank Advice Reports',       'Reports',      410, false),
  ('tds_reports',                      'TDS Reports',               'Reports',      420, false),
  ('user_login_reports',               'User Login Reports',        'Reports',      430, false),
  ('login_reports',                    'Login Reports',             'Reports',      440, false),
  ('master_data',                      'Master Data',               'Settings',     500, false),
  ('settings',                         'Settings',                  'Settings',     510, true),
  ('version',                          'Version Management',        'Settings',     520, true),
  ('website_settings',                 'Website Settings',          'Settings',     530, false),
  ('team_chat',                        'Team Chat',                 'Communication',600, false)
ON CONFLICT (screen_key) DO NOTHING;

INSERT INTO public.approval_permission_registry (permission_key, permission_name, applicable_role, group_name, sort_order) VALUES
  ('cash_payment_manager',      'Cash Payment (Manager Level)',      'manager', 'Cash & Insurance',   10),
  ('cash_payment_admin',        'Cash Payment (Admin Level)',        'admin',   'Cash & Insurance',   20),
  ('insurance_payment_manager', 'Insurance Payment (Manager Level)', 'manager', 'Cash & Insurance',   30),
  ('insurance_payment_admin',   'Insurance Payment (Admin Level)',   'admin',   'Cash & Insurance',   40),
  ('quick_payment_approval',    'Quick Payment Approval',            'manager', 'Payments',           50),
  ('payment_rejection',         'Payment Rejection',                 'manager', 'Payments',           60),
  ('bank_advice_generation',    'Bank Advice Generation',            'admin',   'Payments',           70),
  ('staff_appraisal_approval',  'Staff Appraisal Approval',          'manager', 'HR',                 80),
  ('leave_permission_approval', 'Leave/Permission Approval',         'manager', 'HR',                 90),
  ('complaint_resolution',      'Complaint Resolution',              'manager', 'Operations',        100),
  ('master_data_changes',       'Master Data Changes',               'admin',   'Operations',        110)
ON CONFLICT (permission_key) DO NOTHING;

-- ---------- 7. RPCs ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_screen_registry()
RETURNS TABLE (
  screen_key text, screen_name text, group_name text,
  route_path text, sort_order int, super_admin_only boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT screen_key, screen_name, group_name, route_path, sort_order, super_admin_only
  FROM public.screen_registry
  WHERE is_active = true
  ORDER BY group_name, sort_order, screen_name;
$$;

CREATE OR REPLACE FUNCTION public.list_approval_registry()
RETURNS TABLE (
  permission_key text, permission_name text, applicable_role text,
  group_name text, sort_order int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT permission_key, permission_name, applicable_role, group_name, sort_order
  FROM public.approval_permission_registry
  WHERE is_active = true
  ORDER BY group_name, sort_order, permission_name;
$$;

CREATE OR REPLACE FUNCTION public.upsert_staff_screen_permission(
  _staff_id uuid, _screen_key text, _can_view boolean, _can_edit boolean,
  _notes text DEFAULT NULL, _actor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old jsonb; _actor uuid := COALESCE(_actor_id, auth.uid());
BEGIN
  SELECT to_jsonb(t) INTO _old FROM public.staff_screen_permissions t
   WHERE staff_id = _staff_id AND screen_key = _screen_key;

  INSERT INTO public.staff_screen_permissions
    (staff_id, screen_key, can_view, can_edit, updated_by, updated_at)
    VALUES (_staff_id, _screen_key, _can_view, _can_edit, _actor, now())
  ON CONFLICT (staff_id, screen_key) DO UPDATE
    SET can_view = EXCLUDED.can_view,
        can_edit = EXCLUDED.can_edit,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();

  INSERT INTO public.permission_change_log
    (staff_id, target_type, target_key, old_value, new_value, notes, changed_by)
    VALUES (_staff_id, 'screen', _screen_key, _old,
            jsonb_build_object('can_view', _can_view, 'can_edit', _can_edit),
            _notes, _actor);
END $$;

CREATE OR REPLACE FUNCTION public.upsert_staff_approval_permission(
  _staff_id uuid, _permission_key text, _can_approve boolean,
  _notes text DEFAULT NULL, _actor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old jsonb; _actor uuid := COALESCE(_actor_id, auth.uid());
BEGIN
  SELECT to_jsonb(t) INTO _old FROM public.staff_approval_permissions t
   WHERE staff_id = _staff_id AND permission_key = _permission_key;

  INSERT INTO public.staff_approval_permissions
    (staff_id, permission_key, can_approve, updated_by, updated_at)
    VALUES (_staff_id, _permission_key, _can_approve, _actor, now())
  ON CONFLICT (staff_id, permission_key) DO UPDATE
    SET can_approve = EXCLUDED.can_approve,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();

  INSERT INTO public.permission_change_log
    (staff_id, target_type, target_key, old_value, new_value, notes, changed_by)
    VALUES (_staff_id, 'approval', _permission_key, _old,
            jsonb_build_object('can_approve', _can_approve), _notes, _actor);
END $$;

CREATE OR REPLACE FUNCTION public.upsert_admin_screen_permission(
  _admin_user_id uuid, _screen_key text, _can_view boolean, _can_edit boolean,
  _notes text DEFAULT NULL, _actor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old jsonb; _actor uuid := COALESCE(_actor_id, auth.uid());
BEGIN
  SELECT to_jsonb(t) INTO _old FROM public.admin_screen_permissions t
   WHERE admin_user_id = _admin_user_id AND screen_key = _screen_key;

  INSERT INTO public.admin_screen_permissions
    (admin_user_id, screen_key, can_view, can_edit, updated_by, updated_at)
    VALUES (_admin_user_id, _screen_key, _can_view, _can_edit, _actor, now())
  ON CONFLICT (admin_user_id, screen_key) DO UPDATE
    SET can_view = EXCLUDED.can_view,
        can_edit = EXCLUDED.can_edit,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();

  INSERT INTO public.permission_change_log
    (admin_user_id, target_type, target_key, old_value, new_value, notes, changed_by)
    VALUES (_admin_user_id, 'admin_screen', _screen_key, _old,
            jsonb_build_object('can_view', _can_view, 'can_edit', _can_edit),
            _notes, _actor);
END $$;

CREATE OR REPLACE FUNCTION public.register_screen(
  _key text, _name text, _group text DEFAULT 'General',
  _route text DEFAULT NULL, _sort int DEFAULT 999
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.screen_registry (screen_key, screen_name, group_name, route_path, sort_order)
  VALUES (_key, _name, _group, _route, _sort)
  ON CONFLICT (screen_key) DO UPDATE
    SET screen_name = EXCLUDED.screen_name,
        group_name  = EXCLUDED.group_name,
        route_path  = EXCLUDED.route_path,
        updated_at  = now();
$$;

GRANT EXECUTE ON FUNCTION
  public.list_screen_registry(),
  public.list_approval_registry(),
  public.upsert_staff_screen_permission(uuid, text, boolean, boolean, text, uuid),
  public.upsert_staff_approval_permission(uuid, text, boolean, text, uuid),
  public.upsert_admin_screen_permission(uuid, text, boolean, boolean, text, uuid),
  public.register_screen(text, text, text, text, int)
TO authenticated, anon, service_role;
