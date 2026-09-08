/**
 * Central access-level helpers.
 *
 * super_admin and admin are "full access" tiers: they require ZERO Configure
 * Access setup. Every canView / canEdit / canApprove check short-circuits to
 * true for them, and the sidebar shows every active screen in screen_registry
 * (screens flagged super_admin_only remain super_admin exclusive).
 */
export const isSuperAdmin = (
  role?: string | null,
  designation?: string | null,
): boolean => role === 'super_admin' || designation === 'super_admin';

export const isAdminTier = (
  role?: string | null,
  designation?: string | null,
): boolean => role === 'admin' || designation === 'admin';

/** super_admin OR admin — no permission rows required, ever. */
export const hasFullAccess = (
  role?: string | null,
  designation?: string | null,
): boolean => isSuperAdmin(role, designation) || isAdminTier(role, designation);

/**
 * People-management tier: manager, supervisor and staff_manager.
 * Grants tasks / complaints / leave-approval powers (NOT payment screens).
 * Admin tiers are included since they always have full access.
 */
export const isManagerLike = (
  role?: string | null,
  designation?: string | null,
): boolean =>
  hasFullAccess(role, designation) ||
  ['manager', 'supervisor', 'staff_manager'].includes(role || '') ||
  ['manager', 'supervisor'].includes(designation || '');
