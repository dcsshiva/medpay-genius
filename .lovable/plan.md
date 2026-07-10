## Goal
Make the attached screens (sidebar navigation + hub landing surfaces like Doctor Hub, Visit Management, Quick Payment, Bank Advice Hub, Cash/Insurance Payments) feel mobile-first and touch-native, **without changing the desktop layout** that admins/managers already rely on.

## Guiding Principle
Split responsibility by breakpoint:
- **Desktop (`md:` and up)** — keep the current `AppSidebar` + header + dense tables exactly as they are today.
- **Mobile (`<md`)** — replace desktop patterns with mobile-native patterns behind `useIsMobile()` / Tailwind `md:hidden` gates. No shared component gets a visual rewrite; we branch.

---

## Suggested Mobile-First Improvements

### 1. Navigation shell
Current mobile uses a hamburger sheet with a long vertical list (screenshot). Improvements:
- **Bottom tab bar** (fixed, safe-area aware) with the 4–5 most-used destinations for that role: Dashboard, Doctor Hub, Visits, Payments, More.
- **"More" sheet** holds the long tail (Bank Advice Hub, Cash, Insurance, Quick Payment, Reports, Settings) as a grid of large tap targets (icon + label), not a text list.
- **Quick Access** pinned as a horizontal scrollable chip row at the top of the Dashboard on mobile only.
- Keep the existing hamburger `Sheet` as a secondary drawer for search + profile.

### 2. Hub landing pages (Doctor Hub, Payment Hub, Bank Advice Hub)
- Replace `Tabs` with **segmented control** (pill style, full-width, sticky under header) on mobile — same tab state, different rendering.
- **Summary cards** stack vertically, one per row, with the KPI number as the hero (48–56px) and label below — no side-by-side 4-up grids that shrink text.
- **Sticky action bar** at bottom for the primary CTA (Create Payment, Add Visit, Generate Advice) so it's always thumb-reachable.

### 3. Data tables → mobile cards
Every desktop table (Visits, Payments, Doctors, Bank Advice records) gets a **card list** on mobile:
- Row → card with: title line (patient/doctor name), secondary line (code + date), amount right-aligned bold, status chip, and an overflow (`⋯`) for row actions.
- Tap card = open detail drawer (bottom sheet), not a new route.
- Filters move into a bottom-sheet "Filter" button; active filters show as removable chips above the list.

### 4. Forms (Payment creation, Doctor edit, Visit edit)
- **One field per screen section**, larger inputs (min 44px height), floating labels.
- **Stepper** at top for multi-step flows (Payment Hub creation) instead of long scroll.
- Numeric fields use `inputMode="decimal"` and open the number pad.
- Sticky footer with **Cancel / Save** — never rely on scrolling to reach Save.
- Confirmations via bottom sheet, not centered modals.

### 5. Doctor Hub specifics (the failing screen from earlier)
- Doctor picker → searchable bottom sheet with recent doctors pinned.
- Paid / Unpaid / Summary tabs → segmented control.
- Each visit row → card showing patient, date, amount, status chip; swipe-left reveals "Mark Paid" / "Edit" (manager only).

### 6. Header on mobile
- Compact: logo + role initial avatar + Check-Update icon + hamburger.
- Move Notification Center into the bottom tab bar's More sheet header to reduce top-bar clutter.

### 7. Touch, spacing, typography
- Min tap target 44×44px everywhere.
- Increase base font on mobile to 16px (prevents iOS zoom on input focus).
- 16px horizontal page padding, 12px vertical rhythm between cards.
- Respect `pt-safe` / `pb-safe` already present; extend to bottom tab bar.

### 8. Performance / feel
- Skeleton loaders on cards (not spinners) for perceived speed.
- Pull-to-refresh on list screens (Capacitor-friendly).
- Debounced search inputs; results in same view (no route change).

---

## Scope Boundaries
- **No desktop visual changes.** All new mobile UI lives under `md:hidden` or `useIsMobile()` branches; desktop keeps `hidden md:flex` blocks untouched.
- **No business-logic changes.** Same hooks, same Supabase calls, same permissions — only presentation.
- **No route changes.** Tab state stays in `Index.tsx`'s `activeTab`.

---

## Suggested Rollout (if you approve, I'll plan phases)
1. **Phase 1 — Navigation shell**: bottom tab bar + More sheet + Quick Access chips. (Layout.tsx, MobileHeader.tsx, new `MobileBottomNav.tsx`.)
2. **Phase 2 — Hub pages**: Doctor Hub, Payment Hub, Bank Advice Hub mobile branches (segmented control + stacked KPI cards + sticky CTA).
3. **Phase 3 — Lists**: Visits, Payments, Bank Advice records → mobile card lists with bottom-sheet filters/details.
4. **Phase 4 — Forms**: Payment creation stepper, Doctor edit, Visit edit mobile forms with sticky footer.
5. **Phase 5 — Polish**: skeletons, pull-to-refresh, safe-area, typography pass.

---

## Question before I turn this into a build plan
Which phase(s) do you want implemented first? I'd recommend **Phase 1 + Phase 2** together so the navigation and the most-used hub screens both feel native on mobile, while everything else stays functional as-is. Reply with the phase numbers (e.g. "1 and 2") or "all" and I'll produce a concrete build plan per phase.
