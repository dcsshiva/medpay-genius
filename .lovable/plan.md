

# Form UI/UX Standardization Plan

## Three Forms to Update

1. **Record New Visit** (`VisitManagement.tsx`) — already has section headers with icons, mobile Sheet. Needs visual polish.
2. **Add New Staff Member** (`StaffManagement.tsx`) — has ScrollArea, grid layout. Needs section grouping and visual consistency.
3. **Add New Doctor** (`DoctorManagement.tsx`) — flat list of fields, no ScrollArea, no sections. Needs the most work.

## Outside-Click Close Behavior

All three forms already use `Dialog` (desktop) or `Sheet` (mobile) from Radix, which close on overlay click by default. The user wants to **restrict** this — clicking outside should close the form. This is already the default behavior. I will verify `onInteractOutside` is not being prevented and ensure all three dialogs allow overlay-click dismissal consistently.

## Changes Per Form

### 1. DoctorManagement.tsx (Add New Doctor)
Currently a flat `space-y-4` form with `overflow-y-auto` on `DialogContent`. Redesign to:
- Add `ScrollArea` for the form body with a fixed footer
- Group fields into visual sections with icons and dividers:
  - **Personal Information** — Name, Code, Specialization, PAN, Status
  - **Account & Login** — Email, Mobile, Password
  - **Bank Details** — Account holder, Account number, Bank name, Branch, IFSC
- Use 2-column grid layout where appropriate (Name + Code, Email + Mobile, etc.)
- Fixed footer with Cancel/Submit buttons separated by `border-t`
- Add `hover:border-primary/50` transition on all inputs

### 2. StaffManagement.tsx (Add New Staff Member)
Already has ScrollArea and grid. Improvements:
- Add section headers with icons and dividers to match Visit form pattern:
  - **Staff Identity** — Staff Code, Username, Full Name, Password
  - **Contact Information** — Email, Phone
  - **Bank Details** — existing section (already has a header, add icon)
  - **Role Assignment** — Department, Role
- Consistent icon + uppercase label pattern for section headers

### 3. VisitManagement.tsx (Record New Visit)
Already well-structured with section icons. Minor polish:
- Ensure desktop Dialog has proper `ScrollArea` wrapper (currently just `overflow-y-auto`)
- Make section header styling consistent (use same background/padding pattern across all three forms)

### Shared Standards
- Section headers: icon + uppercase text + bottom border, consistent across all forms
- Inputs: `hover:border-primary/50 focus-visible:border-primary transition-colors` on all
- Footer: `border-t pt-4` with right-aligned Cancel + Submit
- ScrollArea for form body in all dialogs
- `max-h-[85vh]` on desktop, Sheet `h-[95vh]` on mobile (Visit form pattern)
- All forms closable by clicking outside (default Radix behavior — no `onInteractOutside` prevention)

### Files Changed
| File | Scope |
|------|-------|
| `src/components/DoctorManagement.tsx` | Major — add sections, ScrollArea, grid layout, visual polish |
| `src/components/StaffManagement.tsx` | Medium — add section headers with icons, visual consistency |
| `src/components/VisitManagement.tsx` | Minor — ScrollArea on desktop, consistency tweaks |

No database or logic changes. All form handlers, validation, and submit logic preserved exactly.

