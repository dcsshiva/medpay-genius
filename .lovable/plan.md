

## Simplify Cash/Insurance Payment Management for All Devices

### Problem
The Payment Management screens have 12+ table columns, long tab labels, and desktop-oriented layouts that are hard to use on tablets and phones.

### Changes

**1. Mobile Card View in PaymentManagementTable (`src/components/PaymentManagementTable.tsx`)**
- Import `useIsMobile` hook
- On mobile, replace the wide table with a stacked card layout showing:
  - Doctor name + code (header)
  - Key amounts: Total, Net Payable, Remaining (compact grid)
  - Status badge + action buttons (footer)
  - Expandable section for TDS/Gross details
- Keep the full table on desktop (no changes)

**2. Responsive Stats Cards (`src/components/PaymentManagement.tsx`)**
- Change stats grid from `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` to `grid-cols-2 md:grid-cols-2 lg:grid-cols-4`
- This gives a 2x2 grid on mobile instead of stacking vertically

**3. Mobile-Friendly Tabs (`src/components/PaymentManagement.tsx`)**
- Make tab labels shorter on mobile using responsive text:
  - "Waiting for Approval (29)" becomes "Approval (29)"
  - "Waiting for bank approval (0)" becomes "Bank (0)"
  - "Bank Advice (2)" stays short
  - "Bank Advice History" becomes "History"
- Add horizontal scroll to TabsList with `overflow-x-auto`

**4. Compact Search Section (`src/components/PaymentManagement.tsx`)**
- Make filter buttons scrollable horizontally on mobile instead of wrapping
- Reduce padding on mobile for the search card

**5. Mobile-Friendly Bulk Approval Controls (`src/components/PaymentManagement.tsx`)**
- Stack the "Payments Waiting for Approval" heading and bulk controls vertically on mobile
- Use full-width buttons on small screens

### Technical Details

**Files modified:**
- `src/components/PaymentManagementTable.tsx` -- Add mobile card view with `useIsMobile`
- `src/components/PaymentManagement.tsx` -- Responsive stats grid, compact tabs, scrollable filters, stacked bulk controls

**No new dependencies needed.** Uses existing `useIsMobile` hook and Tailwind responsive classes.

