

# Unsaved Changes Confirmation Dialog

## Approach

Rather than modifying every individual form component (28+ files use dialogs), the fix goes into the **base UI components** (`dialog.tsx` and `sheet.tsx`). This ensures every dialog/sheet across the entire app automatically gets the behavior.

## How It Works

1. **Intercept close attempts** in `DialogContent` and `SheetContent` using Radix's `onInteractOutside`, `onPointerDownOutside`, and `onEscapeKeyDown` handlers.
2. **New optional prop** `hasUnsavedChanges?: boolean` on `DialogContent` and `SheetContent`.
3. When `hasUnsavedChanges` is true and user tries to close (overlay click, X button, Escape key):
   - Prevent default close
   - Show an `AlertDialog` confirmation: "You have unsaved changes. Are you sure you want to discard them?"
   - "Discard" closes the form; "Keep Editing" returns to the form
4. When `hasUnsavedChanges` is false or undefined, default close behavior works as normal.

## Files Changed

| File | Change |
|------|--------|
| `src/components/ui/dialog.tsx` | Add `hasUnsavedChanges` prop to `DialogContent`. Intercept close events, render inner `AlertDialog` confirmation. Override X button click. |
| `src/components/ui/sheet.tsx` | Same pattern for `SheetContent`. |
| `src/components/DoctorManagement.tsx` | Pass `hasUnsavedChanges` prop based on whether any form field is non-empty. |
| `src/components/StaffManagement.tsx` | Same — check if form has data filled. |
| `src/components/VisitManagement.tsx` | Same — check if form has data filled. |

## Implementation Detail

**In `dialog.tsx`** — wrap `DialogContent` with unsaved changes logic:

```tsx
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hasUnsavedChanges?: boolean;
}

const DialogContent = React.forwardRef<...>(({ hasUnsavedChanges, className, children, ...props }, ref) => {
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handleInterceptClose = (e: Event) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      setShowConfirm(true);
    }
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        onInteractOutside={handleInterceptClose}
        onEscapeKeyDown={handleInterceptClose}
        ...
      >
        {children}
        {/* Custom X button that checks unsaved changes */}
        {/* AlertDialog for confirmation */}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
```

**In each form component** — compute `hasUnsavedChanges` by checking if any field differs from initial/empty state, then pass it:

```tsx
const hasUnsavedChanges = Object.values(formData).some(v => v !== '' && v !== true);

<DialogContent hasUnsavedChanges={hasUnsavedChanges}>
```

Same pattern applied to `SheetContent` for mobile forms. The `AlertDialog` confirmation uses the existing `alert-dialog` UI component already in the project.

