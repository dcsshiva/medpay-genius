import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-import-token, x-client-info, apikey, content-type",
};

interface Row {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  biometric_code: string;
  password?: string;
}

const codePrefix = (role: string) => {
  const letters = role.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (letters + "STF").slice(0, 3);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, function: "bulk-import-staff" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = req.headers.get("x-import-token");
  if (!token || token !== Deno.env.get("STAFF_IMPORT_TOKEN")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const body = await req.json();
  const rows: Row[] = body.rows ?? [];
  const dryRun: boolean = !!body.dryRun;
  const defaultPassword: string = body.defaultPassword || "SecurePass789";

  const { data: existing } = await admin
    .from("staff")
    .select("staff_code, username, email, biometric_code");
  const usedCodes = new Set((existing || []).map((s: any) => String(s.staff_code || "").toUpperCase()));
  const usedUsernames = new Set((existing || []).map((s: any) => String(s.username || "").trim().toLowerCase()));
  const usedEmails = new Set((existing || []).map((s: any) => String(s.email || "").trim().toLowerCase()));
  const usedBio = new Set(
    (existing || []).map((s: any) => String(s.biometric_code || "").trim()).filter(Boolean),
  );

  const results: any[] = [];

  for (const row of rows) {
    const bio = String(row.biometric_code || "").trim();
    if (!bio) {
      results.push({ full_name: row.full_name, status: "error", reason: "Missing biometric code" });
      continue;
    }
    if (usedBio.has(bio)) {
      results.push({ full_name: row.full_name, status: "error", reason: `Biometric code ${bio} already in use` });
      continue;
    }

    let username = String(row.username || "").trim().toLowerCase();
    let email = String(row.email || "").trim().toLowerCase();
    let suffix = 1;
    while (usedUsernames.has(username) || usedEmails.has(email)) {
      suffix += 1;
      username = `${String(row.username).trim().toLowerCase()}${suffix}`;
      email = `${username}@${String(row.email).split("@")[1]}`;
    }

    let staffCode = "";
    for (let i = 0; i < 200; i++) {
      const candidate = codePrefix(row.role) + String(Math.floor(100 + Math.random() * 900));
      if (!usedCodes.has(candidate)) {
        staffCode = candidate;
        break;
      }
    }
    if (!staffCode) {
      results.push({ full_name: row.full_name, status: "error", reason: "Could not allocate staff code" });
      continue;
    }

    if (dryRun) {
      usedCodes.add(staffCode);
      usedUsernames.add(username);
      usedEmails.add(email);
      usedBio.add(bio);
      results.push({ full_name: row.full_name, status: "would_create", staff_code: staffCode, username, email, biometric_code: bio });
      continue;
    }

    const password = row.password || defaultPassword;

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: row.full_name },
    });

    if (authError || !created?.user) {
      results.push({ full_name: row.full_name, status: "error", reason: authError?.message || "Auth user creation failed" });
      continue;
    }

    const userId = created.user.id;

    const { error: desError } = await admin
      .from("user_designations")
      .upsert({ user_id: userId, designation: "staff" }, { onConflict: "user_id" });
    if (desError) {
      await admin.auth.admin.deleteUser(userId);
      results.push({ full_name: row.full_name, status: "error", reason: `Designation: ${desError.message}` });
      continue;
    }

    const { data: hash, error: hashError } = await admin.rpc("simple_hash", { password });
    if (hashError) {
      await admin.auth.admin.deleteUser(userId);
      results.push({ full_name: row.full_name, status: "error", reason: `Hash: ${hashError.message}` });
      continue;
    }

    const { error: staffError } = await admin.from("staff").insert({
      user_id: userId,
      staff_code: staffCode,
      username,
      full_name: row.full_name,
      email,
      phone: row.phone || null,
      role: row.role,
      department: row.department || null,
      password_hash: hash,
      biometric_code: bio,
      is_active: true,
    });

    if (staffError) {
      await admin.auth.admin.deleteUser(userId);
      results.push({ full_name: row.full_name, status: "error", reason: staffError.message });
      continue;
    }

    usedCodes.add(staffCode);
    usedUsernames.add(username);
    usedEmails.add(email);
    usedBio.add(bio);
    results.push({ full_name: row.full_name, status: "created", staff_code: staffCode, username, email, biometric_code: bio });
  }

  const summary = results.reduce((acc: any, r: any) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return new Response(JSON.stringify({ summary, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
