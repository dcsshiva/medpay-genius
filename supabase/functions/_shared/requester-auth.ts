/**
 * Resolves the caller of an admin edge function.
 *
 * Two login paths exist in this app:
 *  1. Legacy custom sessions -> X-Session-Token header, validated against public.user_sessions
 *  2. Real Supabase auth sessions (email/mobile OTP, username+password) -> Authorization: Bearer <JWT>
 *
 * Returns { userId, role } or throws with a clear message.
 */
export async function resolveRequester(
  req: Request,
  admin: any,
): Promise<{ userId: string; role: string }> {
  const sessionToken = req.headers.get('X-Session-Token');

  if (sessionToken) {
    const { data: session, error } = await admin
      .from('user_sessions')
      .select('user_id, role, is_active')
      .eq('session_token', sessionToken)
      .maybeSingle();

    if (!error && session) {
      if (!session.is_active) {
        throw new Error('Session inactive. Please log out and log in again.');
      }
      return { userId: session.user_id, role: String(session.role || '') };
    }
    // fall through to JWT validation
  }

  const bearer = req.headers.get('Authorization')?.replace('Bearer ', '')?.trim();
  if (!bearer) {
    throw new Error('Missing session token');
  }

  const { data: userData, error: userError } = await admin.auth.getUser(bearer);
  if (userError || !userData?.user) {
    throw new Error('Invalid session token');
  }

  const userId = userData.user.id;
  const roles = new Set<string>();

  const { data: designations } = await admin
    .from('user_designations')
    .select('designation')
    .eq('user_id', userId);
  (designations || []).forEach((d: any) => d?.designation && roles.add(String(d.designation)));

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (profile?.role) roles.add(String(profile.role));

  const { data: staffRow } = await admin
    .from('staff')
    .select('role, is_active')
    .eq('user_id', userId)
    .maybeSingle();
  if (staffRow?.role) roles.add(String(staffRow.role));

  const role = roles.has('super_admin')
    ? 'admin'
    : roles.has('admin')
      ? 'admin'
      : roles.has('manager')
        ? 'manager'
        : Array.from(roles)[0] || 'staff';

  return { userId, role };
}

export function isAdminOrManager(role: string) {
  return ['admin', 'manager', 'super_admin'].includes(role);
}
