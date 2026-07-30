## Goal
Move everything from the external backend (`chbntbekbgetbyyxapqh`) into the Lovable Cloud backend that is already provisioned on this project, then repoint the app and publish.

Current state (verified): Lovable Cloud is already enabled — `.env` points at the Cloud project, but `src/integrations/supabase/client.ts` still hardcodes the external URL and key. The Cloud database is empty (no tables, functions, triggers, or storage buckets).

## What you need to do first
Provide the external database connection string. I'll request it through the secure secret form as `EXTERNAL_DB_URL` — do not paste it in chat.

Format: `postgresql://postgres:<password>@db.chbntbekbgetbyyxapqh.supabase.co:5432/postgres` (or the pooler URL from Connect → Session pooler).

I will also need the external project's **service role key** (as `EXTERNAL_SERVICE_ROLE_KEY`) to read `auth.users` and recreate accounts with their original IDs.

## Migration steps

**1. Dump and inspect**
Dump `public` schema-only and data-only from the external DB inside the sandbox. Review size, table count, extensions, and anything Cloud-incompatible (owner/privilege statements, `supabase_admin` grants, cross-schema references).

**2. Recreate the schema in Cloud**
Convert the schema dump into one or more approved migrations: tables, enums, functions, triggers, RLS policies, plus explicit GRANTs for `authenticated` / `service_role` / `anon` on every public table. Anything referencing `auth.users` stays as-is; the `auth` schema itself is not migrated.

**3. Recreate auth users with original UUIDs**
Read `auth.users` from the external project, then create each user in Cloud via the admin API with the same `id`, email, phone, and metadata, with email/phone pre-confirmed. Passwords cannot be moved — every user signs in by OTP (already the primary login here), and password users get a reset path. This keeps every `user_id` foreign key intact.

**4. Load the data**
With entry frozen, load the data dump into Cloud in FK-safe order, triggers disabled during load, then re-enable and reset all sequences. Verify with per-table row-count comparison between source and target.

**5. Secrets and edge functions**
Re-add `MSG91_AUTH_KEY`, `SOFTSMS_API_KEY`, `SOFTSMS_SENDER_ID`, `SOFTSMS_PE_ID`, `SOFTSMS_TEMPLATE_ID` via the secure form. The `SUPABASE_*` secrets are provided automatically by Cloud. All 8 edge functions get deployed to Cloud.

**6. Repoint the app**
Update `src/integrations/supabase/client.ts` to read `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` instead of the hardcoded external values, keeping the existing storage-validation wrapper. Update `supabase/config.toml` project ref. Regenerated `types.ts` then fixes the empty-types problem; remove the `any` casts added earlier where they're no longer needed.

**7. Verify, then cut over**
On preview: OTP login for admin/manager/doctor/staff, permissions and sidebar visibility, quick payment + bank advice generation, visit management row counts (confirm >1000 works), leave/appraisal screens, and an edge-function smoke test. Then publish and point `westmedhospital.com` at the Cloud build.

## Technical notes
- Order matters: schema → auth users → data. Loading data before auth users exist will fail FK checks.
- Row counts and sequence values are the acceptance check for step 4; I'll report a table-by-table diff.
- Storage: no buckets exist on either side, so nothing to move unless you tell me otherwise.
- Rollback: the external project stays untouched and live throughout; until you publish, nothing changes for current users.

## Freeze window
Steps 3–4 need the freeze. Length depends on database size, which I'll measure in step 1 before you announce a window to users.
