import { supabase } from '@/integrations/supabase/client';
import type { HrResult, HrWho } from './types';

/**
 * Staff sign in with Staff Code + password. Each code maps to a Supabase Auth user
 * `<code>@staff.westmed.local`, created by the hr-manage-login edge function.
 * Passwords get a fixed prefix before reaching Auth so the prototype's
 * "password = staff code" (4–5 digits) still satisfies Auth's minimum length.
 */
export const staffEmail = (code: string) =>
  `${String(code).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')}@staff.westmed.local`;
export const authPassword = (pw: string) => `wm#${pw}`;

export async function whoami(): Promise<HrWho | null> {
  const { data, error } = await (supabase as any).rpc('hr_whoami');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.role === 'none') return null;
  return { role: row.role, empNo: row.emp_no, name: row.name };
}

async function signInStaffAccount(code: string, password: string) {
  return supabase.auth.signInWithPassword({ email: staffEmail(code), password: authPassword(password) });
}

export async function staffSignIn(code: string, password: string): Promise<HrResult> {
  const { error } = await signInStaffAccount(code, password);
  if (error) return { error: `Incorrect Staff Code or password for "${code}".` };
  const who = await whoami().catch(() => null);
  if (!who || !who.empNo) {
    await supabase.auth.signOut();
    return { error: `No active staff record for "${code}".` };
  }
}

export async function adminSignIn(username: string, password: string): Promise<HrResult> {
  const u = username.trim();
  let signedIn = false;

  // 1. Manager: Staff Code + password
  if (!u.includes('@')) {
    const { error } = await signInStaffAccount(u, password);
    signedIn = !error;
  }
  // 2. Administrator: email, or legacy WestMed username (bridged by password-login-sync)
  if (!signedIn) {
    let email = u.includes('@') ? u : '';
    if (!email) {
      const { data, error } = await supabase.functions.invoke('password-login-sync', { body: { identifier: u, password } });
      if (!error && data?.email) email = data.email;
    }
    if (email) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      signedIn = !error;
    }
  }
  if (!signedIn) return { error: 'Incorrect username or password.' };

  const who = await whoami().catch(() => null);
  if (!who || who.role === 'staff') {
    await supabase.auth.signOut();
    return {
      error: who ? 'This staff account is not set up for console access (Role must be Manager).'
                 : 'This account has no access to the WestMed Payroll System.',
    };
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function changePassword(isStaffAccount: boolean, current: string, next: string): Promise<HrResult> {
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return { error: 'You are signed out. Please sign in again.' };
  if (!isStaffAccount && next.length < 6) return { error: 'Administrator passwords must be at least 6 characters.' };
  const wrap = (pw: string) => (isStaffAccount ? authPassword(pw) : pw);
  const check = await supabase.auth.signInWithPassword({ email, password: wrap(current) });
  if (check.error) return { error: 'Current password is incorrect.' };
  const { error } = await supabase.auth.updateUser({ password: wrap(next) });
  if (error) return { error: error.message };
}

/** Calls the hr-manage-login edge function (admin only). */
export async function manageLogin(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('hr-manage-login', { body });
  if (error) {
    let message = error.message;
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) message = ctx.error; } catch { /* ignore */ }
    return { error: message };
  }
  if (data?.error) return { error: data.error };
  return data;
}
