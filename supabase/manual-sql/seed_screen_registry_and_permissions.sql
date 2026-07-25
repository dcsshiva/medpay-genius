-- ============================================================================
-- STEP 1 — Seed screen_registry + backfill staff/admin screen permissions
--
-- Idempotent: safe to run repeatedly. Existing rows are left untouched.
-- Run this BEFORE the code that consumes screenPermissions is expected to be
-- fully authoritative — the UI has a legacy fallback for any unseeded key.
-- ============================================================================

-- ---------- 1a. screen_registry -------------------------------------------------
INSERT INTO public.screen_registry
  (screen_key, screen_name, group_name, sort_order, is_active, super_admin_only)
VALUES
  -- Core
  ('dashboard',                    'Dashboard',                 'Core',           10, true, false),
  ('user-guide',                   'User Guide',                'Core',           20, true, false),
  ('masters',                      'Masters',                   'Core',           30, true, false),
  -- People
  ('staff',                        'Staff',                     'People',         40, true, false),
  ('staff-management',             'Staff Management',          'People',         41, true, false),
  ('doctors',                      'Doctor Management',         'People',         50, true, false),
  ('doctor-hub',                   'Doctor Hub',                'People',         60, true, false),
  ('doctor-management-reactivate', 'Doctor Reactivate',         'People',         61, true, false),
  ('attendance',                   'Attendance',                'People',         70, true, false),
  -- Visits
  ('visits',                       'Visit Management',          'Visits',         80, true, false),
  ('doctor-hub-delete-unpaid-visit','Delete Unpaid Visit (Doctor Hub)','Visits',  81, true, false),
  -- Payments
  ('cash-payments-lite',           'Cash Payments (Lite)',      'Payments',       90, true, false),
  ('insurance-payments-lite',      'Insurance Payments (Lite)', 'Payments',       91, true, false),
  ('cash-payments',                'Cash Payments',             'Payments',       92, true, false),
  ('insurance-payments',           'Insurance Payments',        'Payments',       93, true, false),
  ('quick-payment',                'Quick Payment',             'Payments',       94, true, false),
  -- Bank Advice
  ('bank-advice-generation-beta',  'Bank Advice (Beta)',        'Bank Advice',   100, true, false),
  ('bank-advice-generation',       'Bank Advice (Legacy)',      'Bank Advice',   101, true, false),
  ('bank-advice-history',          'BANK ADVICE HUB',           'Bank Advice',   102, true, false),
  ('bank-advice-records',          'Bank Advice Records',       'Bank Advice',   103, true, false),
  ('bank-advice-payment-report',   'BA Payment Report',         'Bank Advice',   104, true, false),
  ('quick-payment-bank-advice-report','Quick Payment BA Report','Bank Advice',   105, true, false),
  -- Reports
  ('tds-reports',                  'TDS Reports',               'Reports',       110, true, false),
  ('login-reports',                'Login Reports',             'Reports',       111, true, false),
  ('navigation-analytics',         'Navigation Analytics',      'Reports',       112, true, false),
  ('vendor-reports',               'Vendor Reports',            'Reports',       113, true, false),
  ('quick-payment-report',         'Quick Payment Report',      'Reports',       114, true, false),
  ('audit-trail',                  'Audit Trail',               'Reports',       115, true, false),
  -- Collaboration
  ('tasks',                        'Task Management',           'Collaboration', 120, true, false),
  ('appraisals',                   'Staff Management (Appraisals)','Collaboration',121,true,false),
  ('leave-approvals',              'Leave Approvals',           'Collaboration', 122, true, false),
  ('leave-permission',             'Leave & Permission',        'Collaboration', 123, true, false),
  ('complaints',                   'Complaint Management',      'Collaboration', 124, true, false),
  ('chat',                         'Team Chat',                 'Collaboration', 125, true, false),
  ('payroll',                      'Payroll',                   'Collaboration', 126, true, false),
  -- System
  ('version',                      'Version Management',        'System',        130, true, false),
  ('website-settings',             'Website Settings',          'System',        131, true, false),
  ('ai-knowledge-base',            'AI Knowledge Base',         'System',        132, true, false),
  ('settings',                     'Settings',                  'System',        133, true, false),
  ('settings-auth-sync',           'Settings — Auth Sync',      'System',        134, true, true),
  -- Dashboard variants (permission keys, not sidebar entries — hidden from nav)
  ('admin-dashboard',              'Admin Dashboard',           'Dashboards',    200, true, false),
  ('doctor-dashboard',             'Doctor Dashboard',          'Dashboards',    201, true, false),
  ('staff-dashboard',              'Staff Dashboard',           'Dashboards',    202, true, false)
ON CONFLICT (screen_key) DO NOTHING;

-- ---------- 1b. Backfill staff_screen_permissions from current staff roles -----
-- Helper CTE mapping current staff.role → screen_keys they should have today.
WITH role_view AS (
  -- MANAGER (matches navigationItems.ts manager branch)
  SELECT 'manager'::text AS role, unnest(ARRAY[
    'dashboard','user-guide','masters','appraisals','attendance','visits','doctors',
    'doctor-hub','cash-payments-lite','insurance-payments-lite','quick-payment',
    'bank-advice-generation-beta','bank-advice-generation','bank-advice-history',
    'bank-advice-records','tds-reports','cash-payments','insurance-payments',
    'bank-advice-payment-report','quick-payment-bank-advice-report','tasks',
    'leave-approvals','complaints','vendor-reports','quick-payment-report',
    'payroll','chat','staff-management','admin-dashboard'
  ]) AS screen_key
  UNION ALL
  SELECT 'admin', unnest(ARRAY[
    'dashboard','user-guide','masters','attendance','doctors','doctor-hub','visits',
    'cash-payments-lite','insurance-payments-lite','quick-payment',
    'bank-advice-generation-beta','bank-advice-generation','bank-advice-history',
    'bank-advice-records','tds-reports','cash-payments','insurance-payments',
    'bank-advice-payment-report','quick-payment-bank-advice-report','tasks',
    'appraisals','leave-approvals','complaints','login-reports','navigation-analytics',
    'chat','version','website-settings','ai-knowledge-base','vendor-reports',
    'quick-payment-report','audit-trail','payroll','settings','staff-management',
    'admin-dashboard','doctor-dashboard'
  ])
  UNION ALL
  SELECT 'doctor', unnest(ARRAY['doctor-hub','doctor-dashboard'])
  UNION ALL
  SELECT 'staff', unnest(ARRAY[
    'dashboard','user-guide','leave-permission','tasks','complaints','chat','staff-dashboard'
  ])
  UNION ALL
  SELECT 'nurse', unnest(ARRAY[
    'dashboard','user-guide','leave-permission','tasks','complaints','chat','staff-dashboard'
  ])
),
role_edit AS (
  SELECT 'manager'::text AS role, unnest(ARRAY[
    'doctors','staff-management','doctor-hub-delete-unpaid-visit'
  ]) AS screen_key
  UNION ALL
  SELECT 'admin', unnest(ARRAY[
    'doctors','staff-management','doctor-hub-delete-unpaid-visit','doctor-management-reactivate',
    'masters','visits','cash-payments','insurance-payments','quick-payment',
    'bank-advice-generation-beta','bank-advice-generation','settings'
  ])
)
INSERT INTO public.staff_screen_permissions (staff_id, screen_key, can_view, can_edit)
SELECT s.id, rv.screen_key, true, COALESCE(re.role IS NOT NULL, false)
FROM public.staff s
JOIN role_view rv ON rv.role = s.role::text
LEFT JOIN role_edit re ON re.role = s.role::text AND re.screen_key = rv.screen_key
ON CONFLICT (staff_id, screen_key) DO NOTHING;

-- ---------- 1c. Backfill admin_screen_permissions -------------------------------
-- Admin table stores per-admin overrides; give every admin_user_id full view on
-- every registered screen (matches super_admin/admin baseline).
-- Only run if the admin_users table exists AND has rows.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='admin_users') THEN
    EXECUTE $sql$
      INSERT INTO public.admin_screen_permissions (admin_user_id, screen_key, can_view, can_edit)
      SELECT a.id, r.screen_key, true, true
      FROM public.admin_users a
      CROSS JOIN public.screen_registry r
      WHERE r.is_active = true
      ON CONFLICT (admin_user_id, screen_key) DO NOTHING;
    $sql$;
  END IF;
END $$;
