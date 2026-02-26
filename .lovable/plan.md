

## Default Discharge Date Sort to Descending

### Problem
Currently the payment table initializes with `sortConfig` set to `null`, meaning no default sort is applied. The user wants discharge dates sorted newest-first by default.

### Change

**File: `src/components/PaymentManagementTable.tsx`**

- Change the initial `sortConfig` state from `null` to `{ key: 'discharge_date', direction: 'desc' }` (line 131)
- This applies to both Cash and Insurance Payment Management since they share the same table component

### Impact
- One line change
- Discharge date column will show the descending sort indicator on load
- Users can still click to toggle sort direction as before

