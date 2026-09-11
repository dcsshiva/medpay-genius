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
 *
 * `staffRole` is the role stored on the staff master row (userProfile.role).
 * It must be checked too: a Staff Manager's *designation* stays "staff",
 * so role/designation alone would treat them as an ordinary staff member.
 */
export const isManagerLike = (
  role?: string | null,
  designation?: string | null,
  staffRole?: string | null,
): boolean =>
  hasFullAccess(role, designation) ||
  ['manager', 'supervisor', 'staff_manager'].includes(role || '') ||
  ['manager', 'supervisor', 'staff_manager'].includes(staffRole || '') ||
  ['manager', 'supervisor'].includes(designation || '');

/** True when the user's staff-master role (or role field) is Staff Manager. */
export const isStaffManager = (
  role?: string | null,
  staffRole?: string | null,
): boolean => role === 'staff_manager' || staffRole === 'staff_manager';

