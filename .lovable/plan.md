

## Make Paid, Unpaid, and Total Numbers Clickable in Doctor Hub Table

### What
Make the Paid amount, Unpaid amount, and Total amount values in the Doctor Hub summary table clickable. Clicking them will expand the doctor's detail view (same behavior as the Paid/Unpaid/Total buttons in the Actions column).

### Changes

**File: `src/components/DoctorHub.tsx`**

- **Paid column (lines 823-831)**: Wrap the amount and count text in a clickable `div` with `cursor-pointer hover:underline` styling. On click, call `handleDoctorClick(doctor.id, 'paid')`.

- **Unpaid column (lines 833-841)**: Same treatment -- clickable div calling `handleDoctorClick(doctor.id, 'unpaid')`.

- **Total column (lines 843-847)**: Same treatment -- clickable div calling `handleDoctorClick(doctor.id, 'total')`.

All three will get `cursor-pointer`, `hover:underline`, and `active:scale-95 transition-transform` for visual feedback, matching the interactive pattern used elsewhere in the app.

