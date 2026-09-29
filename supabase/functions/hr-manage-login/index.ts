import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

/**
 * hr-manage-login — creates / updates the sign-in account for an HR staff member.
 *
 * Staff sign in to the WestMed Payroll System with their Staff Code + password.
 * Behind the scenes each staff code maps to a Supabase auth user with the
 * synthetic email  <code>@staff.westmed.local  (see src/hrms/auth.ts).
 *
 * Actions (caller must be an admin / super_admin):
 *   { action: "ensure",       emp_no, password? }  create the login if missing (password defaults to the staff code)
 *   Passwords are the plain values typed by users; the "wm#" prefix is added here.
 *   { action: "ensure_all" }                        create missing logins for every active staff (password = staff code)
 *   { action: "set_password", emp_no, password }    reset a staff member's password
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Staff passwords are prefixed before they reach Supabase Auth so the prototype's
// "password = staff code" (4–5 digits) still meets Auth's minimum length. The app
// applies the same prefix on sign-in (src/hrms/auth.ts → authPassword).
const authPassword = (pw: string) => `wm#${pw}`;

const emailFor = (empNo: string) =>
  `${String(empNo).trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@staff.westmed.local`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    // ── authorise caller ──
    const bearer = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
    if (!bearer) return json({ error: "Not signed in" }, 401);
    const { data: caller, error: callerErr } = await admin.auth.getUser(bearer);
    if (callerErr || !caller?.user) return json({ error: "Invalid session" }, 401);
    const { data: isAdmin } = await admin.rpc("hr_is_admin", { _uid: caller.user.id });
    if (!isAdmin) return json({ error: "Only an administrator can manage staff logins" }, 403);

    const body = await req.json();
    const action = String(body?.action || "");

    // email → user id lookup (only needed when a user exists but isn't linked yet)
    let userIndex: Map<string, string> | null = null;
    const findUserId = async (email: string) => {
      if (!userIndex) {
        userIndex = new Map();
        for (let page = 1; page <= 50; page++) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) break;
          (data?.users || []).forEach((u: any) => u.email && userIndex!.set(u.email.toLowerCase(), u.id));
          if (!data?.users || data.users.length < 1000) break;
        }
      }
      return userIndex.get(email.toLowerCase()) || null;
    };

    const ensure = async (empNo: string, password?: string, forcePassword = false) => {
      const { data: staff } = await admin.from("hr_staff").select("emp_no, name, user_id").eq("emp_no", empNo).maybeSingle();
      if (!staff) throw new Error(`Staff ${empNo} not found`);
      const email = emailFor(empNo);
      const pw = authPassword((password && password.length >= 4) ? password : String(empNo));

      let userId: string | null = staff.user_id;
      if (!userId) {
        const { data: created, error } = await admin.auth.admin.createUser({
          email, password: pw, email_confirm: true,
          user_metadata: { full_name: staff.name, emp_no: empNo, hr_staff: true },
        });
        if (created?.user) {
          userId = created.user.id;
        } else {
          userId = await findUserId(email);
          if (!userId) throw new Error(error?.message || "Could not create login");
          forcePassword = forcePassword || !!password;
        }
        await admin.from("hr_staff").update({ user_id: userId }).eq("emp_no", empNo);
        if (forcePassword) await admin.auth.admin.updateUserById(userId, { password: pw });
        return { emp_no: empNo, created: true };
      }
      if (forcePassword) {
        const { error } = await admin.auth.admin.updateUserById(userId, { password: pw });
        if (error) throw new Error(error.message);
      }
      return { emp_no: empNo, created: false };
    };

    if (action === "ensure") {
      return json({ ok: true, result: await ensure(String(body.emp_no), body.password, !!body.password) });
    }
    if (action === "set_password") {
      if (!body.password || String(body.password).length < 4) return json({ error: "Password must be at least 4 characters" }, 400);
      return json({ ok: true, result: await ensure(String(body.emp_no), String(body.password), true) });
    }
    if (action === "ensure_all") {
      const { data: rows } = await admin.from("hr_staff").select("emp_no").eq("active", true).is("user_id", null);
      const done: string[] = [];
      const failed: { emp_no: string; error: string }[] = [];
      for (const r of rows || []) {
        try { await ensure(r.emp_no, r.emp_no); done.push(r.emp_no); }
        catch (e) { failed.push({ emp_no: r.emp_no, error: (e as Error).message }); }
      }
      return json({ ok: true, created: done.length, failed });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
