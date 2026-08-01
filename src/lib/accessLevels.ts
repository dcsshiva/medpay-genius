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
