# Daily Operations Digest Email

Send one branded summary email per day covering new visits and all payment activity, using the same verified sender domain already powering the login/auth emails (`notify.smail.westmedhospital.com`).

## What the recipients get

One email each morning (default 08:00 IST, covering the previous 24 hours) with:

- New visits recorded — count, plus a compact table (visit code, date, doctor, patient, amount)
- New payments created — doctor/insurance/cash/quick/staff payments
- Approvals — manager-approved and admin-approved payments
- Released payments and bank advices generated
- Part payments and reversals/undo actions
- Totals per section, so the numbers can be sanity-checked at a glance

If there was zero activity in the period, no email is sent (keeps the inbox clean).

Styling matches the existing WestMed green auth emails.

## Who receives it

A new **Notification Recipients** section in Settings where admins can add, remove, enable or disable email addresses. Seeded with:

- drarulmani375@gmail.com
- deepanjr10@gmail.com

Only admin / super_admin can view and edit the list.

## Technical detail

**Backend setup**
- Run app-email scaffolding (`send-transactional-email`, unsubscribe handler, suppression handler) on the existing queue infrastructure — no new domain or keys needed.
- New template `supabase/functions/_shared/transactional-email-templates/daily-ops-digest.tsx`, registered in `registry.ts`.

**Database**
- New table `public.email_notification_recipients` (`email`, `label`, `is_active`, `digest_enabled`), with GRANTs, RLS (read/write restricted to admin + super_admin via existing `has_designation`), and the two seeded addresses.

**Digest function**
- New edge function `daily-ops-digest` (service role, cron-triggered) that aggregates the window `now() - 24h`:
  - `visits` — new rows by `created_at`
  - `payments`, `quick_payments`, `staff_payments` — new rows by `created_at`; approvals by `status` in (`manager_approved`, `admin_approved`) with `updated_at` in window
  - `payment_releases` — releases and part payments
  - `bank_advice_history`, `quick_payment_bank_advice_history`, `staff_payment_bank_advice_history` — advices generated
  - `bank_advice_revert_log` — reversals/undo
- Sends one `send-transactional-email` invocation per active recipient with an idempotency key of `ops-digest-<date>-<email>` so a re-run never duplicates.
- Also exposes a manual `POST { date }` trigger so the digest can be re-sent or previewed on demand.

**Schedule**
- pg_cron job at 02:30 UTC (08:00 IST) calling the function via `net.http_post`.

**Frontend**
- `src/components/NotificationRecipients.tsx` — table with add/remove/toggle, mounted as a tab inside `Settings.tsx`, with a "Send test digest now" button for admins.

## Out of scope

Per-transaction instant emails are not included — everything is rolled into the once-daily digest as chosen.
