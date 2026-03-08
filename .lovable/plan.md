

# Fix Create Task Dialog: Proper Layout & Outside Click Restriction

## Issues Found

1. **Footer buttons scroll away** — The Cancel/Create buttons are inside `ScrollArea` with a `sticky` hack that doesn't work reliably
2. **Form structure doesn't match the standardized pattern** — DoctorManagement uses `grid grid-rows-[auto_minmax(0,1fr)_auto]` on DialogContent + `grid grid-rows-[minmax(0,1fr)_auto]` on form, which keeps header and footer fixed while body scrolls
3. **Outside click restriction works** via `hasUnsavedChanges` prop — but the `onConfirmClose` calls `setDialogOpen(false)` which is correct; the discard flow dispatches an Escape event which may not work reliably since the dialog's `onEscapeKeyDown` intercepts it again

## Changes

### `src/components/TaskManagement.tsx` — Create Task Dialog

Restructure the dialog to match the DoctorManagement pattern:

- **DialogContent**: Use `className="max-w-2xl max-h-[85vh] grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden"` (header row + form row)
- **Form**: Use `className="grid grid-rows-[minmax(0,1fr)_auto] overflow-hidden min-h-0"` (scroll area + footer)
- **ScrollArea**: Move to `className="h-full pr-4 -mr-4"` with inner `div` for padding
- **Footer**: Move **outside** ScrollArea as a separate `div` with `pt-4 border-t flex-shrink-0 bg-background`
- Add `DialogDescription` for accessibility

### `src/components/ui/dialog.tsx` — Fix Discard Close Loop

The `handleConfirmDiscard` dispatches a synthetic Escape event which gets intercepted by `onEscapeKeyDown` again (infinite loop risk). Fix: set a ref flag `isDiscarding` that bypasses the intercept on the next Escape, or simply have `onConfirmClose` handle the close directly (the parent already calls `setDialogOpen(false)` which closes the Radix dialog via controlled `open` prop — the synthetic Escape dispatch is unnecessary).

- Remove the synthetic Escape dispatch from `handleConfirmDiscard` — `onConfirmClose` already handles closing
- This makes the outside-click restriction work cleanly

## Files

| File | Change |
|------|--------|
| `src/components/TaskManagement.tsx` | Restructure Create Task dialog layout to grid pattern with fixed footer outside ScrollArea |
| `src/components/ui/dialog.tsx` | Remove synthetic Escape dispatch from handleConfirmDiscard to fix close flow |

