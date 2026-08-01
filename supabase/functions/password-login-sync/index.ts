import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * password-login-sync
 *
 * Bridges the legacy username/password store (staff.password_hash /
 * doctors.password_hash, checked by the verify_user_login RPC) with real
 * Supabase Auth accounts, so username logins get a genuine JWT session
 * instead of a mock one.
 *
 * Flow: verify legacy credentials -> ensure an auth user exists -> set its
 * password to the verified one -> return the email so the client can call
 * signInWithPassword and obtain a real session.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return json({ ok: true, function: 'password-login-sync' });
  }

  try {
    const { identifier, password } = await req.json();

    if (!identifier || typeof identifier !== 'string' || identifier.length > 254) {
      return json({ error: 'invalid_request', message: 'Username is required.' }, 400);
    }
    if (!password || typeof password !== 'string' || password.length < 4 || password.length > 200) {
      return json({ error: 'invalid_request', message: 'Password is required.' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Verify against the legacy credential store.
    const { data: verify, error: verifyError } = await admin.rpc('verify_user_login', {
      _username: identifier,
      _password: password,
    });

    if (verifyError) {
      console.error('verify_user_login failed:', verifyError.message);
      return json({ error: 'verify_failed', message: 'Could not verify credentials.' }, 500);
    }

    const result = (verify ?? {}) as {
      error?: string;
      user_type?: string;
      id?: string;
      user_id?: string | null;
      full_name?: string;
      role?: string;
    };

    if (result.error === 'invalid_password') {
      return json({ error: 'invalid_password', message: 'Incorrect password.' }, 401);
    }
    if (result.error || !result.user_type || !result.id) {
      return json({ error: 'not_found', message: 'No active account found for this username.' }, 404);
    }

    const isDoctor = result.user_type === 'doctor';
    const table = isDoctor ? 'doctors' : 'staff';

    // 2. Find the record's stored email / linked auth user.
    const emailColumn = isDoctor ? 'email' : 'email';
    const { data: record } = await admin
      .from(table)
      .select(`id, user_id, full_name, ${emailColumn}`)
      .eq('id', result.id)
      .maybeSingle();

    const recordEmail: string | null = (record as any)?.[emailColumn] || null;
    let authUserId: string | null = result.user_id || (record as any)?.user_id || null;
    let email: string | null = recordEmail;

    // 3. Resolve or create the auth user.
    if (authUserId) {
      const { data: existing } = await admin.auth.admin.getUserById(authUserId);
      if (existing?.user) {
        email = existing.user.email || email;
      } else {
        authUserId = null;
      }
    }

    if (!authUserId) {
      if (!email) {
        email = `${identifier.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@westmed.local`;
      }
      // Try to match an existing auth user by email before creating a new one.
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = list?.users?.find(
        (u) => (u.email || '').toLowerCase() === email!.toLowerCase()
      );

      if (match) {
        authUserId = match.id;
      } else {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: result.full_name || (record as any)?.full_name || identifier,
            user_type: result.user_type,
            original_id: result.id,
          },
        });
        if (createError || !created?.user) {
          console.error('createUser failed:', createError?.message);
          return json({ error: 'auth_user_failed', message: 'Could not prepare the account.' }, 500);
        }
        authUserId = created.user.id;
      }

      // Link the record back to the auth user so future logins skip this path.
      await admin.from(table).update({ user_id: authUserId }).eq('id', result.id);
    }

    // 4. Make the auth password match the verified legacy password.
    const { error: updateError } = await admin.auth.admin.updateUserById(authUserId!, {
      password,
      email_confirm: true,
      ...(email ? { email } : {}),
    });

    if (updateError) {
      console.error('updateUserById failed:', updateError.message);
      return json({ error: 'sync_failed', message: 'Could not sync the password.' }, 500);
    }

    return json({
      success: true,
      email,
      user_id: authUserId,
      user_type: result.user_type,
      role: result.role || (isDoctor ? 'doctor' : 'staff'),
    });
  } catch (error: any) {
    console.error('password-login-sync error:', error?.message || error);
    return json({ error: 'unexpected', message: 'Sign-in service error.' }, 500);
  }
});
