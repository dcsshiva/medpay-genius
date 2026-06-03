## Goal

Make the six Quick Access pages (Quick Payment, Visit Management, Cash Payments, Dashboard, Insurance Payments, Bank Advice Hub) fully usable on phones and tablets when running as an installed PWA / Capacitor app, and tighten the PWA shell so the app behaves correctly on those devices.

## Scope by page

All six pages currently render the same desktop layout on mobile (tables overflow, dialogs exceed viewport, action buttons too small for touch). Fixes per page:

1. **Quick Payment Management** (`QuickPaymentManagement.tsx`)
   - Wrap every `<Table>` in a horizontally scrollable container (`overflow-x-auto -mx-4 px-4`), pin column min-widths.
   - On `<md`, render Pending Payments and Generated Advice rows as stacked Cards instead of table rows.
   - Convert top action bar (filters, search, generate button) from inline row to wrap/stack with full-width controls on mobile.
   - Resize dialogs: `max-w-2xl` → `w-[95vw] max-w-2xl` and `max-h-[90vh]` already present; switch nested forms to single column on mobile.
   - Bump icon-only action buttons to `min-h-11 min-w-11` (44px touch target).

2. **Visit Management** (`VisitManagement.tsx`)
   - Same table → card pattern for the visit list on `<md`.
   - Tab strip becomes horizontally scrollable (`overflow-x-auto`).
   - Filter row stacks vertically on mobile, doctor/date pickers full-width.

3. **Cash Payments** + **Insurance Payments** (lite wrappers)
   - Both are 17-line wrappers; the heavy work is in `CashPaymentManagement` / `InsurancePaymentManagement`. Apply the same table-wrap + card-on-mobile + touch-target rules there.

4. **Dashboard** (`Dashboard.tsx`)
   - Stats grid: ensure `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (verify current values, tighten gaps).
   - Make stat cards tap-targets (full-width on mobile, comfortable padding).
   - Reduce header/card title sizes on mobile via `text-base md:text-lg`.

5. **Bank Advice Hub** (`BankAdviceGeneration.tsx` + related Reports views)
   - Table → card list on mobile for both the generation queue and the history list.
   - Bank/date filter bar wraps; "Generate Advice" stays as full-width primary on mobile.
   - File preview dialog: `w-[95vw]` and `overflow-auto`.

## Shared infrastructure (small, reusable)

- Add a `ResponsiveTable` wrapper component (`src/components/ui/responsive-table.tsx`) that renders children as a horizontally scrollable table on `≥md` and exposes a `mobileCardRender` prop to render the same row data as a Card on `<md`. Use it in all six pages instead of repeating the pattern.
- Add `safe-area` padding utilities in `index.css` (`pt-safe`, `pb-safe`) using `env(safe-area-inset-*)` so the mobile header and footer clear the iOS notch / Android nav bar inside the Capacitor app.
- Update `Layout.tsx`:
  - Mobile branch (`md:hidden`) currently uses `p-4` only — add `pb-safe` and a bottom spacer so floating elements (AI chatbot FAB, VersionDisplay) don't cover content.
  - Ensure `MobileHeader` uses `pt-safe`.

## PWA shell

- `index.html`: confirm `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (add `viewport-fit=cover` if missing) and `<meta name="theme-color" content="#e8f3eb">` matching the splash background.
- `manifest.webmanifest` / vite-plugin-pwa config: verify `display: standalone`, `orientation: any`, correct `start_url`, and icons for 192/512/maskable. No service-worker behaviour changes (existing CacheFirst-excluding-supabase strategy per project memory stays).
- Capacitor `StatusBar` already configured; no change.

## Verification

For each of the six pages, run through the preview at three viewports (375×812 phone, 768×1024 tablet, 1280 desktop) and confirm:
- No horizontal page scroll on phone (only the table strip scrolls).
- All primary buttons reachable with thumb; 44px min tap area.
- Dialogs fit inside viewport with internal scroll.
- Desktop layout visually unchanged.

## Out of scope

- No business logic / data changes.
- No new offline behaviour beyond what's already in the service worker.
- No redesign of the sidebar or AI chatbot.
