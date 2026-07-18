## Goal

Consolidate 6 separate staff-facing admin screens into a single "Staff Management Dashboard" screen with tabs, without changing any business logic, queries, or component internals beyond a role-exclusion filter for `doctor` and `admin`.

## 1. New wrapper component

Create `src/components/StaffManagementDashboard.tsx`:

- Header:
  - Title: **Staff Management Dashboard**
  - Subtitle: *All staff records, performance, attendance, and payroll in one place*
- Preserves the existing role guard (`userRole === 'admin' || userRole === 'manager'`) that currently lives at the top of `StaffAppraisalManagement.tsx`.
- Renders a single outer `Tabs` with 9 top-level tabs (flattened, all equal-weight):

  1. Staff Directory → `<StaffManagement excludeAdminAndDoctor />`
  2. Appraisals → `<StaffAppraisalsSection />`
  3. Warnings → `<StaffWarningsSection />`
  4. Daily Activities → `<StaffDailyActivitiesSection />`
  5. Attendance → `<StaffAttendanceManagement />` (keeps its own Daily Entry / Reports sub-tabs)
  6. Salary Structure → `<StaffSalaryStructure />`
  7. Payroll → `<StaffPayrollGeneration />`
  8. Payment History → `<StaffPaymentHistoryTab />`
  9. Bulk Payment → `<StaffBulkPaymentTab />`

- Tab content is lazy: each tab's component is wrapped in `React.lazy` + `Suspense` and only mounted on first activation (tracked via a `Set<string>` of visited tabs — once visited it stays mounted so state is preserved for the session).
- Count badges reuse existing counts from the appraisal sections (Appraisals, Warnings, Daily Activities) by hoisting a shared context or by having each section expose its count via a callback prop `onCountChange`. Do not introduce new queries for badges.
- Mobile: outer tabs list uses the existing horizontal scroll wrapper pattern already used elsewhere (`overflow-x-auto`), so 9 tabs scroll cleanly on small screens.

## 2. Split `StaffAppraisalManagement.tsx` into 3 sibling sections

Refactor is JSX-only. All state, fetchers, handlers, forms, dialogs, and validation stay identical — just move each `TabsContent` block into its own component file, sharing state via a small internal context (or by passing the same hooks down). The cleanest path with minimal risk:

- Create `src/components/staff-appraisal/useStaffAppraisalData.ts` — a single hook that owns everything currently held at the top of `StaffAppraisalManagement.tsx` (staff list, appraisals, warnings, daily activities, forms, handlers). Copy the current logic verbatim into this hook and return the same values/setters/handlers.
- Create 3 presentational files, each rendering the JSX that today lives inside its matching `TabsContent`, consuming the hook:
  - `src/components/staff-appraisal/StaffAppraisalsSection.tsx`
  - `src/components/staff-appraisal/StaffWarningsSection.tsx`
  - `src/components/staff-appraisal/StaffDailyActivitiesSection.tsx`
- Each section internally calls `useStaffAppraisalData()`. Since these are now separate top-level tabs and lazy-mounted, the hook runs per-section. To avoid duplicate fetches, back the hook with a lightweight cache: expose it via a `StaffAppraisalProvider` mounted once inside `StaffManagementDashboard` that wraps all three appraisal-related tabs, so state and Supabase queries fire only once.
- The existing `StaffAppraisalManagement.tsx` becomes a thin backward-compat wrapper that renders `<StaffManagementDashboard />` (or is removed once `Index.tsx` is updated — see step 4). This keeps the risk boundary tight: no query/handler code is rewritten, only relocated.

## 3. Role exclusion (`doctor`, `admin`) — applied only in the staff-selector queries

Add the filter `.not('role', 'in', '(doctor,admin)')` to the existing `.from('staff')...eq('is_active', true)` queries in:

- `useStaffAppraisalData` (formerly `StaffAppraisalManagement.fetchStaff`)
- `StaffAttendanceManagement.tsx` → `fetchData()` staff query
- `StaffSalaryStructure.tsx` → `fetchData()` staff query
- `StaffPayrollGeneration.tsx` → staff query
- `StaffPaymentHistoryTab.tsx` → staff query
- `StaffBulkPaymentTab.tsx` → staff query

For `StaffManagement.tsx`, add an optional prop `excludeAdminAndDoctor?: boolean` (default `false`). When `true`, apply the same filter to its roster query. The new dashboard passes `true`; any existing standalone usage stays unchanged. Manager role remains included everywhere.

No other Supabase calls, RPCs, insert/update payloads, calculations, or permission checks are touched.

## 4. Routing / sidebar

- `src/lib/navigationItems.ts`: rename the `appraisals` entry label from **"Staff Appraisals"** to **"Staff Management"** for both admin and manager role blocks. Keep the id `appraisals` (so URL/state and existing analytics remain valid) or rename to `staff-management` — recommendation: keep id `appraisals` to avoid touching stored quick-access/menu-visibility rows. The existing `staff` sidebar entry ("Staff Management" → `StaffManagement`) is removed for admin/manager (it becomes the first tab of the new dashboard). It remains for any other roles that currently see it.
- `src/pages/Index.tsx`: change `case 'appraisals'` to render `<StaffManagementDashboard />` instead of `<StaffAppraisalManagement />`. Leave `case 'staff'` mapped to `<StaffManagement />` untouched so any deep link still works.
- Existing separate **Payroll** sidebar entry keeps working (still routes to its own `StaffPayrollGeneration`-based screen); no change required there.

## 5. Out of scope (explicitly untouched)

`StaffMobileDashboard.tsx`, `StaffAppraisalView.tsx`, `StaffPunchInCard.tsx`, `StaffAttendanceCalendar.tsx`, all Supabase schemas, all RPCs, appraisal scoring math, payroll math, permission guards.

## Files touched

- **New**: `src/components/StaffManagementDashboard.tsx`, `src/components/staff-appraisal/useStaffAppraisalData.ts`, `src/components/staff-appraisal/StaffAppraisalsSection.tsx`, `src/components/staff-appraisal/StaffWarningsSection.tsx`, `src/components/staff-appraisal/StaffDailyActivitiesSection.tsx`
- **Edited (JSX/prop only)**: `src/components/StaffAppraisalManagement.tsx` (becomes thin re-export or is deleted), `src/components/StaffManagement.tsx` (add optional prop + conditional filter), `src/pages/Index.tsx` (one case swap), `src/lib/navigationItems.ts` (rename + remove `staff` entry for admin/manager)
- **Edited (single-line filter add)**: `StaffAttendanceManagement.tsx`, `StaffSalaryStructure.tsx`, `StaffPayrollGeneration.tsx`, `src/components/quick-payment/StaffPaymentHistoryTab.tsx`, `src/components/quick-payment/StaffBulkPaymentTab.tsx`

## Verification

After build:
1. Log in as admin → sidebar shows **Staff Management** (no separate "Staff Appraisals" / "Staff Management" duo for admin/manager).
2. Open it → 9 tabs render, first paint only fetches Staff Directory data.
3. Click each tab → the correct existing UI appears, unchanged; badges on Appraisals/Warnings/Daily Activities reflect counts.
4. In every staff selector (appraisal form, warning form, activity form, attendance grid, salary structure add dialog, payroll picker, payment history picker, bulk payment picker, staff directory list) confirm no rows with `role = 'doctor'` or `role = 'admin'` appear; managers still appear.
5. Doctor login and staff (non-admin/manager) login unaffected.
