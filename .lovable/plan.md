

## Fix Regenerate to Use Current Date

### Problem
When clicking "Regenerate" on bank advice, two components use the **original payment date** instead of the **current date** in the GEFU file. This means the Header line and Detail line dates show old dates like `29/01/2026` instead of today's date.

### What Changes

Two files need a one-line fix each:

**1. `src/components/QuickPaymentManagement.tsx` (line 1011)**
- Currently: `const dateStr = format(new Date(latestPayment.created_at), 'dd/MM/yyyy');`
- Fix to: `const dateStr = format(new Date(), 'dd/MM/yyyy');`

**2. `src/components/quick-payment/StaffPaymentHistoryTab.tsx` (line 274)**
- Currently: `const dateStr = format(new Date(payment.payment_date), 'dd/MM/yyyy');`
- Fix to: `const dateStr = format(new Date(), 'dd/MM/yyyy');`

### Already Correct (no changes needed)
- `BankAdviceReports.tsx` -- all three branches (doctor, quick_payment, staff_payment) already use `new Date()`
- `BetaGeneratedAdviceTab.tsx` -- already uses `new Date()`

### Result
After regeneration, the GEFU file will show today's date in the H~ header line and all D~ detail lines, e.g.:
```
H~10/02/2026~ABC07112007
D~N06~120000794291~Westmed Healthcare Pvt Ltd~...~10/02/2026~6300.00~...
F~1~6300.00
```
