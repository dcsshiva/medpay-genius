

## Fix: Payment Mode Dialog Overflowing When Cheque Is Selected

### Problem
When selecting "Cheque Issue" in the Payment Mode dialog, the cheque details form expands the dialog beyond the visible screen area. The Cancel/Confirm buttons get pushed off-screen.

### Root Cause
In `src/components/PaymentModeDialog.tsx`, the dialog content area uses `flex-1 overflow-y-auto` but the overall dialog container needs `overflow-hidden` to properly constrain the flex layout within `max-h-[90vh]`.

### Changes

**File: `src/components/PaymentModeDialog.tsx`**

1. Add `overflow-hidden` to the `DialogContent` container so the flex layout properly constrains children within `max-h-[90vh]`.
2. Ensure the scrollable content div has proper min-height constraints with `min-h-0` (a common flexbox overflow fix).
3. For the mobile Sheet view, add similar overflow constraints to prevent the same issue on mobile.

```
Before (line ~195):
<DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">

After:
<DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
```

```
Before (line ~203):
<div className="flex-1 overflow-y-auto pr-2">

After:
<div className="flex-1 overflow-y-auto pr-2 min-h-0">
```

This is a standard flexbox fix: without `min-h-0`, flex children default to `min-height: auto` which prevents them from shrinking below their content size, causing overflow.

