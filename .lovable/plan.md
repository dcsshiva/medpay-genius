

## Add Search to Vendor Dropdown in Quick Payment

### Problem
When "Vendor Payment" is selected as the payment type, the vendor dropdown shows a long list of vendors (e.g., VEN011, VEN027, VEN012, etc.) with no way to search or filter. Users must scroll through the entire list to find their vendor.

### Solution
Replace the plain `<Select>` dropdown for vendors with a searchable combobox (similar to the existing `DoctorSearchCombobox` pattern already in the codebase). This will allow users to type and search vendors by name or vendor code.

### What You'll See
- After selecting "Vendor Payment" as the payment type, a searchable dropdown appears for "Select Vendor"
- You can type to filter vendors by vendor name or vendor code (e.g., typing "CHEM" will filter to "VEN013 - CHEMSOLUTIONS")
- The dropdown shows matching results with vendor code and name
- Selected vendor shows with a checkmark
- Same auto-fill behavior for bank details, mobile number, and GST after selecting a vendor

### Technical Details

#### New File: `src/components/ui/vendor-search-combobox.tsx`
Create a new searchable combobox component for vendors, following the existing `DoctorSearchCombobox` pattern:
- Uses `Popover` + `Command` (combobox) from the existing UI library
- Accepts vendors list, current value, and onChange callback
- Search input filters vendors by `vendor_code` or `vendor_name`
- Displays vendor code and name in a two-line format (code as subtitle)
- Shows a search icon and chevron indicator
- Minimum 1 character to start filtering (vendors are fewer than doctors, so less need for a 3-character minimum)

#### Modified File: `src/components/QuickPaymentManagement.tsx`
- Import the new `VendorSearchCombobox` component
- Replace the plain `<Select>` for vendor selection (lines 1133-1148) with `<VendorSearchCombobox>`
- Same `handleVendorChange` callback is used -- no logic changes needed
- Also apply the same pattern to the **Staff Member** dropdown (lines 1155-1171) for consistency, since it can also have a long list

#### Files Summary

| File | Action |
|------|--------|
| `src/components/ui/vendor-search-combobox.tsx` | New -- searchable vendor combobox |
| `src/components/QuickPaymentManagement.tsx` | Replace vendor `<Select>` with searchable combobox; also replace staff `<Select>` with a similar searchable pattern |

