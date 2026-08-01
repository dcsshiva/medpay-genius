# Fix Email OTP + Enable Username/Password Login

## What is happening

**1. Users get a "One-time login link" instead of a 6-digit code**

Verified: the new backend has **no email domain and no auth email templates configured** (email setup status: not started). After the migration, the old project's custom email template did not come across, so login emails fall back to Lovable's default *magic link* template — a "Log In" button instead of the 6-digit code the login screen asks for. Gmail also flags the default sender as suspicious/spam (as seen in the screenshot) because it is not sent from your own domain.

The app code is correct: it calls the 6-digit OTP flow and verifies with `type: 'email'`. Only the email template is wrong.

**2. Username/password login already exists but does not create a real session**

Verified: the Password tab is wired up, `verify_user_login` exists in the database, and all 58 staff and 92 doctor records migrated with usernames and password hashes intact. However, that path builds a *mock* session locally instead of a real backend session, so database security rules treat those users as anonymous — many screens will silently return no data.

## What will be done

### Part 1 — Restore proper 6-digit OTP emails
- Set up email sending on your own domain (`westmedhospital.com`, e.g. a `mail.` / `notify.` subdomain) so login emails come from WestMed, not a generic sender. This removes the Gmail "might be dangerous" warning.
- Generate branded auth email templates and change the sign-in template to display the **6-digit code** prominently (with the link only as a secondary option), styled with the WestMed green/white identity.
- Deploy the email hook and raise the hourly auth-email limit so bulk logins are not rate-limited.
- Until DNS finishes verifying, Mobile OTP and Username/Password logins remain fully usable.

### Part 2 — Make username/password a real login
- Password tab keeps accepting **username or email**.
- New flow: resolve the username to the user's login email using the existing secure database functions (`get_staff_auth_email` / `get_doctor_auth_email`), then sign in through real backend authentication so the user gets a genuine session and full data access.
- If the user has no backend password set yet, fall back to the current `verify_user_login` check and, on success, transparently set/sync their backend password so subsequent logins use the real session path.
- Keep the existing admin tool (Update Staff Member dialog) as the way to set or reset a user's password; make sure it updates both the backend credential and the staff record together.
- Clear error messages: wrong password, inactive account, no password set.

### Part 3 — Post-migration configuration audit (report back)
Check and report: site/redirect URLs for the live domain, auth email rate limit, auto-confirm setting, all 8 edge functions responding, and any secrets that need re-binding after the move.

## Technical notes
- No schema changes are required for Part 1.
- Part 2 touches `src/lib/auth.tsx` (`signInWithUsername`), `src/pages/Auth.tsx` (error handling), and possibly the `update-user-credentials` function for password sync.
- Email work uses managed Lovable email infrastructure with NS delegation on a subdomain of `westmedhospital.com`; no third-party email provider or API key.

## Needs your input
Approving this plan will open the email domain setup dialog for `westmedhospital.com`. If you would rather keep the default sender for now, say so and I will only do Parts 2 and 3 (mobile OTP and username/password would then be the reliable login methods).
