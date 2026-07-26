-- Extend the legacy public.screen_module enum with every screen_key currently
-- registered in screen_registry that is missing from the enum. This unblocks
-- historical bundles that still write to user_screen_access (which uses this
-- enum) after new screens like "leave_permission" were introduced.
--
-- Safe to re-run: ADD VALUE IF NOT EXISTS is idempotent.
-- NOTE: ALTER TYPE ... ADD VALUE cannot be used in the same transaction as
--       code that references the new value. Keep this file to ADD VALUEs only.

ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'leave_permission';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'staff_management';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'doctor_hub';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'admin_dashboard';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'doctor_dashboard';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'staff_dashboard';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'doctor_management_reactivate';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'doctor_hub_delete_unpaid_visit';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'settings_auth_sync';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'quick_payment';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'insurance_payment';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'cash_payment';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'bank_advice';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'payment_hub';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'tasks';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'complaints';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'team_chat';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'reports';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'notifications';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'version_management';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'website_settings';
ALTER TYPE public.screen_module ADD VALUE IF NOT EXISTS 'user_access';
