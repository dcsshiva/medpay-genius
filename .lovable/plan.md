

# Security Scan Results & Remediation Plan

The scan found **12 findings** — 5 critical errors and 7 warnings. Here's the full breakdown and proposed fixes.

---

## Critical Errors (5)

### 1. PRIVILEGE ESCALATION: Anyone can self-assign admin role via `user_sessions`
**Problem:** The `user_sessions` INSERT policy is `WITH CHECK (true)` for both `anon` and `authenticated` roles. An attacker can insert a row with `role='admin'` and `is_active=true`, then `get_user_role()` returns `'admin'` for them, granting write access to `payment_transactions`, `profiles`, `website_settings`, etc.

**Fix:**
- Drop the permissive INSERT policy `Anyone can create sessions`
- Replace with a restrictive policy: `WITH CHECK (user_id = auth.uid())`
- Update `get_user_role()` to cross-reference against `user_designations` (the server-controlled source of truth) instead of trusting `user_sessions.role` directly
- Alternative: make session creation go through a `SECURITY DEFINER` function that validates the role against `user_designations` before inserting

### 2. EXPOSED DATA: OTP codes readable by anyone (unauthenticated)
**Problem:** `otp_verifications` has `SELECT` policy `USING (true)` on the `public` role. Plaintext OTP codes and mobile numbers are exposed.

**Fix:**
- Drop the `Users can view their own OTP records` policy entirely
- OTP verification is already handled server-side in the `verify-otp` edge function using the service role key — no client-side SELECT is needed

### 3. EXPOSED DATA: All staff records (including password hashes, bank details) readable by any authenticated user
**Problem:** `staff` table has policy `Authenticated users can view staff basic info` with `USING (true)`, exposing `password_hash`, `bank_account_number`, `ifsc_code`, etc.

**Fix:**
- Drop the overly permissive `Authenticated users can view staff basic info` policy
- Create a database view `staff_basic_info` exposing only non-sensitive columns (`id`, `staff_code`, `full_name`, `role`, `department`, `is_active`, `user_id`)
- Add a SELECT policy on the view for authenticated users
- Keep existing admin/manager/self policies for full row access on the `staff` table

### 4. EXPOSED DATA: Vendor bank accounts, mobile numbers readable without authentication
**Problem:** `vendors` has `Anyone can view active vendors` with `USING (is_active = true)` on the `public` role, exposing bank details and personal data.

**Fix:**
- Drop `Anyone can view active vendors` policy
- Replace with `Authenticated users can view active vendors` restricted to `authenticated` role
- Consider creating a `vendors_public` view excluding sensitive columns if any public access is truly needed

### 5. EXPOSED DATA: Hospital bank account number publicly readable via `website_settings`
**Problem:** `website_settings` has `Anyone can view website settings` on the `public` role. The table contains `hospital_bank_account_number` and `hospital_bank_account_holder_name`.

**Fix:**
- Drop the public SELECT policy
- Replace with an `authenticated` role policy: `USING (is_active = true)` for `authenticated` only
- If public website settings are needed (logo, name, etc.), create a view excluding bank columns

---

## Warnings (7)

### 6. RLS references user_metadata
An RLS policy references `auth.jwt()->'user_metadata'`, which users can modify. This needs to be identified and replaced with `user_designations` lookup.

### 7. Five "RLS Policy Always True" warnings
These overlap with the critical findings above — the `USING (true)` / `WITH CHECK (true)` policies on `otp_verifications`, `user_sessions`, and `staff`.

### 8. Leaked Password Protection Disabled
Supabase Auth's leaked password protection feature is turned off. This should be enabled in the Supabase dashboard under Authentication → Settings.

---

## Implementation Order

1. **Fix #1 (Privilege Escalation)** — highest risk, allows full admin takeover
2. **Fix #2 (OTP exposure)** — drop the public SELECT policy
3. **Fix #3 (Staff data)** — create `staff_basic_info` view, tighten policy
4. **Fix #4 (Vendor data)** — restrict to authenticated
5. **Fix #5 (Bank account)** — restrict to authenticated
6. **Fix #6 (user_metadata)** — identify and fix the RLS policy
7. **Enable leaked password protection** in Supabase dashboard (manual step)

All fixes are SQL migrations that tighten RLS policies without changing application logic. The `staff_basic_info` view will require updating client-side queries that currently read from `staff` for display purposes (e.g., dropdowns, lists) to use the view instead.

