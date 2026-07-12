## Goal
Let admins and managers delete an unpaid visit (and its related rows) directly from the Doctor Hub → Unpaid list, without leaving the screen.

## Scope
- Doctor Hub desktop table + `DoctorHubMobile` unpaid list only.
- Only visits with `is_processed = false` (i.e. truly unpaid, never entered a payment batch). Paid/processed rows stay non-deletable.
- Restricted to `userRole === 'admin' || userRole === 'manager'`. Others don't see the button.

## UI changes
- In each unpaid visit row (both DoctorHub.tsx desktop expanded panel around L586–610, and the mobile equivalent in `DoctorHubMobile`), add a small trash icon button on the right.
- Click → confirmation dialog (`AlertDialog`, not native `confirm`) showing: patient name, visit code, date, amount, and a warning line "This will permanently remove the visit and its related unpaid records."
- On success: toast, remove row from local `unpaidVisits`, refresh doctor summary (re-run the RPC that populates `doctors[]` so Unpaid amount/visits count decrement).

## Data / backend
Visits can have dependent rows. Safe delete needs a single RPC so it's atomic and permission-checked server-side:

1. New Postgres function `delete_unpaid_visit(_visit_id uuid)`:
   - `SECURITY DEFINER`, `search_path = public`.
   - Verify caller role via `has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager')` — raise exception otherwise.
   - Load the visit; if `is_processed = true` OR `processed_in_payment_id IS NOT NULL` → raise `'Visit already processed, cannot delete'`.
   - Delete dependent rows first (only those tied to this unprocessed visit): any `visit_*` child tables, insurance visit links, audit-only children. Then delete the visit.
   - Return the deleted `visit_id`.
2. Grant `EXECUTE` to `authenticated`.
3. Add an `audit_log` insert inside the function capturing actor, visit_id, doctor_id, amount, timestamp.

I'll enumerate the actual child tables from the schema before writing the migration (visits FK inbound scan) so nothing dangling is left.

## Frontend wiring
- New helper `deleteUnpaidVisit(visitId)` in `DoctorHub.tsx` calling `supabase.rpc('delete_unpaid_visit', { _visit_id })`.
- On success: `setUnpaidVisits(prev => prev.filter(v => v.id !== visitId))` and re-fetch `doctors` summary.
- Button disabled while request in flight.
- Hide button entirely when `userRole` is not admin/manager (read from existing auth hook already used in Doctor Hub).

## Conflicts / risks to flag
1. **Processed visits**: a visit already inside a manager- or admin-approved payment batch must never be deletable — server RPC enforces, UI also hides for `is_processed`. The current "Unpaid" list is defined as `unpaid_amount > 0` for the doctor, but a doctor's unpaid bucket can still include visits already sitting in a *pending* batch (created but not approved). Deleting those would corrupt the batch totals. Decision needed: (a) block delete if the visit is referenced by any `payment_batch_items` row, or (b) allow and cascade-remove the batch line. Recommendation: **block** and show reason "Visit is part of a pending payment batch — remove it from the batch first."
2. **Bank advice / GEFU**: same as above — if the visit is on a generated advice, block.
3. **TDS / part-payment history**: unpaid visits shouldn't have these, but the RPC will double-check `part_payments` / `tds_entries` FK and refuse if present.
4. **Audit trail**: deletion is destructive; the audit log insert above is mandatory so admins can trace who removed what.
5. **Undo**: no soft-delete today. If you want reversibility, we'd instead add a `deleted_at` column and filter it out — bigger change. Default plan is hard delete + audit row.
6. **Mobile fallback password (9629945305)**: your existing rule for deleting pending payments requires admin + fallback password. Do you want the same password gate here, or is role-only sufficient? **Recommendation: role-only** because these are unpaid visits (no money moved yet), unlike pending payments.
7. **Concurrent state**: if a manager approves a batch between the UI opening and the delete click, the RPC's `is_processed` check will correctly reject with a clear error — UI shows the toast and refreshes the list.

## Files touched
- `src/components/DoctorHub.tsx` — add delete button + handler in unpaid rendering blocks (desktop L586–610, and total-tab block near L994).
- `src/components/DoctorHubMobile.tsx` — mirror the button in mobile unpaid rows.
- New Supabase migration: `delete_unpaid_visit` RPC + grant + audit insert.
- No changes to `VisitManagement` (already has its own delete flow).

## Open questions before build
1. Batch/advice conflict: **block** (recommended) or **cascade-remove**?
2. Fallback-password gate: **role only** (recommended) or match pending-payments rule?
3. Hard delete vs. soft delete (`deleted_at`)?
