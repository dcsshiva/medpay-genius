# Fix: Version refresh, Manager doctor-edit, Rename jurel, Unpaid-visits error

## 1. Version label shows "HMS v0.0.0" — bump + show build date/time

`package.json` is pinned at `version: "0.0.0"`, so the floating badge stays at v0.0.0 and users don't realise the build refreshed. PWA may also be serving cached old menus.

Changes:
- Bump `package.json` version to `1.1.0` (semantic bump for the doctor/edit fix batch).
- Update `src/components/VersionDisplay.tsx` badge label to include the build timestamp:
  `HMS v{version} · {dd-MMM HH:mm IST}` (using existing `formatFullDateTimeIST` on `buildDate`).
- Confirm `vite.config.ts` already injects fresh `timestamp` on every build (it does) — no change needed.
- PWA: `registerType: 'autoUpdate'` is already set; the version bump + filename hash will trigger Workbox to swap the new bundle on next load. Add a one-line `skipWaiting`/`clientsClaim` in the Workbox block so clients update without waiting for a second reload.

Result: every user sees a unique `v1.1.0 · <build datetime>` chip and the SW activates the new bundle on first refresh.

## 2. Manager "jurel" cannot save Doctor edits

Per `supabase/migrations/20251031003949_…sql` the only ALL-policy on `public.doctors` is `Super admins can manage doctors` (role `super_admin`). Managers therefore can SELECT (via a separate read policy) but UPDATE silently fails RLS — the form looks like it saves but the row never changes. This matches the symptom from earlier (`Doctor Name / Doctor Code / Account Holder Name` weren't reported because the form might have re-fetched before; now with fresh-fetch-on-edit the staleness is exposed as "nothing saved").

Add a migration that lets `manager` designation update existing doctor rows (no insert/delete, to keep super-admin gating):

```sql
CREATE POLICY "Managers can update doctors"
ON public.doctors
FOR UPDATE
USING (has_designation(auth.uid(), 'manager'::app_designation))
WITH CHECK (has_designation(auth.uid(), 'manager'::app_designation));
```

Also add explicit `GRANT UPDATE ON public.doctors TO authenticated;` (idempotent) in case the earlier grant block omitted UPDATE.

After deploy, jurel's edits to Specialization / Bank fields / Mobile / Email / Password / PAN will persist.

## 3. Rename manager "jurel" → "Deepan" in Masters

One-off data migration (no schema change):

```sql
UPDATE public.staff
SET full_name = 'Deepan', username = 'Deepan'  -- only the columns that exist
WHERE lower(username) = 'jurel' OR lower(full_name) = 'jurel';

UPDATE public.profiles
SET full_name = 'Deepan'
WHERE lower(full_name) = 'jurel';
```

Before running, the migration will introspect with `to_regclass` / `information_schema.columns` so it skips columns that don't exist (username may not be present in `profiles`). Auth-side `auth.users.email` is left untouched — login identifier stays the same unless you ask otherwise.

## 4. "Failed to load unpaid visits" toast (second screenshot, admin: Arulmani)

Source: `src/components/DoctorHub.tsx` line 309 calls RPC `get_doctor_unpaid_visits(_doctor_id, _start, _end)`. The toast appears for the Total tab too because it `Promise.all`s both fetches.

Diagnostic plan (one round-trip):
- Add a `console.error('[DoctorHub] unpaid RPC error', { doctorId, period, error })` log that prints `error.message / error.code / error.hint` before the toast — surfaces whether it's `PGRST202` (function missing/signature mismatch), `42501` (permission), or a SQL error.
- Verify the function exists with the expected signature; the most recent doctor-payment migrations created `get_doctor_paid_payments` and `get_doctor_unpaid_visits` — confirm both have `GRANT EXECUTE … TO authenticated` and `SECURITY DEFINER` so RLS on `visits` doesn't block admins viewing other doctors.
- If the function is missing the grant (typical cause), the migration in step 2 also adds:
  ```sql
  GRANT EXECUTE ON FUNCTION public.get_doctor_unpaid_visits(uuid, date, date) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.get_doctor_paid_payments(uuid, date, date) TO authenticated;
  ```

The browser log from the next session will confirm which of the two it is; the migration covers the permission case, the function-signature case will be a follow-up edit.

## Technical details

Files edited:
- `package.json` — version bump.
- `src/components/VersionDisplay.tsx` — badge label includes build datetime.
- `vite.config.ts` — `workbox.skipWaiting: true, clientsClaim: true`.
- `src/components/DoctorHub.tsx` — richer error log in `fetchUnpaidVisits` (and matching log in `fetchPaymentHistory`).
- New migration `supabase/migrations/<ts>_manager_doctor_edit_and_rename.sql` containing: manager UPDATE policy on `doctors`, GRANTs on the two RPCs, rename of `jurel` → `Deepan` in `staff` / `profiles`.

Out of scope: no UI/layout changes to Doctor form, no other menu reshuffles, no auth/email changes for the renamed manager.
