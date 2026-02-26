

## Add Password-Protected Delete for Payment Lines (Admin Only)

### Problem
Currently, deleting payment rows in the "waiting for approval" stage uses a simple browser `confirm()` dialog with no security. The user wants a password verification step to prevent accidental or unauthorized deletions.

### Changes

**File: `src/components/PaymentManagement.tsx`**

1. **Add state variables** for the delete confirmation dialog:
   - `deletePaymentId` -- stores the payment ID to delete
   - `showDeleteDialog` -- controls dialog visibility
   - `deletePassword` -- stores the entered password

2. **Update `handleDeletePayment`** function:
   - Remove the `confirm()` browser dialog
   - Instead, set `deletePaymentId` and open the password dialog
   - Keep the existing transaction check (payments with transactions can't be deleted)

3. **Add `confirmDeleteWithPassword`** function:
   - Validates the entered password against `9629945305`
   - If correct, proceeds with the Supabase delete operation (existing logic)
   - If incorrect, shows an error toast
   - Resets dialog state after completion

4. **Add a Delete Confirmation Dialog** (at the bottom of the component JSX):
   - Dialog with password input field (type="password")
   - Warning message explaining this action is irreversible
   - Cancel and Confirm Delete buttons
   - Only accessible to admin role users (the existing code already restricts delete actions to admin + pending status)

### Security Note
The password `9629945305` is a client-side fallback password as requested. The existing admin role check and RLS policies on the `payments` table provide the actual server-side security. Only admin-designated users can delete payments via RLS.

### Technical Details
- No new files created
- No database changes needed
- No new dependencies
- Single file modified: `src/components/PaymentManagement.tsx`
- The table component (`PaymentManagementTable.tsx`) already passes `onDelete` only when `userRole === 'admin'` and `status === 'pending'`, so no changes needed there

