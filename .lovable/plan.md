

## Doctor Dashboard Paid/Unpaid Logic Fix + PWA & Clickable Dashboard Enhancement

### Problem Statement
1. **Paid/Unpaid logic is incomplete**: Currently, "Unpaid" only shows `is_processed=false` visits. The correct logic is: once a visit is created (cash OR insurance), it should appear as **Unpaid**. Only after **bank advice is generated** should it move to **Paid**. This means visits that have been processed into payment advices but NOT yet bank-advice-generated should ALSO show as unpaid.
2. **Session auto-logout**: Doctor and staff users should never be auto-logged out (already disabled via no-op `SessionTimeoutWrapper` -- will verify and reinforce).
3. **Clickable data labels**: Summary numbers/labels in both Doctor and Staff dashboards should be clickable to navigate to relevant detail views.

---

### Changes

#### 1. Fix Paid/Unpaid Logic in DoctorHub.tsx

**Summary calculation (`fetchDoctorSummaries`):**
- **Paid** = Sum of `net_amount` from `payments` where `bank_advice_generated = true` (unchanged, correct)
- **Unpaid** = Sum of ALL visits (`visit_payment`) MINUS visits that belong to bank-advice-generated payments. This captures:
  - Unprocessed visits (`is_processed = false`)
  - Processed visits in payment advices that are pending/approved but NOT yet bank-advice-generated
- Simplified approach: Unpaid = total of all visits - paid amount from bank-advice-generated payments

**Unpaid detail view (`fetchUnpaidVisits`):**
- Fetch unprocessed visits (`is_processed = false`) -- these are raw visits not yet in any payment advice
- ALSO fetch visits linked to payments where `bank_advice_generated = false` (in-progress payment advices) via `payment_visits` join
- Deduplicate by visit ID
- Show payment status labels: "Unprocessed", "Pending Approval", "Manager Approved", "Admin Approved"

#### 2. Doctor Dashboard Mobile - Make Summary Cards Clickable

In `DoctorHubMobile.tsx`, add clickable summary cards at the top showing:
- **Paid amount** (taps to Paid tab)
- **Unpaid amount** (taps to Unpaid tab)  
- **Total amount** (taps to All tab)

These cards will show the amounts from the `doctor` prop and switch tabs on click.

#### 3. Staff Dashboard - Ensure All Stats Are Clickable

Already mostly clickable (each card has `onClick={() => onNavigate(...)}`). Will verify:
- Pending Tasks -> tasks
- Completed Tasks -> tasks
- Pending Leave -> leave-permission
- Approved Leave -> leave-permission
- Latest Appraisal -> appraisal view
- Active Warnings -> already shown inline
- Latest Payslip -> payroll
- Complaints quick action -> complaints

Add `Rejected Leave` count card (currently tracked but not shown as a clickable card).

#### 4. Session Persistence Confirmation

The session timeout is already fully disabled (`SessionTimeoutWrapper` is a pass-through, `useSessionTimeout` returns dummy values with `remainingTime: 9999`). No changes needed here -- doctors and staff stay logged in until manual logout.

#### 5. PWA Compatibility

The Doctor Hub Mobile already uses touch-optimized elements (44px+ targets), card-based layouts, and responsive design. Will ensure:
- All new clickable cards have minimum 44px touch targets
- Pull-to-refresh pattern works with the data refetch
- Cards use `active:scale-95` transition for touch feedback

---

### Technical Details

**Files to modify:**

1. **`src/components/DoctorHub.tsx`**
   - `fetchDoctorSummaries`: Change unpaid calculation to include visits in non-bank-advice-generated payments
   - `fetchUnpaidVisits`: Include visits from pending payments (not just `is_processed=false`), add status labels

2. **`src/components/DoctorHubMobile.tsx`**
   - Add 3 summary stat cards (Paid/Unpaid/Total) at the top of the dashboard, each clickable to switch tabs
   - Cards show amount + count with color coding

3. **`src/components/StaffMobileDashboard.tsx`**
   - Add rejected leave count card (clickable -> leave-permission)
   - Verify all existing cards remain clickable

### Unpaid Calculation Logic (Revised)

```text
Unpaid = 
  (All visits with is_processed=false) 
  + (Visits linked to payments where bank_advice_generated=false)

Paid = Payments where bank_advice_generated=true (net_amount)

Total = Paid + Unpaid
```

This ensures the complete lifecycle: Visit Created -> Unpaid -> Payment Advice Created (still Unpaid) -> Bank Advice Generated -> Paid.

