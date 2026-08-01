## Post-migration cutover: what still needs to be done

The database, storage, and schema migration to Lovable Cloud is complete. The app client (`src/integrations/supabase/client.ts`) and `supabase/config.toml` are already pointed at the new Cloud project. The generated types (`src/integrations/supabase/types.ts`) are now populated with the migrated schema.

Remaining items to finish the cutover:

1. **Deploy edge functions to Cloud** (critical blocker)
   - The 8 functions in `supabase/functions/` are currently returning `404 NOT_FOUND` from the Cloud project (`zallnyrcsarecttjecrg`).
   - OTP login, staff creation, and chatbot will not work until they are deployed.
   - Deploy all functions: `create-user`, `update-user-credentials`, `get-user-emails`, `send-otp`, `verify-otp`, `sync-auth-emails`, `chatbot`, `verify-emergency-otp`.
   - Smoke-test each function via GET health check and a real OTP round-trip.

2. **Clean up empty-types workarounds**
   - `src/integrations/supabase/client.ts` still has a comment claiming `Database` is empty; the generic is still removed. Re-attach `<Database>` and delete the stale comment.
   - Remove `as any` casts that were added in `BankAdvicePaymentReport.tsx`, `CashPaymentLite.tsx`, `InsurancePaymentLite.tsx`, and `PaymentManagement.tsx` now that the types file is populated.

3. **Remove migration-only secrets**
   - `EXTERNAL_DB_URL` and `EXTERNAL_SERVICE_ROLE_KEY` are no longer needed after the cutover. Delete them to reduce exposure.
   - Keep the SMS/edge-function secrets: `MSG91_AUTH_KEY`, `SOFTSMS_API_KEY`, `SOFTSMS_PE_ID`, `SOFTSMS_SENDER_ID`, `SOFTSMS_TEMPLATE_ID`.

4. **Build check**
   - Run `bun run build` (or `vite build`) to confirm TypeScript is happy with the re-attached `<Database>` generic and without the `as any` casts.

5. **End-to-end smoke tests on preview**
   - Login with Email OTP, Mobile OTP, and username/password for admin/manager/doctor/staff roles.
   - Verify the sidebar renders correctly based on `screen_registry` permissions.
   - Create a quick payment and generate bank advice.
   - Open Visit Management and confirm row counts are not capped at 1000.
   - Test staff creation and leave/permission flows.

6. **Republish if needed**
   - The published site is live at `https://westmedhospital.com` and redirects are in place. If any code changes are made in steps 2–5, republish so the live bundle uses the updated client and types.

## Technical details

- Edge function base URL to test: `https://zallnyrcsarecttjecrg.supabase.co/functions/v1/{function-name}`.
- `supabase/config.toml` already has `project_id = "zallnyrcsarecttjecrg"`, so `supabase functions deploy` will target the correct Cloud project.
- `src/integrations/supabase/types.ts` is 4,639 lines and contains the full migrated schema, so it is safe to re-introduce the typed `createClient<Database>`.

## Out of scope unless you ask
- Custom domain DNS changes (`westmedhospital.com`) — already configured and redirecting.
- Auth email/SMS provider templates — the SMS secrets are in place; email templates may need reconfiguration in Cloud auth settings separately.
- Storage files/buckets — already migrated.

Once the plan is approved, I can execute it in build mode.