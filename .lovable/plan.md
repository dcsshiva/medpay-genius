

# UI/UX Standardization: Task, Staff Appraisal, Leave/Permission, Complaint Management

## Current State

- **TaskManagement**: Create Task dialog is a flat `space-y-4` form with no sections, no ScrollArea, no icons. Update Task and Re-assign dialogs are similarly basic.
- **ComplaintManagement**: Submit Complaint form already has section grouping ("What Happened", "Who & When", "Classification") but uses plain text headers without icons. Admin Response dialog is basic.
- **StaffAppraisalManagement**: Appraisal, Warning, and Activity forms are inline Cards (not dialogs), with no section headers/icons. The rating grid is well-built but the surrounding form lacks visual polish.
- **LeaveApplicationForm / PermissionApplicationForm**: Already well-structured with section borders, icons, pill toggles, and mobile responsiveness. These need minimal changes.
- **ApprovalManagement**: Table-based layout, already clean. Minimal changes needed.

## Plan

### 1. TaskManagement.tsx — Create Task Dialog
- Wrap in `ScrollArea` with fixed header/footer pattern (matching Doctor/Staff/Visit forms)
- Add section headers with icons:
  - **Task Details** (ClipboardList icon) — Title, Description
  - **Assignment** (User icon) — Assign To, Priority, Due Date
- 2-column grid for Priority + Due Date
- `hasUnsavedChanges` + `onConfirmClose` props on DialogContent
- Add `hover:border-primary/50 transition-colors` to inputs
- Same treatment for Update Task and Re-assign dialogs (minor polish)

### 2. ComplaintManagement.tsx — Submit Complaint Dialog
- Add icons to existing section headers (MessageCircle for "What Happened", Users for "Who & When", Tag for "Classification")
- Use consistent icon + uppercase + border-b pattern matching the standardized forms
- Wrap form body in `ScrollArea` instead of `overflow-y-auto`
- Add `hasUnsavedChanges` + `onConfirmClose` on DialogContent
- Add hover transitions to inputs
- Polish the Admin Response dialog with a section header

### 3. StaffAppraisalManagement.tsx — All Three Forms (Appraisal, Warning, Activity)
These are inline Card forms (not dialogs), so the approach is section headers within the Card:
- **Appraisal form**: Add section headers with icons:
  - **Staff & Period** (User icon) — Staff member, Month/Year, Review date
  - Performance Rating Grid already has a header — keep as-is
  - **Summary** — already has bg-muted styling — keep
  - **Comments & Action Plan** (MessageSquare icon) — Strengths, Areas, Manager Comments, Action Plan
- **Warning form**: Add section headers:
  - **Incident Details** (AlertTriangle icon) — Staff, Type, Severity, Date/Time, Witness
  - **Description & Response** (FileText icon) — Description, Action Taken, Staff Response, Follow-up
- **Activity form**: Add section headers:
  - **Attendance** (Calendar icon) — Staff, Date, Status, Patients, Shift times
  - **Work Details** (ClipboardList icon) — Tasks, Notes, Supervisor Notes
- Add `hover:border-primary/50 transition-colors` to all inputs across all three forms

### 4. LeaveApplicationForm.tsx & PermissionApplicationForm.tsx
- Already well-structured. Only add consistent `hover:border-primary/50 transition-colors` to inputs and ensure section header icons match the new pattern (they already use icons, just ensure consistency)

### 5. ApprovalManagement.tsx
- Already clean table layout. Add subtle hover effects on table rows and ensure action buttons have proper touch targets

## Files Changed

| File | Scope |
|------|-------|
| `src/components/TaskManagement.tsx` | Medium — add sections with icons, ScrollArea, unsaved changes, input polish |
| `src/components/ComplaintManagement.tsx` | Medium — add icons to sections, ScrollArea, unsaved changes, input polish |
| `src/components/StaffAppraisalManagement.tsx` | Medium — add section headers with icons to all 3 inline forms, input polish |
| `src/components/leave-permission/LeaveApplicationForm.tsx` | Minor — input hover transitions |
| `src/components/leave-permission/PermissionApplicationForm.tsx` | Minor — input hover transitions |
| `src/components/leave-permission/ApprovalManagement.tsx` | Minor — table row hover, touch targets |

No database, logic, or handler changes. All existing form submission, validation, and API calls preserved exactly.

