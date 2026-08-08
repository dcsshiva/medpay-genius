# Doctor emails: new visit + bank advice generated

Send a branded email to the **doctor** in exactly two situations, and only when that doctor has a valid email address on their profile:

1. A new visit is recorded for that doctor.
2. A bank advice is generated that includes that doctor's payment.

No email is sent when a doctor has no email, when a visit is edited, or for any other event. The existing daily admin digest is unchanged.

## Where the doctor's email lives

Doctors have no `email` column — their address is the login email on their linked account (resolved today via the existing `get_doctor_auth_email` lookup). "Valid email" therefore means: the doctor is linked to an account with a non-empty, well-formed email. Doctors without a linked account are silently skipped (logged, no error shown to the user).

## What each email contains

**New visit recorded**
- Visit code, visit/discharge date, patient name and ID
- Reason for visit, payment type (cash / insurance + company), amount
- Note that the amount is subject to the usual approval flow

**Bank advice generated**
- Advice reference/filename and generation date
- Payment mode (bank / cash / cheque)
- Gross, TDS and net amount for that doctor's payment(s) only
- Number of payments included

Both use the same WestMed green branding and the same verified sender domain already used for login and digest emails.

## Technical detail

**Trigger points (client-side, after a successful save)**
- `src/components/VisitManagement.tsx` — after the new-visit `insert` succeeds (create branch only, not the update branch). The insert will be changed to `.select().single()` so the new visit id/code is available.
- `src/components/BankAdviceGeneration.tsx` — after `bank_advice_history` is written, one call per distinct doctor in `doctorPaymentIds`. Quick payments and staff payments are not doctor-linked and are skipped.
- `src/components/bank-advice-beta/BetaGeneratedAdviceTab.tsx` / `BankAdviceGenerationBeta.tsx` — same call at its advice-generation point so the beta screen behaves identically.

**New edge function `notify-doctor-event`** (`verify_jwt = false`, service role)
- Body: `{ event: 'visit_created' | 'bank_advice_generated', doctorId, payload }`, validated with Zod.
- Resolves the doctor row, then the linked account email via the admin API; returns `{ sent: false, reason: 'no_email' }` when absent or malformed.
- Re-reads the visit / payment amounts server-side from `visits`, `payments` and `bank_advice_history` rather than trusting the client body, so emailed figures always match the database.
- Invokes `send-transactional-email` with idempotency keys `visit-created-<visit_id>` and `advice-<advice_id>-<doctor_id>`, so retries or double-clicks never duplicate a send.
- Failure to send never blocks the save — the UI flow continues and errors are logged only.

**New templates** in `supabase/functions/_shared/transactional-email-templates/`, registered in `registry.ts`:
- `doctor-visit-recorded.tsx`
- `doctor-bank-advice.tsx`

**Deploy**: `notify-doctor-event` plus `send-transactional-email` (registry change), and add the function to `supabase/config.toml`.

## Assumptions

- Bank advice emails go out for all three modes (bank, cash, cheque), since each represents money released to the doctor.
- Emails are sent immediately, not batched.
