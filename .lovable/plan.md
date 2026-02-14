

## Leave and Permission Forms -- UI/UX Polish

### Problems in Current UI (from screenshots)

1. **Too much vertical whitespace** -- fields are spread out with large gaps, requiring scrolling on mobile
2. **No visual grouping** -- all fields appear as a flat list with no logical sections
3. **Time inputs look broken on mobile** -- native `<input type="time">` shows "--:-- --" placeholder awkwardly
4. **No leave days summary shown** -- user picks dates but doesn't see "3 days" until after submission
5. **Tab bar text overflows on mobile** -- "Leave Application" / "Permission Application" / "History" are too long for small screens
6. **History table not mobile-friendly** -- 6-column table is unusable on phones
7. **No progress indication** -- user doesn't know which fields are filled vs remaining
8. **Buttons too small on mobile** -- Reset and Submit buttons lack adequate touch targets

### Changes

#### 1. `LeavePermissionManagement.tsx` -- Responsive Tab Bar
- Shorten tab labels on mobile: "Leave" / "Permission" / "History" (use `useIsMobile`)
- Use `ScrollArea` for horizontal tab scrolling on small screens
- Add subtle animation when switching tabs

#### 2. `LeaveApplicationForm.tsx` -- Structured Card Sections
- **Section 1: "When"** -- Date range in a bordered card with calendar icon header; show computed "X days" summary badge inline once both dates selected
- **Section 2: "What Type"** -- Leave type radio as pill-style toggle buttons (Full Day / Half Day) instead of plain radio circles
- **Section 3: "Why"** -- Reason dropdown + details textarea grouped together
- **Section 4: "Approval"** -- Approver + notes in a subtle card
- Make textareas have `rows={3}` on mobile (smaller) and auto-resize hint
- Full-width sticky submit bar on mobile (fixed at bottom)
- Add computed leave summary banner: "You are requesting 3 days leave from Feb 15 to Feb 17"

#### 3. `PermissionApplicationForm.tsx` -- Compact and Clear
- **Today's date banner** -- keep but make it more compact with a calendar icon and single line
- **Time section** -- side-by-side time inputs with a connecting arrow/dash icon between them
- **Duration indicator** -- show inline below time inputs (smaller, not a separate big card)
- **Reason + Details** -- group in a single visual section
- **Approval section** -- same card treatment as leave form
- Full-width sticky submit on mobile

#### 4. `ApplicationHistory.tsx` -- Mobile Card View
- On mobile: replace the table with stacked cards showing type icon, date, status badge, and reason
- Each card tappable to open details dialog
- Cancel button as a swipe action or icon inside the card
- On desktop: keep the table but tighten column widths
- Add empty state illustration/text when no applications exist

### Shared Improvements (both forms)
- Add `min-h-[44px]` to all interactive elements for mobile touch targets
- Use consistent section spacing: `space-y-4` within sections, `space-y-6` between sections
- Labels use `text-sm font-medium` consistently
- Required field indicators as colored dots instead of asterisks
- Form buttons: primary button gets full width on mobile, inline on desktop

### Files to Modify

| File | Change |
|------|--------|
| `src/components/leave-permission/LeavePermissionManagement.tsx` | Responsive tabs, mobile-friendly labels |
| `src/components/leave-permission/LeaveApplicationForm.tsx` | Sectioned layout, leave summary, pill toggles, sticky submit |
| `src/components/leave-permission/PermissionApplicationForm.tsx` | Compact layout, inline duration, grouped sections, sticky submit |
| `src/components/leave-permission/ApplicationHistory.tsx` | Mobile card view, better empty state, tighter desktop table |

### What Does NOT Change
- All form validation logic and zod schemas
- All Supabase queries and RPC calls
- Date/time calculation functions
- Manager loading and auto-selection logic
- Application submission flow
- History data fetching and filtering

