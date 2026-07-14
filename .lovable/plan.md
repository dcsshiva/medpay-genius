## Goal
Allow admins/managers to delete a visit that is **processed but still unpaid** (linked payment is in `pending_release` / `not_started` and no money has been released yet). Currently the RPC hard-blocks any processed or payment-linked visit.

## New delete eligibility rules
A visit is deletable when **either**:
- **Unprocessed & unlinked** (existing behavior), OR
- **Processed but truly unpaid**: every linked payment satisfies ALL of:
  - `release_status IN (NULL, 'not_started', 'pending')` (i.e., NOT `partial` or `fully_released`)
  - No rows exist in `public.payment_releases` for that payment
  - `bank_advice_generated` is not true (if the column exists — guarded with `to_regclass`/`information_schema` check)
  - Payment status is not final-paid (allow `pending`, `manager_approved`, `admin_approved`; block only if a downstream "paid/released" state exists)

If any linked payment fails the check → refuse with a specific reason (e.g. "Visit X is linked to payment Y which has already been partially released").

## RPC changes (`public.delete_unpaid_visit`)
Rewrite the function body in a new migration SQL file (`supabase/manual-sql/delete_unpaid_visit_v2.sql`, user runs it manually — external Supabase):

1. Auth + role check unchanged (admin/manager only).
2. Load visit; if not found → error.
3. Fetch all `payment_visits` rows for the visit, JOIN `payments`.
4. For each linked payment, enforce the "truly unpaid" rules above. On any violation → `RAISE EXCEPTION` with the payment id and the reason.
5. Inside a single transaction:
   - `DELETE FROM payment_visits WHERE visit_id = _visit_id` (capture affected payment_ids).
   - For each affected payment: recompute `total_visits`, `total_amount` (and `tds_amount`/`net_amount` if columns exist) from remaining `payment_visits`.
   - If a payment now has zero remaining visits → `DELETE FROM payments WHERE id = <payment_id>` (only safe because we already confirmed nothing was released and no `payment_releases` rows exist).
   - `DELETE FROM visits WHERE id = _visit_id`.
6. Return jsonb: `{ success, visit_id, visit_code, deleted_payment_ids, updated_payment_ids, reason }`.

Grants unchanged (`EXECUTE` to `authenticated`, revoke from `PUBLIC`).

## UI changes
- `src/components/DeleteUnpaidVisitButton.tsx` — update the confirmation copy: "This permanently removes the visit. It works for unprocessed visits and for visits linked to a payment that has not been released yet."
- No changes needed to `DoctorHub.tsx` / `DoctorHubMobile.tsx` — the button is already rendered on unpaid rows (which include `pending_release`). Toast error messages from the RPC will now surface the specific reason if a payment is already released.

## Files touched
- `supabase/manual-sql/delete_unpaid_visit_v2.sql` (new — user runs in SQL Editor; keep the old v1 file for reference)
- `src/components/DeleteUnpaidVisitButton.tsx` (copy update only)

## Not doing
- No changes to payment approval flow, release history, or bank advice generation.
- No `pending_release` enum additions — reusing existing `release_status` values.
- Not touching `src/integrations/supabase/types.ts` (RPC signature unchanged).
