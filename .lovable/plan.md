## Why the tabs are empty

The summary cards work because `get_doctor_hub_summaries` is a **SECURITY DEFINER** RPC — it bypasses RLS and returns Paid (23) / Unpaid (30) for Dr.Manomenane (`abc145bd-…`).

When the doctor clicks **Paid / Unpaid / All**, the code hits the tables directly:

- `fetchPaymentHistory` → `supabase.from('payments').select(...).eq('doctor_id', …)`
- `fetchUnpaidVisits` → `supabase.from('visits')` + `supabase.from('payments')`
- `fetchPaymentVisitDetails` (row expand) → `supabase.from('payment_visits')`

These rely on RLS policies like `doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())`. Mobile OTP login has two paths in `src/lib/auth.tsx`:

1. Magic-link `verifyOtp` → real Supabase session → `auth.uid()` valid → RLS allows.
2. Fallback "mock session" with our own `session_token` (lines 833–874) → **`auth.uid()` is NULL** → RLS returns 0 rows silently → tabs show "No paid payments" / "No unpaid visits" even though counts are 23/30.

Dr.Manomenane is on path 2, so all direct table reads come back empty. No error is raised — just empty arrays.

## Fix

Mirror the summary pattern: serve doctor detail data through SECURITY DEFINER RPCs so it works regardless of how the session was established.

### 1. New DB functions (single migration, all `SECURITY DEFINER`, `search_path = public`)

- `get_doctor_paid_payments(_doctor_id uuid, _start date default null, _end date default null)`
  Returns `id, period_start, period_end, gross_amount, tds_amount, net_amount, bank_advice_generated_at` for `doctor_id = _doctor_id AND bank_advice_generated = true`, optional period filter, ordered by `bank_advice_generated_at desc`.

- `get_doctor_unpaid_visits(_doctor_id uuid, _start date default null, _end date default null)`
  Returns a unified row set with columns matching the existing `UnpaidVisit` shape (`id, visit_code, visit_date, patient_name, visit_payment, payment_type, is_processed, payment_status`) combining:
  - Unprocessed visits (`visits.is_processed = false`), `payment_status = 'unprocessed'`.
  - Visits inside non-released, non-rejected payments (`is_fully_paid = false AND status <> 'rejected' AND bank_advice_generated = false`), `payment_status` derived from `payments.status` (Pending Approval / Manager Approved / Admin Approved / In Payment) and de-duplicated against the unprocessed set.

- `get_doctor_payment_visit_details(_payment_id uuid)`
  Returns `id, visit_code, visit_date, patient_name, payment_type, visit_payment, status` for visits in a given payment. Internally verifies the payment exists; relies on caller already knowing the payment id (which only came back from the paid-payments RPC for that doctor).

All three: `GRANT EXECUTE ... TO authenticated, anon;` (anon used because fallback mock sessions are effectively anon to PostgREST).

### 2. Frontend (`src/components/DoctorHub.tsx`)

- Replace the body of `fetchPaymentHistory` with `supabase.rpc('get_doctor_paid_payments', { _doctor_id: doctorId, _start, _end })`.
- Replace the body of `fetchUnpaidVisits` with a single `supabase.rpc('get_doctor_unpaid_visits', …)` and drop the in-JS dedupe/merge (now done in SQL).
- Replace `fetchPaymentVisitDetails` to use `supabase.rpc('get_doctor_payment_visit_details', { _payment_id })`.
- Keep all existing state, toggling, realtime subscription, mobile/desktop branches, export hook — only the data source changes.

### 3. Regenerated types

`src/integrations/supabase/types.ts` will pick up the three new RPCs automatically (no manual edit).

## Out of scope

- No changes to RLS policies, no changes to `payments` / `visits` / `payment_visits` grants.
- No change to the OTP login flow — keeping the fallback path intact, just making detail reads independent of `auth.uid()`.
- No UI/layout changes.

## Verification

1. Log in as Dr.Manomenane on mobile → All / Paid / Unpaid tabs populate with rows matching the 23 / 30 counts.
2. Expand a paid row → visit details appear.
3. Admin reverts a bank advice → realtime listener still fires, row moves from Paid to Unpaid.
4. Admin / manager Doctor Hub view still works (same RPCs, same data).
