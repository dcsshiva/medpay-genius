# Revert Generated Bank Advice

Allow admins to undo a mistakenly generated bank advice file and send the underlying payments back to the approved-pending-generation state, so they can be re-grouped and re-generated.

## Where it appears

- **Bank Advice History** page (current screen — `BankAdviceReports.tsx`)
- **Beta Generated Advice tab** (`BetaGeneratedAdviceTab.tsx`)

Each row gets a new **Revert** button next to Download / Regenerate / View, shown only to **admin** users and only when:
- `reconciliation_status` is `pending` (not yet reconciled with bank)
- File hasn't already been reverted

## User flow

1. Admin clicks **Revert** on a generated advice row.
2. Confirmation dialog: "This will delete the bank advice file and make these N payments available for generation again. Continue?" with mandatory **reason** textarea.
3. On confirm:
   - For doctor payments (`payments` table): set `bank_advice_generated = false`, clear `bank_advice_generated_at` / `bank_advice_generated_by`.
   - For quick payments: same flag reset on `quick_payments`.
   - Insert an audit row capturing who reverted, when, reason, original filename, payment_ids, total amount.
   - Delete the row from `bank_advice_history` / `quick_payment_bank_advice_history` (or soft-delete — see decision below).
4. Toast confirms; list refreshes; the affected payments reappear in **Pending Bank Advice** for re-generation.

## Guardrails

- Block revert if `reconciliation_status` ∈ (`confirmed`, `partially_confirmed`) → toast "Cannot revert a reconciled advice."
- Admin-only (checked via `has_role(auth.uid(), 'admin')`).
- Reason is required (min 5 chars).
- All operations wrapped in a Postgres function (`revert_bank_advice`) so partial failures roll back.

## Open decision

**Hard delete vs soft delete the history row?**
- Hard delete keeps the history clean but loses the file content.
- Soft delete (add `is_reverted`, `reverted_by`, `reverted_at`, `revert_reason` columns; hide reverted rows by default with a toggle "Show reverted") preserves audit trail.

Recommendation: **soft delete** — safer, matches the existing reconciliation audit pattern.

## Technical changes

### Migration
- Add columns to both history tables: `is_reverted boolean default false`, `reverted_by uuid`, `reverted_at timestamptz`, `revert_reason text`.
- Create `bank_advice_revert_log` table (filename, payment_ids jsonb, total_amount, source, reverted_by, reason, created_at) with RLS: admin select/insert.
- Create RPC `public.revert_bank_advice(p_history_id uuid, p_source text, p_reason text)`:
  - SECURITY DEFINER, checks `has_role(auth.uid(), 'admin')`.
  - Reads history row, validates `reconciliation_status = 'pending'` and `is_reverted = false`.
  - Updates underlying payments to clear generation flags.
  - Marks history row reverted, writes audit log.
- Filter default queries in both UI tabs with `.eq('is_reverted', false)`.

### Frontend
- `BetaGeneratedAdviceTab.tsx`: add Revert button + confirm dialog with reason field; call `supabase.rpc('revert_bank_advice', …)`.
- `BankAdviceReports.tsx`: same button + dialog inline with existing actions.
- `BetaPendingPaymentsTab.tsx` / `BankAdviceGeneration.tsx`: no change needed — they already query payments where `bank_advice_generated = false`, so reverted payments resurface automatically.

### Files touched
- New: `supabase/migrations/<ts>_revert_bank_advice.sql`
- Edit: `src/components/bank-advice-beta/BetaGeneratedAdviceTab.tsx`
- Edit: `src/components/BankAdviceReports.tsx`
- New: `src/components/bank-advice-beta/RevertAdviceDialog.tsx` (shared dialog)
