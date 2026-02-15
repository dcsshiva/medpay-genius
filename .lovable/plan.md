

## Replace Staff Member Dropdown with Searchable Combobox

### What
Replace the standard `<Select>` dropdown for "Staff Member" in the Create Performance Appraisal form with a searchable combobox (similar to the existing `VendorSearchCombobox` pattern), allowing users to filter staff by name or staff code.

### Changes

**File: `src/components/StaffAppraisalManagement.tsx`**

1. Import the `VendorSearchCombobox` component (it already supports `id`, `code`, `name` items -- matching staff data perfectly)
2. Replace the `<Select>` block (lines 579-586) with `<VendorSearchCombobox>`, mapping `staffList` items to `{ id, code: staff_code, name: full_name }`
3. No state changes needed -- `selectedStaffForAppraisal` and `setSelectedStaffForAppraisal` already work with staff `id` values

