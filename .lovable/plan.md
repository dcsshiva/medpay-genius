
## Make Unpaid Visit Amount and Status Clickable in Doctor Hub

### What Changes
In the Doctor Hub's "Unpaid Visits (Unprocessed)" expanded table, the **Amount** column and **Status badge** ("unprocessed") will become clickable links that navigate the user to the appropriate next-step screen:
- **Cash** visits navigate to **Cash Payments (Lite)**
- **Insurance** visits navigate to **Insurance Payments (Lite)**

### Technical Details

**File: `src/components/DoctorHub.tsx`**

1. Import `useNavigate` from `react-router-dom`
2. In the unpaid visits table rows (lines 1098-1112), make two cells clickable:
   - **Amount cell** (line 1106-1108): Wrap the amount in a clickable element styled as a link (underline, pointer cursor). On click, navigate to `/dashboard?view=cash-payments-lite` or `/dashboard?view=insurance-payments-lite` based on `visit.payment_type`.
   - **Status badge** (line 1109-1111): Make the "unprocessed" badge clickable with the same navigation logic. Add hover styling to indicate interactivity.

3. Navigation targets:
   - `payment_type === 'cash'` navigates to `cash-payments-lite`
   - `payment_type === 'insurance'` navigates to `insurance-payments-lite`

### Visual Changes
- Amount text gets a clickable underline/hover effect (keeps orange color)
- Status badge gets a cursor-pointer and hover effect
- Both show a tooltip explaining "Click to process in Cash/Insurance Payments"
