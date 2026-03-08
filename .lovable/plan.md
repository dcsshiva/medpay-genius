

# Interactive Walkthrough Tooltips for New Users

## Approach

Build a role-based walkthrough system using localStorage to track completion. On first login (no walkthrough flag in localStorage), show a series of spotlight tooltips highlighting key UI elements relevant to the user's role. Users can step through, skip, or dismiss permanently.

## Architecture

### New Files

**`src/hooks/useWalkthrough.tsx`** — Hook managing walkthrough state:
- Checks `localStorage` for `walkthrough_completed_{userId}` flag
- Provides `currentStep`, `nextStep`, `skipWalkthrough`, `isActive` state
- Role-aware step definitions (admin gets different steps than staff/doctor)

**`src/components/WalkthroughOverlay.tsx`** — The tooltip + backdrop UI:
- Semi-transparent backdrop with a spotlight cutout around the target element
- Floating tooltip card (positioned relative to target) with: step title, description, step counter (e.g., "2 of 5"), Next/Skip buttons
- Uses `document.querySelector` with data attributes (`data-walkthrough="sidebar"`, etc.) to find target elements
- Auto-repositions on resize
- Renders via portal

### Step Definitions by Role

| Role | Steps |
|------|-------|
| **Admin/Super Admin** | 1. Sidebar navigation → 2. Doctor Hub → 3. Staff Management → 4. Task Management → 5. Team Chat → 6. Settings |
| **Manager** | 1. Sidebar → 2. Doctor Hub → 3. Task Management → 4. Payment Approval → 5. Team Chat |
| **Doctor** | 1. Doctor Hub (your dashboard) → 2. Visit History → 3. Payment Summary → 4. AI Assistant |
| **Staff** | 1. Staff Dashboard → 2. Tasks → 3. Leave/Permission → 4. Team Chat → 5. Attendance |

### Integration Points

**`src/components/Layout.tsx`** — Mount `<WalkthroughOverlay />` and add `data-walkthrough` attributes to key elements (sidebar trigger, header, logout button).

**`src/components/AppSidebar.tsx`** — Add `data-walkthrough="sidebar-nav"` to the sidebar container and specific nav items.

**`src/components/MobileHeader.tsx`** — Add `data-walkthrough` attributes for mobile targets.

**`src/pages/Index.tsx`** — Initialize the walkthrough hook after role resolution, pass to Layout.

### Tooltip Positioning Logic

- Find target element via `data-walkthrough` attribute
- Get `getBoundingClientRect()` to position tooltip adjacent to it
- Backdrop uses CSS `clip-path` or box-shadow trick to create spotlight effect
- Tooltip appears below/right of target with an arrow pointer

### Persistence

- `localStorage.setItem(`walkthrough_completed_${userId}`, 'true')` on completion or skip
- Optional "Restart Tour" button in Settings or User Guide page

## Files Changed

| File | Change |
|------|--------|
| New: `src/hooks/useWalkthrough.tsx` | Walkthrough state management hook with role-based steps |
| New: `src/components/WalkthroughOverlay.tsx` | Spotlight tooltip overlay component |
| `src/components/Layout.tsx` | Mount WalkthroughOverlay, add data-walkthrough attributes |
| `src/components/AppSidebar.tsx` | Add data-walkthrough attributes to nav items |
| `src/pages/Index.tsx` | Initialize walkthrough after auth resolution |
| `src/components/Settings.tsx` | Add "Restart Walkthrough" button |

