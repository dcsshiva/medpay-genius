

# Fix: All Forms Close on Outside Click

## Investigation Summary

After reviewing all dialog/form implementations across the codebase, the Radix `Dialog` and `Sheet` components have the correct default behavior — they **should** close on overlay click. However, there are two issues:

1. **CSS issue in `dialog.tsx`**: The `DialogContent` has `w-full` which on mobile takes the entire width, leaving zero overlay area to click on left/right sides. Combined with `max-h-[85vh]`/`max-h-[90vh]`, there's barely any clickable overlay.

2. **No explicit overlay click handler**: The `DialogOverlay` component relies purely on Radix's internal `onPointerDownOutside` mechanism. Adding an explicit click handler on the overlay ensures it always works reliably.

## Fix

### 1. Update `src/components/ui/dialog.tsx`
- Add an explicit `onClick` handler on `DialogOverlay` that isn't needed by default but ensures reliability
- More importantly: the `DialogContent` needs `onInteractOutside` to NOT be blocked. Verify `{...props}` passes through correctly (it does).
- The real fix: ensure the overlay is clickable by giving it a higher interaction priority. Add `cursor-pointer` to the overlay for visual feedback.

### 2. Update `src/components/ui/sheet.tsx`
- Same overlay fix for Sheet components.

### 3. Update `src/components/ReportGeneration.tsx`
- This is the **only** file that explicitly blocks outside clicks with `onPointerDownOutside` and `onInteractOutside` containing `e.preventDefault()`. Remove these handlers so the report dialog also closes on outside click.

### 4. Ensure all DialogContent instances don't accidentally block dismissal
- No other files use `onInteractOutside` or `onPointerDownOutside` — confirmed via search. The fix in the base `dialog.tsx` and `sheet.tsx` components will cover all 50+ dialogs across the app.

### Technical detail
The core change is minimal — in `dialog.tsx`, ensure the overlay's pointer events work reliably, and in `ReportGeneration.tsx`, remove the explicit `preventDefault()` calls that block outside-click dismissal.

