import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Users, Calendar, CreditCard, Settings as SettingsIcon, Home, ClipboardList,
  MessageCircle, UserCog, MessageSquare, TrendingUp, History as HistoryIcon,
  Globe, BookOpen, Database, FileText, CalendarCheck, Zap, Building2,
  FolderOpen, Stethoscope, BarChart3, ShieldCheck, Wallet,
} from 'lucide-react';
import { isStaffRole } from './staffUtils';
import { hasFullAccess, isSuperAdmin } from './accessLevels';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

// Icon lookup per screen_key. Icons live in code (not DB).
export const SCREEN_ICONS: Record<string, React.ComponentType<any>> = {
  'dashboard': Home,
  'user-guide': BookOpen,
  'masters': Database,
  'attendance': CalendarCheck,
  'doctors': Users,
  'visits': Calendar,
  'doctor-hub': Stethoscope,
  'cash-payments-lite': CreditCard,
  'insurance-payments-lite': CreditCard,
  'quick-payment': Zap,
  'bank-advice-generation-beta': Building2,
  'bank-advice-generation': Building2,
  'bank-advice-history': FolderOpen,
  'bank-advice-records': FileText,
  'tds-reports': FileText,
  'cash-payments': CreditCard,
  'insurance-payments': CreditCard,
  'bank-advice-payment-report': FileText,
  'quick-payment-bank-advice-report': FileText,
  'tasks': ClipboardList,
  'appraisals': UserCog,
  'staff-management': UserCog,
  'staff': UserCog,
  'leave-approvals': CalendarCheck,
  'leave-permission': CalendarCheck,
  'complaints': MessageCircle,
  'login-reports': TrendingUp,
  'navigation-analytics': BarChart3,
  'chat': MessageSquare,
  'version': HistoryIcon,
  'website-settings': Globe,
  'ai-knowledge-base': BookOpen,
  'vendor-reports': FileText,
  'quick-payment-report': FileText,
  'audit-trail': ShieldCheck,
  'payroll': Wallet,
  'settings': SettingsIcon,
};

// ============================================================================
// Legacy hardcoded navigation — retained as a fallback for when screen_registry
// has not yet been seeded, so no user loses access on first deploy.
// Once the DB is seeded, this list is ignored.
// ============================================================================
interface LegacyParams {
  userRole?: string | null;
  userDesignation?: string | null;
  userProfile?: any;
}
export const getNavigationItems = ({
  userRole,
  userDesignation,
  userProfile,
}: LegacyParams): NavigationItem[] => {
  const mk = (id: string, label: string): NavigationItem =>
    ({ id, label, icon: SCREEN_ICONS[id] || Home });
  const base = [mk('dashboard', 'Dashboard'), mk('user-guide', 'User Guide')];

  if (userDesignation === 'super_admin' || userRole === 'super_admin') {
    return [
      ...base,
      mk('masters', 'Masters'), mk('attendance', 'Attendance'),
      mk('doctors', 'Doctor Management'), mk('visits', 'Visit Management'),
      mk('doctor-hub', 'Doctor Hub'),
      mk('cash-payments-lite', 'Cash Payments (Lite)'),
      mk('insurance-payments-lite', 'Insurance Payments (Lite)'),
      mk('quick-payment', 'Quick Payment'),
      mk('bank-advice-generation-beta', 'Bank Advice (Beta)'),
      mk('bank-advice-generation', 'Bank Advice (Legacy)'),
      mk('bank-advice-history', 'BANK ADVICE HUB'),
      mk('bank-advice-records', 'Bank Advice Records'),
      mk('tds-reports', 'TDS Reports'),
      mk('cash-payments', 'Cash Payments'),
      mk('insurance-payments', 'Insurance Payments'),
      mk('bank-advice-payment-report', 'BA Payment Report'),
      mk('quick-payment-bank-advice-report', 'Quick Payment BA Report'),
      mk('tasks', 'Task Management'),
      mk('appraisals', 'Staff Management'),
      mk('leave-approvals', 'Leave Approvals'),
      mk('complaints', 'Complaint Management'),
      mk('login-reports', 'Login Reports'),
      mk('navigation-analytics', 'Navigation Analytics'),
      mk('chat', 'Team Chat'),
      mk('version', 'Version Management'),
      mk('website-settings', 'Website Settings'),
      mk('ai-knowledge-base', 'AI Knowledge Base'),
      mk('vendor-reports', 'Vendor Reports'),
      mk('audit-trail', 'Audit Trail'),
      mk('payroll', 'Payroll'),
      mk('settings', 'Settings'),
    ];
  }
  if (userRole === 'doctor' || userProfile?.user_type === 'doctor') {
    return [{ id: 'doctor-hub', label: 'My Dashboard', icon: Stethoscope }];
  }
  if (userRole === 'manager' || userDesignation === 'manager') {
    return [
      ...base,
      mk('masters', 'Masters'),
      mk('appraisals', 'Staff Management'),
      mk('attendance', 'Attendance'),
      mk('visits', 'Visit Management'),
      mk('doctors', 'Doctors'),
      mk('doctor-hub', 'Doctor Hub'),
      mk('cash-payments-lite', 'Cash Payments (Lite)'),
      mk('insurance-payments-lite', 'Insurance Payments (Lite)'),
      mk('quick-payment', 'Quick Payment'),
      mk('bank-advice-generation-beta', 'Bank Advice (Beta)'),
      mk('bank-advice-generation', 'Bank Advice (Legacy)'),
      mk('bank-advice-history', 'BANK ADVICE HUB'),
      mk('bank-advice-records', 'Bank Advice Records'),
      mk('tds-reports', 'TDS Reports'),
      mk('cash-payments', 'Cash Payments'),
      mk('insurance-payments', 'Insurance Payments'),
      mk('bank-advice-payment-report', 'BA Payment Report'),
      mk('quick-payment-bank-advice-report', 'Quick Payment BA Report'),
      mk('tasks', 'Task Management'),
      mk('leave-approvals', 'Leave Approvals'),
      mk('complaints', 'Complaints'),
      mk('vendor-reports', 'Vendor Reports'),
      mk('quick-payment-report', 'Quick Payment Report'),
      mk('payroll', 'Payroll'),
      mk('chat', 'Team Chat'),
    ];
  }
  if (userRole === 'admin' || userDesignation === 'admin') {
    return [
      ...base,
      mk('masters', 'Masters'), mk('attendance', 'Attendance'),
      mk('doctors', 'Doctor Management'), mk('doctor-hub', 'Doctor Hub'),
      mk('visits', 'Visit Management'),
      mk('cash-payments-lite', 'Cash Payments (Lite)'),
      mk('insurance-payments-lite', 'Insurance Payments (Lite)'),
      mk('quick-payment', 'Quick Payment'),
      mk('bank-advice-generation-beta', 'Bank Advice (Beta)'),
      mk('bank-advice-generation', 'Bank Advice (Legacy)'),
      mk('bank-advice-history', 'BANK ADVICE HUB'),
      mk('bank-advice-records', 'Bank Advice Records'),
      mk('tds-reports', 'TDS Reports'),
      mk('cash-payments', 'Cash Payments'),
      mk('insurance-payments', 'Insurance Payments'),
      mk('bank-advice-payment-report', 'BA Payment Report'),
      mk('quick-payment-bank-advice-report', 'Quick Payment BA Report'),
      mk('tasks', 'Task Management'),
      mk('appraisals', 'Staff Management'),
      mk('leave-approvals', 'Leave Approvals'),
      mk('complaints', 'Complaint Management'),
      mk('login-reports', 'Login Reports'),
      mk('navigation-analytics', 'Navigation Analytics'),
      mk('chat', 'Team Chat'),
      mk('version', 'Version Management'),
      mk('website-settings', 'Website Settings'),
      mk('ai-knowledge-base', 'AI Knowledge Base'),
      mk('vendor-reports', 'Vendor Reports'),
      mk('quick-payment-report', 'Quick Payment Report'),
      mk('audit-trail', 'Audit Trail'),
      mk('payroll', 'Payroll'),
      mk('settings', 'Settings'),
    ];
  }
  if (userRole && isStaffRole(userRole)) {
    return [
      ...base,
      mk('leave-permission', 'Leave & Permission'),
      { id: 'tasks', label: 'My Tasks', icon: ClipboardList },
      mk('complaints', 'Complaints'),
      mk('chat', 'Team Chat'),
    ];
  }
  return base;
};

interface ScreenRegistryRow {
  screen_key: string;
  screen_name: string;
  group_name: string | null;
  sort_order: number | null;
  is_active: boolean;
  super_admin_only: boolean;
}

/**
 * Fetch full active screen registry (unfiltered by any user's permissions).
 * Only used by MenuVisibilitySettings, which needs to see every possible screen.
 */
export const useAllScreens = () => {
  const [rows, setRows] = useState<ScreenRegistryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('screen_registry')
        .select('screen_key, screen_name, group_name, sort_order, is_active, super_admin_only')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      if (error || !data) { setRows([]); setLoading(false); return; }
      setRows(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { rows, loading };
};

/**
 * Reactive sidebar/nav items for the current user.
 * Reads screen_registry (globally active screens) intersected with
 * screenPermissions from AuthContext. Falls back to legacy hardcoded list
 * when the DB is not yet seeded so users don't lose access.
 */
export const useNavigationItems = (): { items: NavigationItem[]; loading: boolean } => {
  const { userRole, userDesignation, userProfile, screenPermissions, permissionsReady } = useAuth() as any;
  const { rows, loading } = useAllScreens();

  return useMemo(() => {
    const isSuper = isSuperAdmin(userRole, userDesignation);
    const fullAccess = hasFullAccess(userRole, userDesignation);

    // Registry empty → fall back to legacy hardcoded list.
    if (!loading && rows.length === 0) {
      return {
        items: getNavigationItems({ userRole, userDesignation, userProfile }),
        loading: false,
      };
    }

    if (loading) return { items: [], loading: true };
    // Wait for permissions to settle for non-full-access users so we never
    // render an empty sidebar mid-resolution.
    if (!fullAccess && !permissionsReady) return { items: [], loading: true };

    const permitted = rows
      .filter((r) => (r.super_admin_only ? isSuper : true))
      .filter((r) => {
        // super_admin / admin: zero configuration required, everything visible.
        if (fullAccess) return true;
        const perm = screenPermissions?.[r.screen_key];
        return !!perm?.can_view;
      });

    // Safety net: a privileged user should never end up with no navigation.
    if (permitted.length === 0 && (userRole === 'manager' || userDesignation === 'manager')) {
      return {
        items: getNavigationItems({ userRole, userDesignation, userProfile }),
        loading: false,
      };
    }

    const items = permitted
      .filter((r) => !!SCREEN_ICONS[r.screen_key]) // don't render permission-only keys (dashboard variants, delete actions)
      .map<NavigationItem>((r) => ({
        id: r.screen_key,
        label: r.screen_name,
        icon: SCREEN_ICONS[r.screen_key] || Home,
      }));

    return { items, loading: false };
  }, [rows, loading, userRole, userDesignation, userProfile, screenPermissions, permissionsReady]);
};
