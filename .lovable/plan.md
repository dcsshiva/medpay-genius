

## Default Discharge Date Sort to Ascending

### Change

**File: `src/components/PaymentManagementTable.tsx`** (line 131)

- Change `direction: 'desc'` to `direction: 'asc'` in the initial `sortConfig` state
- Discharge dates will sort oldest-first on load for both Cash and Insurance Payment Management

### Impact
- One word change (`desc` to `asc`)
- Users can still click to toggle sort direction

