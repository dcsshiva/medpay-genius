

## Add Payment Mode Selection to Doctor Cash & Insurance Payment Management

### Problem
The Payment Mode dialog (Bank Transfer / Cash / Cheque) is used in `BankAdviceGeneration.tsx`, `BankAdviceGenerationBeta.tsx`, and `QuickPaymentManagement.tsx`, but NOT in `PaymentManagement.tsx` which handles both Cash and Insurance doctor payments. Currently, the doctor payment flow goes directly to GEFU file generation without offering the choice of payment mode.

### Solution
Integrate the existing `PaymentModeDialog` into `PaymentManagement.tsx` so that when an admin clicks "Review & Generate", the Payment Mode dialog appears first. Based on the selected mode:

- **Bank Transfer**: Proceeds to the existing bank advice review dialog and GEFU file generation (current behavior)
- **Cash Payment**: Updates payment records with `payment_mode: 'cash'` and marks as processed (no file generated)
- **Cheque Issue**: Updates payment records with `payment_mode: 'cheque'` plus cheque details and marks as processed (no file generated)

### Changes

**File: `src/components/PaymentManagement.tsx`**

1. **Import** `PaymentModeDialog`, `PaymentMode`, and `ChequeDetails` from `@/components/PaymentModeDialog`

2. **Add state variables**:
   - `paymentModeDialogOpen` (boolean)
   - `processingPaymentMode` (boolean)

3. **Modify the "Review & Generate" button** (line ~3274):
   - Change `onClick` from `handleOpenBankAdviceReview` to a new function `handleOpenPaymentModeDialog` that first validates selections, calculates totals, then opens the Payment Mode dialog

4. **Add `handlePaymentModeConfirm` handler**:
   - If mode is `'bank'`: close the Payment Mode dialog and call the existing `handleOpenBankAdviceReview()` to show the review dialog and generate GEFU
   - If mode is `'cash'` or `'cheque'`: update selected payments in the database with `payment_mode`, `bank_advice_generated: true`, cheque details (if applicable), then refresh the list

5. **Render the `PaymentModeDialog` component** at the bottom of the JSX, passing:
   - `selectedCount` = number of selected payments
   - `totalAmount` = sum of net amounts of selected payments
   - `isLoading` = processingPaymentMode state

### Flow After Change

```text
Admin selects payments -> Clicks "Review & Generate"
  -> Payment Mode Dialog opens
    -> Bank Transfer: Opens existing review dialog -> GEFU file
    -> Cash Payment: Updates DB records as cash, marks processed
    -> Cheque Issue: Collects cheque details, updates DB, marks processed
```

### Technical Details

The cash/cheque handler will:
1. Fetch selected payment data with doctor details (reusing existing query pattern)
2. Calculate TDS (10%) for each payment
3. Update each payment with `gross_amount`, `tds_amount`, `net_amount`, `payment_mode`, and cheque fields if applicable
4. Mark all as `bank_advice_generated: true` with timestamp and user ID
5. Show success toast and refresh the payment list

