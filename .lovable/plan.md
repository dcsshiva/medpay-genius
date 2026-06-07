## Goal

In Cash Payment Management → "Payments Waiting for Approval", when the user searches by doctor name, show **all patient names** for each row by default instead of the truncated "+N more" list.

## Change

**`src/components/PaymentManagementTable.tsx`**
- Add a new optional prop `expandPatientsByDefault?: boolean`.
- In the patient names cell (currently lines 478–513), when `expandPatientsByDefault` is true OR the row id is in `expandedPatients`, render the full `payment.patient_names` array.
- When expanded by default, hide the "+N more / Show less" badge (no toggle needed — everything is already visible).
- Desktop table cell and the mobile card variant (same component) both honour the flag.

**`src/components/PaymentManagement.tsx`**
- Compute `const expandPatientsByDefault = searchTerm.trim().length > 0 && (searchFilter === 'doctor_name' || searchFilter === 'doctor_code' || searchFilter === 'all');`
- Pass `expandPatientsByDefault` to all four `<PaymentManagementTable />` instances (Waiting for Approval, Waiting for bank approval, Bank Advice, Bank Advice History) so the behaviour is consistent across tabs.

## Out of scope
- No change to search logic, filters, payment data, or any other column.
- Default behaviour (no search) remains: show 2 names with "+N more" badge.

## Verification
- Search "jayar" in Cash Payment Management → row for JAYARAM SAIBABA shows all 4 patient names (LOURDUSSAMY, DASARADHAN, PAQURIAMMALLE…, SUBRAMANIYAN) with no "+2 more" badge.
- Clear search → rows revert to 2-name preview with "+N more" toggle.
- Searching by Patient Name filter still uses the truncated view (only doctor/all searches auto-expand).
